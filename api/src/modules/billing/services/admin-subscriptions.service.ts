import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  AuthRole,
  BillingInvoiceKind,
  CallKind,
  OrgRole,
  PlanKey,
  Prisma,
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { UsageService } from '@/modules/usage/usage.service';
import { round } from '@/shared/utils/math/math.utils';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from './subscriptions.service';
import { CreditsService } from './credits.service';
import { StripeSyncService } from './stripe-sync.service';
import { BillingAccountService } from './billing-account.service';
import { minutesToSeconds } from '../utils/allowance.utils';
import { monthlyCents, toCsv } from '../utils/stripe-billing.utils';
import {
  AdminPaymentsQueryType,
  AdminSubscriptionsQueryType,
} from '../dto/admin-subscriptions-query.schema';

// Sorting/filtering on computed figures (cost, margin, minutes) is done in memory over at most this many rows.
const MAX_COMPUTED_ROWS = 2000;
const ACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PAST_DUE,
];

type OrgWithSubscription = Prisma.OrganisationGetPayload<{
  include: {
    subscription: true;
    memberships: { include: { user: { select: { id: true; email: true; full_name: true } } } };
    _count: { select: { memberships: true; invitations: true } };
  };
}>;

// Platform admin views of every organisation's plan, revenue, AI cost and payments (§11b). AI costs are
// shown here only (§6).
@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeBillingService,
    private readonly usage: UsageService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly credits: CreditsService,
    private readonly sync: StripeSyncService,
    private readonly account: BillingAccountService,
  ) {}

  // ---------- Organisations (lightweight search for manual plan assignment) ----------

  async searchOrganisations(search?: string) {
    const organisations = await this.prisma.organisation.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { id: search },
              {
                memberships: {
                  some: { user: { email: { contains: search, mode: 'insensitive' } } },
                },
              },
            ],
          }
        : undefined,
      include: this.orgInclude(),
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return Promise.all(
      organisations.map(async (organisation) => {
        const entitlements = await this.entitlements.getEntitlements(organisation.id);
        return {
          id: organisation.id,
          name: organisation.name,
          owner: this.ownerOf(organisation),
          plan: entitlements.plan,
          status: entitlements.status,
          source: organisation.subscription?.source ?? null,
        };
      }),
    );
  }

  async organisationUsage(organisationId: string, days: number) {
    await this.assertOrganisation(organisationId);
    const since = new Date(Date.now() - days * 86_400_000);
    return {
      period_days: days,
      ...(await this.usage.costBreakdown({
        organisation_id: organisationId,
        created_at: { gte: since },
      })),
    };
  }

  // ---------- Subscriptions list ----------

  async list(query: AdminSubscriptionsQueryType) {
    const where = this.listWhere(query);
    const computedSort = ['mrr', 'margin', 'ai_cost', 'minutes_used'].includes(query.order_by);
    const computed = computedSort || query.margin_below != null;

    const [summary, total] = await Promise.all([
      this.summaryTiles(),
      this.prisma.organisation.count({ where }),
    ]);
    const organisations = await this.prisma.organisation.findMany({
      where,
      include: this.orgInclude(),
      orderBy:
        query.order_by === 'name'
          ? { name: query.order_direction }
          : { created_at: query.order_direction },
      skip: computed ? 0 : (query.page - 1) * query.limit,
      take: computed ? MAX_COMPUTED_ROWS : query.limit,
    });

    let rows = await this.toRows(organisations);
    if (query.margin_below != null)
      rows = rows.filter((row) => row.margin_usd != null && row.margin_usd < query.margin_below);
    if (computedSort) {
      const key = {
        mrr: (row: (typeof rows)[number]) => row.price_per_month_cents,
        margin: (row: (typeof rows)[number]) => row.margin_usd ?? 0,
        ai_cost: (row: (typeof rows)[number]) => row.ai_cost.charged_usd,
        minutes_used: (row: (typeof rows)[number]) => row.minutes_used_percent ?? 0,
      }[query.order_by];
      rows.sort((a, b) => (key(a) - key(b)) * (query.order_direction === 'asc' ? 1 : -1));
    }
    const filteredTotal = computed ? rows.length : total;
    if (computed) rows = rows.slice((query.page - 1) * query.limit, query.page * query.limit);
    const totalPages = Math.ceil(filteredTotal / query.limit);

    return {
      summary,
      data: rows,
      pagination: {
        total: filteredTotal,
        page: query.page,
        limit: query.limit,
        total_pages: totalPages,
        has_next: query.page < totalPages,
        has_prev: query.page > 1,
      },
    };
  }

  async exportCsv(query: AdminSubscriptionsQueryType) {
    const result = await this.list({ ...query, page: 1, limit: MAX_COMPUTED_ROWS });
    // Owner name and email only; no card or other personal data.
    const header = [
      'organisation_id', 'organisation', 'owner_name', 'owner_email', 'plan', 'status', 'source', 'interval',
      'seats_used', 'seats_total', 'price_per_month_usd', 'next_renewal', 'trial_ends_at', 'cancelling',
      'minutes_used_percent', 'ai_cost_charged_usd', 'ai_cost_base_usd', 'margin_usd', 'failed_payments', 'created_at',
    ];
    const rows = result.data.map((row) => [
      row.organisation_id, row.name, row.owner?.name ?? '', row.owner?.email ?? '', row.plan, row.status,
      row.source ?? '', row.interval ?? '', row.seats.used, row.seats.total, (row.price_per_month_cents / 100).toFixed(2),
      row.next_renewal_at?.toISOString() ?? '', row.trial_ends_at?.toISOString() ?? '', row.cancelling,
      row.minutes_used_percent ?? '', row.ai_cost.charged_usd, row.ai_cost.base_usd, row.margin_usd ?? '',
      row.failed_payments, row.created_at.toISOString(),
    ]);
    return toCsv(header, rows);
  }

  private listWhere(query: AdminSubscriptionsQueryType): Prisma.OrganisationWhereInput {
    const and: Prisma.OrganisationWhereInput[] = [];
    if (query.search)
      and.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { id: query.search },
          { memberships: { some: { role: OrgRole.OWNER, user: { email: { contains: query.search, mode: 'insensitive' } } } } },
          { subscription: { stripe_customer_id: query.search } },
          { subscription: { stripe_subscription_id: query.search } },
        ],
      });
    if (query.no_subscription) and.push({ subscription: { is: null } });
    const sub: Prisma.SubscriptionWhereInput = {};
    if (query.plan) sub.plan = query.plan;
    if (query.status) sub.status = query.status;
    if (query.source) sub.source = query.source;
    if (query.cancelling) sub.cancel_at_period_end = true;
    if (query.past_due) sub.status = SubscriptionStatus.PAST_DUE;
    if (query.trial_ending_days != null) {
      sub.status = SubscriptionStatus.TRIALING;
      sub.trial_ends_at = {
        gte: new Date(),
        lte: DateTime.now().plus({ days: query.trial_ending_days }).toJSDate(),
      };
    }
    if (Object.keys(sub).length) and.push({ subscription: { is: sub } });
    return and.length ? { AND: and } : {};
  }

  private orgInclude() {
    return {
      subscription: true,
      memberships: {
        where: { role: OrgRole.OWNER },
        orderBy: { created_at: 'asc' as const },
        take: 1,
        include: { user: { select: { id: true, email: true, full_name: true } } },
      },
      _count: {
        select: {
          memberships: true,
          invitations: { where: { status: 'PENDING' as const, expires_at: { gt: new Date() } } },
        },
      },
    };
  }

  private ownerOf(organisation: OrgWithSubscription) {
    const owner = organisation.memberships[0]?.user;
    return owner ? { id: owner.id, name: owner.full_name || owner.email, email: owner.email } : null;
  }

  private async toRows(organisations: OrgWithSubscription[]) {
    if (!organisations.length) return [];
    const ids = organisations.map((organisation) => organisation.id);
    const failed = await this.prisma.billingInvoice.groupBy({
      by: ['organisation_id'],
      where: { organisation_id: { in: ids }, user_id: null, attempt_count: { gt: 0 }, status: { in: ['open', 'uncollectible'] } },
      _count: { _all: true },
    });
    const failedBy = new Map(failed.map((row) => [row.organisation_id, row._count._all]));

    return Promise.all(
      organisations.map(async (organisation) => {
        const subscription = organisation.subscription;
        const entitlements = await this.entitlements.getEntitlements(organisation.id);
        const [consumption, cost] = await Promise.all([
          this.entitlements.getConsumption(organisation.id),
          this.prisma.usageEvent.aggregate({
            where: { organisation_id: organisation.id, created_at: { gte: entitlements.period.start } },
            _sum: { cost_usd: true, charged_cost_usd: true },
          }),
        ]);
        const usedSeconds =
          consumption.live.owners_seconds + consumption.live.others_seconds +
          consumption.practice.owners_seconds + consumption.practice.others_seconds;
        const pool = [entitlements.limits.live_minutes_per_period, entitlements.limits.practice_shares_live_pool ? 0 : entitlements.limits.practice_minutes_per_period];
        const poolSeconds = pool.some((value) => value == null)
          ? null
          : pool.reduce((sum, value) => sum + (minutesToSeconds(value) ?? 0), 0);
        const usd = subscription?.currency ?? 'usd';
        const pricePerMonth =
          subscription && usd === 'usd' && ACTIVE_STATUSES.includes(subscription.status) && subscription.source === SubscriptionSource.STRIPE
            ? monthlyCents(subscription.unit_amount_cents, subscription.billing_interval)
            : 0;
        const baseUsd = round(cost._sum.cost_usd ?? 0, 4);
        return {
          organisation_id: organisation.id,
          name: organisation.name,
          owner: this.ownerOf(organisation),
          plan: entitlements.plan,
          status: entitlements.status,
          stored_status: subscription?.status ?? null,
          source: subscription?.source ?? null,
          interval: subscription?.billing_interval ?? null,
          seats: {
            used: organisation._count.memberships + organisation._count.invitations,
            total: entitlements.seats_total,
          },
          price_per_month_cents: pricePerMonth,
          currency: usd,
          next_renewal_at:
            subscription?.source === SubscriptionSource.STRIPE && !subscription.cancel_at_period_end
              ? subscription.current_period_end
              : null,
          trial_ends_at: subscription?.trial_ends_at ?? null,
          cancelling: subscription?.cancel_at_period_end ?? false,
          minutes_used_percent: poolSeconds ? round((usedSeconds / poolSeconds) * 100, 1) : null,
          ai_cost: { charged_usd: round(cost._sum.charged_cost_usd ?? 0, 4), base_usd: baseUsd },
          margin_usd: round(pricePerMonth / 100 - baseUsd, 4),
          failed_payments: failedBy.get(organisation.id) ?? 0,
          created_at: organisation.created_at,
          out_of_sync: !!subscription?.drift_detected_at,
        };
      }),
    );
  }

  async summaryTiles() {
    const monthStart = DateTime.utc().startOf('month').toJSDate();
    const [subscriptions, canceledThisMonth, pastDueInvoices] = await Promise.all([
      this.prisma.subscription.findMany({
        select: {
          organisation_id: true, plan: true, status: true, source: true, currency: true,
          unit_amount_cents: true, billing_interval: true, cancel_at_period_end: true,
        },
      }),
      this.prisma.subscriptionEvent.count({
        where: {
          type: SubscriptionEventType.CANCELED,
          created_at: { gte: monthStart },
          from_plan: { not: PlanKey.TRIAL },
        },
      }),
      this.prisma.billingInvoice.aggregate({
        where: { status: 'open', user_id: null, attempt_count: { gt: 0 } },
        _sum: { amount_due_cents: true, amount_paid_cents: true },
      }),
    ]);
    const paying = subscriptions.filter(
      (row) =>
        row.source === SubscriptionSource.STRIPE &&
        (row.status === SubscriptionStatus.ACTIVE || row.status === SubscriptionStatus.PAST_DUE),
    );
    // Non-USD subscriptions are excluded from MRR (USD only, §13).
    const mrr = paying
      .filter((row) => row.currency === 'usd')
      .reduce((sum, row) => sum + monthlyCents(row.unit_amount_cents, row.billing_interval), 0);
    const activeByPlan = Object.fromEntries(
      Object.values(PlanKey).map((plan) => [
        plan,
        subscriptions.filter((row) => row.plan === plan && ACTIVE_STATUSES.includes(row.status)).length,
      ]),
    );
    const activeNow = paying.length;
    return {
      active_by_plan: activeByPlan,
      mrr_cents: mrr,
      arr_cents: mrr * 12,
      trials_running: subscriptions.filter((row) => row.status === SubscriptionStatus.TRIALING).length,
      past_due: {
        count: subscriptions.filter((row) => row.status === SubscriptionStatus.PAST_DUE).length,
        amount_at_risk_cents:
          (pastDueInvoices._sum.amount_due_cents ?? 0) - (pastDueInvoices._sum.amount_paid_cents ?? 0),
      },
      cancellations_scheduled: subscriptions.filter((row) => row.cancel_at_period_end).length,
      // Cancelled this month over the paying count at the start of the month (approximated).
      churn_this_month_percent:
        activeNow + canceledThisMonth
          ? round((canceledThisMonth / (activeNow + canceledThisMonth)) * 100, 1)
          : 0,
      non_usd_subscriptions: paying.filter((row) => row.currency !== 'usd').length,
    };
  }

  // ---------- Detail ----------

  async detail(organisationId: string, eventType?: SubscriptionEventType) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        subscription: true,
        memberships: {
          include: { user: { select: { id: true, email: true, full_name: true } } },
          orderBy: { created_at: 'asc' },
        },
      },
    });
    if (!organisation) throw new NotFoundException('Organisation not found');
    const subscription = organisation.subscription;
    const [entitlements, consumption, invoices, events, credits] = await Promise.all([
      this.entitlements.getEntitlements(organisationId),
      this.entitlements.getConsumption(organisationId, { fresh: true }),
      this.prisma.billingInvoice.findMany({
        where: { organisation_id: organisationId },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
      this.prisma.subscriptionEvent.findMany({
        where: { organisation_id: organisationId, ...(eventType && { type: eventType }) },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
      this.prisma.usageCredit.groupBy({
        by: ['user_id'],
        where: { organisation_id: organisationId },
        _sum: { live_seconds_remaining: true, practice_seconds_remaining: true },
      }),
    ]);
    const team = credits.find((row) => row.user_id === null);
    const personal = new Map(
      credits.filter((row) => row.user_id).map((row) => [row.user_id, row._sum]),
    );
    const owner = organisation.memberships.find((m) => m.role === OrgRole.OWNER)?.user;
    const { limits } = entitlements;
    const minutes = (seconds: number) => round(seconds / 60, 1);

    return {
      organisation: {
        id: organisation.id,
        name: organisation.name,
        created_at: organisation.created_at,
        owner: owner ? { id: owner.id, name: owner.full_name || owner.email, email: owner.email } : null,
        members_count: organisation.memberships.length,
      },
      subscription: subscription
        ? {
            ...subscription,
            effective_status: entitlements.status,
            price_per_month_cents: monthlyCents(subscription.unit_amount_cents, subscription.billing_interval),
          }
        : null,
      stripe_links: {
        customer: subscription?.stripe_customer_id
          ? this.stripe.dashboardUrl(`customers/${subscription.stripe_customer_id}`)
          : null,
        subscription: subscription?.stripe_subscription_id
          ? this.stripe.dashboardUrl(`subscriptions/${subscription.stripe_subscription_id}`)
          : null,
      },
      entitlements: {
        plan: entitlements.plan,
        status: entitlements.status,
        read_only: entitlements.read_only,
        period: entitlements.period,
        limits,
        features: entitlements.features,
        seats_total: entitlements.seats_total,
      },
      consumption: {
        live: {
          used_minutes: minutes(consumption.live.owners_seconds + consumption.live.others_seconds),
          owners_minutes: minutes(consumption.live.owners_seconds),
          others_minutes: minutes(consumption.live.others_seconds),
          team_credit_minutes_used: minutes(consumption.live.team_credit_seconds),
          pool_minutes: limits.live_minutes_per_period,
          owner_reserve_minutes: limits.live_minutes_reserved_for_owner_per_period,
          member_cap_minutes: limits.live_minutes_per_member_per_period,
        },
        practice: {
          used_minutes: minutes(consumption.practice.owners_seconds + consumption.practice.others_seconds),
          owners_minutes: minutes(consumption.practice.owners_seconds),
          others_minutes: minutes(consumption.practice.others_seconds),
          team_credit_minutes_used: minutes(consumption.practice.team_credit_seconds),
          pool_minutes: limits.practice_shares_live_pool ? null : limits.practice_minutes_per_period,
          owner_reserve_minutes: limits.practice_minutes_reserved_for_owner_per_period,
          member_cap_minutes: limits.practice_minutes_per_member_per_period,
        },
        uploads: consumption.uploads,
        copilots: consumption.copilots,
        practice_prospects: consumption.practice_prospects,
      },
      credits: {
        team: {
          live_minutes: minutes(team?._sum.live_seconds_remaining ?? 0),
          practice_minutes: minutes(team?._sum.practice_seconds_remaining ?? 0),
        },
        personal_total: {
          live_minutes: minutes([...personal.values()].reduce((s, v) => s + (v.live_seconds_remaining ?? 0), 0)),
          practice_minutes: minutes([...personal.values()].reduce((s, v) => s + (v.practice_seconds_remaining ?? 0), 0)),
        },
      },
      periods: await this.lastPeriods(organisationId, entitlements.period.start, subscription),
      invoices: invoices.map((row) => ({ ...this.account.toInvoiceView(row), user_id: row.user_id, stripe_url: this.stripe.dashboardUrl(`invoices/${row.id}`) })),
      members: organisation.memberships.map((membership) => {
        const isOwner = membership.role === OrgRole.OWNER;
        const own = personal.get(membership.user_id);
        return {
          user_id: membership.user_id,
          name: membership.user.full_name || membership.user.email,
          email: membership.user.email,
          role: membership.role,
          live_minutes: minutes(consumption.live.by_user[membership.user_id] ?? 0),
          practice_minutes: minutes(consumption.practice.by_user[membership.user_id] ?? 0),
          live_cap_minutes: isOwner ? null : limits.live_minutes_per_member_per_period,
          practice_cap_minutes: isOwner ? null : limits.practice_minutes_per_member_per_period,
          // Individual personal balances: platform admins only.
          personal_credit_minutes: {
            live: minutes(own?.live_seconds_remaining ?? 0),
            practice: minutes(own?.practice_seconds_remaining ?? 0),
          },
        };
      }),
      timeline: events,
      notes: {
        manual_note: subscription?.manual_note ?? null,
        log: events.filter((event) => event.note).map((event) => ({ created_at: event.created_at, type: event.type, actor_kind: event.actor_kind, note: event.note })),
      },
    };
  }

  // Minutes, charged/base cost and revenue for the current and previous five monthly windows.
  private async lastPeriods(
    organisationId: string,
    currentStart: Date,
    subscription: { unit_amount_cents: number | null; billing_interval: string | null } | null,
  ) {
    const anchor = DateTime.fromJSDate(currentStart).toUTC();
    const windows = Array.from({ length: 6 }, (_, i) => ({
      start: anchor.minus({ months: i }).toJSDate(),
      end: anchor.minus({ months: i - 1 }).toJSDate(),
    }));
    return Promise.all(
      windows.map(async ({ start, end }) => {
        const [calls, cost, revenue] = await Promise.all([
          this.prisma.call.groupBy({
            by: ['kind'],
            where: { organisation_id: organisationId, started_at: { gte: start, lt: end } },
            _sum: { counted_seconds: true },
          }),
          this.prisma.usageEvent.aggregate({
            where: { organisation_id: organisationId, created_at: { gte: start, lt: end } },
            _sum: { cost_usd: true, charged_cost_usd: true },
          }),
          this.prisma.billingInvoice.aggregate({
            where: { organisation_id: organisationId, user_id: null, paid_at: { gte: start, lt: end } },
            _sum: { amount_paid_cents: true, amount_refunded_cents: true },
          }),
        ]);
        const seconds = (kind: CallKind) =>
          calls.find((row) => row.kind === kind)?._sum.counted_seconds ?? 0;
        return {
          start,
          end,
          live_minutes: round(seconds(CallKind.LIVE) / 60, 1),
          practice_minutes: round(seconds(CallKind.PRACTICE) / 60, 1),
          charged_cost_usd: round(cost._sum.charged_cost_usd ?? 0, 4),
          base_cost_usd: round(cost._sum.cost_usd ?? 0, 4),
          revenue_cents:
            (revenue._sum.amount_paid_cents ?? 0) - (revenue._sum.amount_refunded_cents ?? 0),
          plan_price_per_month_cents: subscription
            ? monthlyCents(subscription.unit_amount_cents, subscription.billing_interval)
            : 0,
        };
      }),
    );
  }

  // ---------- Payments ----------

  async payments(query: AdminPaymentsQueryType) {
    const and: Prisma.BillingInvoiceWhereInput[] = [{ status: { not: 'draft' } }];
    if (query.filter === 'failed')
      and.push({ status: { in: ['open', 'uncollectible'] }, attempt_count: { gt: 0 } });
    if (query.filter === 'open') and.push({ status: 'open' });
    if (query.filter === 'refunded') and.push({ amount_refunded_cents: { gt: 0 } });
    if (query.filter === 'paid') and.push({ status: 'paid' });
    if (query.kind) and.push({ kind: query.kind });
    if (query.organisation_id) and.push({ organisation_id: query.organisation_id });
    if (query.from || query.to)
      and.push({
        created_at: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      });
    const where: Prisma.BillingInvoiceWhereInput = { AND: and };
    const [rows, total, totals, failedTotal] = await Promise.all([
      this.prisma.billingInvoice.findMany({
        where,
        include: { organisation: { select: { id: true, name: true } } },
        // Failed and at-risk first by most recent failure when filtering failures.
        orderBy: query.filter === 'failed' ? { updated_at: 'desc' } : { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.billingInvoice.count({ where }),
      this.prisma.billingInvoice.aggregate({
        where,
        _sum: { amount_paid_cents: true, amount_refunded_cents: true },
      }),
      this.prisma.billingInvoice.aggregate({
        where: { AND: [...and, { status: { in: ['open', 'uncollectible'] }, attempt_count: { gt: 0 } }] },
        _sum: { amount_due_cents: true },
      }),
    ]);
    const buyerIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const buyers = await this.prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, email: true, full_name: true },
    });
    const buyerBy = new Map(buyers.map((user) => [user.id, user]));
    const totalPages = Math.ceil(total / query.limit);
    return {
      totals: {
        collected_cents: totals._sum.amount_paid_cents ?? 0,
        refunded_cents: totals._sum.amount_refunded_cents ?? 0,
        failed_cents: failedTotal._sum.amount_due_cents ?? 0,
      },
      data: rows.map((row) => {
        const buyer = row.user_id ? buyerBy.get(row.user_id) : null;
        return {
          ...this.account.toInvoiceView(row),
          organisation: row.organisation,
          scope:
            row.kind === BillingInvoiceKind.TOPUP_PERSONAL
              ? 'personal'
              : row.kind === BillingInvoiceKind.TOPUP_TEAM
                ? 'team'
                : null,
          buyer: buyer ? { id: buyer.id, name: buyer.full_name || buyer.email, email: buyer.email } : null,
          stripe_url: this.stripe.dashboardUrl(`invoices/${row.id}`),
        };
      }),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: totalPages,
        has_next: query.page < totalPages,
        has_prev: query.page > 1,
      },
    };
  }

  // ---------- Actions ----------

  async assignManual(organisationId: string, input: { plan: PlanKey; extra_seats?: number; period_end?: string; note: string }, adminId: string) {
    return this.subscriptions.assignManual(
      organisationId,
      {
        plan: input.plan,
        extraSeats: input.extra_seats,
        periodEnd: input.period_end ? new Date(input.period_end) : null,
        note: input.note,
      },
      adminId,
    );
  }

  async grantCredits(organisationId: string, input: { live_minutes: number; practice_minutes: number; user_id?: string; note?: string }, adminId: string) {
    await this.assertOrganisation(organisationId);
    return this.credits.grant({
      organisationId,
      userId: input.user_id ?? null,
      liveMinutes: input.live_minutes,
      practiceMinutes: input.practice_minutes,
      grantedById: adminId,
      note: input.note ?? null,
    });
  }

  extendTrial(organisationId: string, days: number, adminId: string, note?: string) {
    return this.subscriptions.extendTrial(organisationId, days, adminId, note);
  }

  async applyDiscount(organisationId: string, couponId: string, adminId: string) {
    const row = await this.stripeRow(organisationId);
    const coupon = await this.stripe.retrieveCoupon(couponId).catch(() => null);
    if (!coupon || !coupon.valid) throw new BadRequestException('Unknown or expired coupon');
    const updated = await this.stripe.updateSubscription(row.stripe_subscription_id, {
      discounts: [{ coupon: couponId }],
    });
    await this.sync.applySubscription(updated, { actorKind: 'ADMIN' });
    await this.subscriptions.recordEvent({
      organisationId,
      type: SubscriptionEventType.DISCOUNT_APPLIED,
      fromPlan: row.plan,
      toPlan: row.plan,
      actorKind: 'ADMIN',
      actorId: adminId,
      data: { coupon_id: couponId, percent_off: coupon.percent_off ?? null, amount_off: coupon.amount_off ?? null },
    });
    return { applied: true };
  }

  async cancel(
    organisationId: string,
    input: { mode: 'at_period_end' | 'immediate'; refund?: boolean; confirm_name: string; note?: string },
    admin: { id: string; role: string },
  ) {
    const organisation = await this.assertConfirmName(organisationId, input.confirm_name);
    const row = await this.prisma.subscription.findUnique({ where: { organisation_id: organisationId } });
    if (!row || row.status === SubscriptionStatus.CANCELED)
      throw new BadRequestException('There is no active plan to cancel');

    if (input.mode === 'immediate') {
      this.assertSuperAdmin(admin.role);
      let refundedCents = 0;
      if (row.stripe_subscription_id) {
        const canceled = await this.stripe.cancelSubscription(row.stripe_subscription_id, { prorate: true });
        if (input.refund) refundedCents = await this.refundUnusedTime(organisationId, row.current_period_start, row.current_period_end, admin.id);
        await this.sync.markCanceled(canceled);
      } else {
        await this.prisma.subscription.update({
          where: { organisation_id: organisationId },
          data: { status: SubscriptionStatus.CANCELED, canceled_at: new Date(), cancel_at_period_end: false },
        });
      }
      await this.subscriptions.recordEvent({
        organisationId,
        type: SubscriptionEventType.CANCELED,
        fromPlan: row.plan,
        toPlan: null,
        actorKind: 'ADMIN',
        actorId: admin.id,
        note: input.note ?? null,
        data: { mode: 'immediate', refunded_cents: refundedCents },
      });
      await this.entitlements.invalidate(organisationId);
      return { canceled: true, mode: 'immediate', organisation: organisation.name, refunded_cents: refundedCents };
    }

    if (row.stripe_subscription_id) {
      const updated = await this.stripe.updateSubscription(row.stripe_subscription_id, { cancel_at_period_end: true });
      await this.sync.applySubscription(updated, { actorKind: 'ADMIN' });
    } else {
      await this.prisma.subscription.update({
        where: { organisation_id: organisationId },
        data: { cancel_at_period_end: true },
      });
      await this.subscriptions.recordEvent({
        organisationId,
        type: SubscriptionEventType.CANCEL_SCHEDULED,
        fromPlan: row.plan,
        toPlan: row.plan,
        actorKind: 'ADMIN',
        actorId: admin.id,
        note: input.note ?? null,
        data: {},
      });
    }
    await this.entitlements.invalidate(organisationId);
    return { canceled: true, mode: 'at_period_end' };
  }

  async resume(organisationId: string, adminId: string) {
    await this.account.resumeOrganisation(organisationId, { kind: 'ADMIN', id: adminId });
    return { resumed: true };
  }

  async resync(organisationId: string, adminId: string) {
    await this.stripeRow(organisationId);
    return this.sync.syncOrganisation(organisationId, 'ADMIN', adminId);
  }

  async refundInvoice(
    invoiceId: string,
    input: { amount_cents?: number; confirm_name: string; note?: string },
    admin: { id: string; role: string },
  ) {
    this.assertSuperAdmin(admin.role);
    const invoice = await this.prisma.billingInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.assertConfirmName(invoice.organisation_id, input.confirm_name);
    const refundable = invoice.amount_paid_cents - invoice.amount_refunded_cents;
    const amount = input.amount_cents ?? refundable;
    if (amount <= 0 || amount > refundable)
      throw new BadRequestException(`You can refund up to ${refundable} cents`);
    const paymentIntentId =
      invoice.payment_intent_id ?? (await this.stripe.invoicePaymentIntentId(invoice.id));
    if (!paymentIntentId) throw new BadRequestException('This invoice has no payment to refund');

    await this.stripe.createRefund(
      { payment_intent: paymentIntentId, amount, metadata: { invoice_id: invoice.id, admin_id: admin.id } },
      `refund-${invoice.id}-${amount}-${invoice.amount_refunded_cents}`,
    );
    await this.prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: { amount_refunded_cents: invoice.amount_refunded_cents + amount, payment_intent_id: paymentIntentId },
    });
    const credit = await this.credits.zeroCreditForPayment(paymentIntentId);
    await this.subscriptions.recordEvent({
      organisationId: invoice.organisation_id,
      type: SubscriptionEventType.REFUNDED,
      actorKind: 'ADMIN',
      actorId: admin.id,
      note: input.note ?? null,
      data: { invoice_id: invoice.id, amount_cents: amount, credit_zeroed: !!credit },
    });
    return { refunded_cents: amount, credit_zeroed: !!credit };
  }

  // Prorated refund of the unused part of the latest paid subscription invoice.
  private async refundUnusedTime(organisationId: string, periodStart: Date, periodEnd: Date, adminId: string) {
    const invoice = await this.prisma.billingInvoice.findFirst({
      where: {
        organisation_id: organisationId,
        user_id: null,
        status: 'paid',
        kind: { in: [BillingInvoiceKind.SUBSCRIPTION, BillingInvoiceKind.SEATS] },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!invoice) return 0;
    const total = periodEnd.getTime() - periodStart.getTime();
    const unused = Math.max(0, periodEnd.getTime() - Date.now());
    const amount = Math.min(
      invoice.amount_paid_cents - invoice.amount_refunded_cents,
      total > 0 ? Math.floor((invoice.amount_paid_cents * unused) / total) : 0,
    );
    if (amount <= 0) return 0;
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    const result = await this.refundInvoice(
      invoice.id,
      { amount_cents: amount, confirm_name: organisation.name, note: 'Prorated refund on immediate cancel' },
      { id: adminId, role: AuthRole.SUPER_ADMIN },
    );
    return result.refunded_cents;
  }

  private assertSuperAdmin(role: string) {
    if (role !== AuthRole.SUPER_ADMIN)
      throw new ForbiddenException({
        message: 'Only super admins can do this',
        code: 'SUPER_ADMIN_REQUIRED',
      });
  }

  private async assertConfirmName(organisationId: string, confirmName: string) {
    const organisation = await this.assertOrganisation(organisationId);
    if (organisation.name !== confirmName)
      throw new BadRequestException({
        message: 'Type the organisation name to confirm',
        code: 'CONFIRM_NAME_MISMATCH',
      });
    return organisation;
  }

  private async assertOrganisation(organisationId: string) {
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!organisation) throw new NotFoundException('Organisation not found');
    return organisation;
  }

  private async stripeRow(organisationId: string) {
    const row = await this.prisma.subscription.findUnique({ where: { organisation_id: organisationId } });
    if (!row?.stripe_subscription_id)
      throw new BadRequestException({
        message: 'This organisation has no Stripe subscription',
        code: 'NO_STRIPE_SUBSCRIPTION',
      });
    return row;
  }
}
