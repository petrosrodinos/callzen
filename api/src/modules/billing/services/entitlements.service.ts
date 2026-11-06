import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CallKind, CallType, OrgRole, PlanKey } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RedisPubSubService } from '@/core/databases/redis/redis-pubsub.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { TtlCache } from '@/shared/utils/cache/ttl-cache';
import { round } from '@/shared/utils/math/math.utils';
import { PlanLimitValues } from '@/shared/config/plans/plans.config';
import {
  can,
  OrgContext,
} from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import {
  Availability,
  Consumption,
  Entitlements,
  KindConsumption,
  KindMeter,
  MinutesKind,
  PlanUsage,
} from '../interfaces/entitlements.interface';
import {
  availablePoolSeconds,
  minutesToSeconds,
  PoolState,
  visiblePoolSeconds,
} from '../utils/allowance.utils';
import {
  currentUsagePeriod,
  effectiveStatus,
  isReadOnlyStatus,
  pastDueGraceEndsAt,
} from '../utils/subscription-period.utils';

const CACHE_TTL_MS = 60_000;
const INVALIDATE_CHANNEL = 'billing:entitlements:invalidate';
const ALL = '*';

interface PoolView {
  pool: PoolState;
  memberCapSeconds: number | null;
  // Plan allowance left org-wide, excluding team credits (Infinity when unlimited).
  planAllowanceLeft: number;
  consumption: KindConsumption;
}

// Effective plan limits and features of an organisation and its consumption this period (§8.1). Cached for
// 60 s per organisation; invalidated on every instance by plan changes, AppConfig "plans.*" edits, credit
// grants and the end of each call.
@Injectable()
export class EntitlementsService implements OnModuleInit, OnModuleDestroy {
  private readonly entitlements = new TtlCache<Entitlements>(CACHE_TTL_MS);
  private readonly consumption = new TtlCache<Consumption>(CACHE_TTL_MS);
  private unsubscribers: (() => void)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly pubsub: RedisPubSubService,
  ) {}

  onModuleInit() {
    this.unsubscribers.push(
      this.pubsub.subscribe(INVALIDATE_CHANNEL, (organisationId) =>
        this.dropLocal(organisationId),
      ),
      this.appConfig.onChange((key) => {
        if (key.startsWith('plans.') || key.startsWith('billing.'))
          this.dropLocal(ALL);
      }),
    );
  }

  onModuleDestroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  async invalidate(organisationId: string = ALL) {
    this.dropLocal(organisationId);
    await this.pubsub.publish(INVALIDATE_CHANNEL, organisationId);
  }

  getEntitlements(organisationId: string): Promise<Entitlements> {
    return this.entitlements.getOrLoad(organisationId, () =>
      this.loadEntitlements(organisationId),
    );
  }

  async getConsumption(
    organisationId: string,
    options: { fresh?: boolean } = {},
  ): Promise<Consumption> {
    const entitlements = await this.getEntitlements(organisationId);
    if (options.fresh)
      return this.loadConsumption(organisationId, entitlements);
    return this.consumption.getOrLoad(organisationId, () =>
      this.loadConsumption(organisationId, entitlements),
    );
  }

  async personalCreditSeconds(organisationId: string, userId: string) {
    const totals = await this.prisma.usageCredit.aggregate({
      where: { organisation_id: organisationId, user_id: userId },
      _sum: { live_seconds_remaining: true, practice_seconds_remaining: true },
    });
    return {
      live: totals._sum.live_seconds_remaining ?? 0,
      practice: totals._sum.practice_seconds_remaining ?? 0,
    };
  }

  // Minutes the caller may use for a new call of this kind (§8.3a).
  async getAvailability(
    organisationId: string,
    userId: string,
    kind: MinutesKind,
    options: { fresh?: boolean } = {},
  ): Promise<Availability> {
    const [entitlements, consumption, personal] = await Promise.all([
      this.getEntitlements(organisationId),
      this.getConsumption(organisationId, options),
      this.personalCreditSeconds(organisationId, userId),
    ]);
    return this.computeAvailability(entitlements, consumption, userId, kind, personal);
  }

  computeAvailability(
    entitlements: Entitlements,
    consumption: Consumption,
    userId: string,
    kind: MinutesKind,
    personal: { live: number; practice: number },
  ): Availability {
    const view = this.poolView(entitlements, consumption, kind);
    const isOwner = consumption.owner_ids.includes(userId);
    const memberUsed = view.consumption.by_user[userId] ?? 0;
    const poolSeconds = availablePoolSeconds(view.pool, {
      isOwner,
      memberCapSeconds: view.memberCapSeconds,
      memberUsedSeconds: memberUsed,
    });
    const personalSeconds = this.creditKind(entitlements, kind) === CallKind.LIVE
      ? personal.live + (entitlements.limits.practice_shares_live_pool ? personal.practice : 0)
      : personal.practice;

    let limitedBy: Availability['limited_by'] = null;
    if (poolSeconds <= 0) {
      const capLeft =
        !isOwner && view.memberCapSeconds != null
          ? view.memberCapSeconds - memberUsed
          : Infinity;
      limitedBy = capLeft <= 0 ? 'member_cap' : 'pool';
    }
    return {
      kind,
      pool_seconds: poolSeconds,
      personal_credit_seconds: personalSeconds,
      total_seconds: poolSeconds + personalSeconds,
      limited_by: limitedBy,
    };
  }

  // Org-wide plan allowance left for this kind, excluding team credits (used to decide team-credit draws).
  planAllowanceLeft(
    entitlements: Entitlements,
    consumption: Consumption,
    kind: MinutesKind,
  ): number {
    return this.poolView(entitlements, consumption, kind).planAllowanceLeft;
  }

  // TRIAL shares one pool between live and practice: credits are then drawn from the live balance.
  creditKind(entitlements: Entitlements, kind: MinutesKind): MinutesKind {
    return entitlements.limits.practice_shares_live_pool ? CallKind.LIVE : kind;
  }

  // Meters for GET /usage/plan.
  async getPlanUsage(ctx: OrgContext): Promise<PlanUsage> {
    const [entitlements, consumption, personal, membersCount, pendingInvites] =
      await Promise.all([
        this.getEntitlements(ctx.organisationId),
        this.getConsumption(ctx.organisationId),
        this.personalCreditSeconds(ctx.organisationId, ctx.userId),
        this.prisma.membership.count({
          where: { organisation_id: ctx.organisationId },
        }),
        this.prisma.invitation.count({
          where: {
            organisation_id: ctx.organisationId,
            status: 'PENDING',
            expires_at: { gt: new Date() },
          },
        }),
      ]);
    const isOwner = consumption.owner_ids.includes(ctx.userId);
    const { limits } = entitlements;

    const meter = (kind: MinutesKind): KindMeter => {
      const view = this.poolView(entitlements, consumption, kind);
      const availability = this.computeAvailability(
        entitlements,
        consumption,
        ctx.userId,
        kind,
        personal,
      );
      const used = view.pool.ownersUsedSeconds + view.pool.othersUsedSeconds;
      const reserve = view.pool.ownerReserveSeconds;
      return {
        included_minutes: toMinutes(visiblePoolSeconds(view.pool, isOwner)),
        used_minutes: toMinutes(used),
        member_cap_minutes: isOwner ? null : toMinutes(view.memberCapSeconds),
        member_used_minutes: toMinutes(view.consumption.by_user[ctx.userId] ?? 0),
        available_minutes: Number.isFinite(availability.pool_seconds)
          ? toMinutes(availability.pool_seconds)
          : null,
        team_credit_minutes: toMinutes(
          kind === CallKind.LIVE
            ? entitlements.team_credits.live_seconds
            : entitlements.team_credits.practice_seconds,
        ),
        personal_credit_minutes: toMinutes(
          kind === CallKind.LIVE ? personal.live : personal.practice,
        ),
        owner_reserve_minutes: isOwner && reserve ? toMinutes(reserve) : null,
        owner_reserve_left_minutes:
          isOwner && reserve
            ? toMinutes(Math.max(0, reserve - view.pool.ownersUsedSeconds))
            : null,
      };
    };

    const usage: PlanUsage = {
      plan: entitlements.plan,
      status: entitlements.status,
      source: entitlements.source,
      read_only: entitlements.read_only,
      is_owner: isOwner,
      period: entitlements.period,
      trial_ends_at: entitlements.trial_ends_at,
      cancel_at_period_end: entitlements.cancel_at_period_end,
      live: meter(CallKind.LIVE),
      practice: meter(CallKind.PRACTICE),
      practice_shares_live_pool: limits.practice_shares_live_pool,
      uploads: { used: consumption.uploads, included: limits.uploads_per_period },
      copilots: { used: consumption.copilots, max: limits.copilots_max },
      practice_prospects: {
        used: consumption.practice_prospects,
        max: limits.practice_prospects_max,
      },
      seats: { used: membersCount + pendingInvites, total: entitlements.seats_total },
      features: entitlements.features,
      can_buy_topups:
        entitlements.features.topup_purchases && !entitlements.read_only,
      can_buy_team_topups:
        entitlements.features.topup_purchases &&
        !entitlements.read_only &&
        (isOwner || can(ctx, Permissions.BILLING_MANAGE)),
    };

    if (can(ctx, Permissions.USAGE_VIEW) && membersCount > 1)
      usage.members = await this.memberMinutes(ctx.organisationId, consumption, limits);
    return usage;
  }

  private async memberMinutes(
    organisationId: string,
    consumption: Consumption,
    limits: PlanLimitValues,
  ) {
    const memberships = await this.prisma.membership.findMany({
      where: { organisation_id: organisationId },
      include: { user: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'asc' },
    });
    return memberships.map((membership) => {
      const isOwner = membership.role === OrgRole.OWNER;
      return {
        user_id: membership.user_id,
        name: membership.user.full_name || membership.user.email,
        is_owner: isOwner,
        live_minutes: toMinutes(consumption.live.by_user[membership.user_id] ?? 0),
        practice_minutes: toMinutes(
          consumption.practice.by_user[membership.user_id] ?? 0,
        ),
        live_cap_minutes: isOwner ? null : limits.live_minutes_per_member_per_period,
        practice_cap_minutes: isOwner
          ? null
          : limits.practice_minutes_per_member_per_period,
      };
    });
  }

  private poolView(
    entitlements: Entitlements,
    consumption: Consumption,
    kind: MinutesKind,
  ): PoolView {
    const { limits } = entitlements;
    const shared = limits.practice_shares_live_pool;
    const isLive = shared || kind === CallKind.LIVE;
    const kindConsumption = shared
      ? mergeConsumption(consumption.live, consumption.practice)
      : kind === CallKind.LIVE
        ? consumption.live
        : consumption.practice;

    const allowance = minutesToSeconds(
      isLive ? limits.live_minutes_per_period : limits.practice_minutes_per_period,
    );
    const teamRemaining = shared
      ? entitlements.team_credits.live_seconds + entitlements.team_credits.practice_seconds
      : isLive
        ? entitlements.team_credits.live_seconds
        : entitlements.team_credits.practice_seconds;
    const used = kindConsumption.owners_seconds + kindConsumption.others_seconds;

    return {
      pool: {
        poolSeconds:
          allowance == null
            ? null
            : allowance + kindConsumption.team_credit_seconds + teamRemaining,
        ownerReserveSeconds:
          minutesToSeconds(
            isLive
              ? limits.live_minutes_reserved_for_owner_per_period
              : limits.practice_minutes_reserved_for_owner_per_period,
          ) ?? 0,
        ownersUsedSeconds: kindConsumption.owners_seconds,
        othersUsedSeconds: kindConsumption.others_seconds,
      },
      memberCapSeconds: minutesToSeconds(
        isLive
          ? limits.live_minutes_per_member_per_period
          : limits.practice_minutes_per_member_per_period,
      ),
      planAllowanceLeft:
        allowance == null
          ? Infinity
          : Math.max(0, allowance - (used - kindConsumption.team_credit_seconds)),
      consumption: kindConsumption,
    };
  }

  private async loadEntitlements(organisationId: string): Promise<Entitlements> {
    const [subscription, teamCredits] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { organisation_id: organisationId },
      }),
      this.prisma.usageCredit.aggregate({
        where: { organisation_id: organisationId, user_id: null },
        _sum: { live_seconds_remaining: true, practice_seconds_remaining: true },
      }),
    ]);
    const graceDays = this.appConfig.get('billing.past_due_grace_days');
    const status = effectiveStatus(subscription, graceDays);
    // Without a subscription the organisation is read-only; TRIAL limits are only used for display.
    const plan = subscription?.plan ?? PlanKey.TRIAL;
    const definition = this.appConfig.get('plans.definitions')[plan];
    const extraSeats = definition.limits.extra_seats_allowed
      ? (subscription?.extra_seats ?? 0)
      : 0;

    return {
      organisation_id: organisationId,
      plan,
      status,
      source: subscription?.source ?? null,
      read_only: isReadOnlyStatus(status),
      period: currentUsagePeriod(subscription),
      limits: definition.limits,
      features: definition.features,
      seats_total: definition.limits.seats_included + extraSeats,
      extra_seats: extraSeats,
      trial_ends_at: subscription?.trial_ends_at ?? null,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
      past_due_grace_ends_at: subscription
        ? pastDueGraceEndsAt(subscription, graceDays)
        : null,
      team_credits: {
        live_seconds: teamCredits._sum.live_seconds_remaining ?? 0,
        practice_seconds: teamCredits._sum.practice_seconds_remaining ?? 0,
      },
    };
  }

  private async loadConsumption(
    organisationId: string,
    entitlements: Entitlements,
  ): Promise<Consumption> {
    const { start, end } = entitlements.period;
    const inPeriod = { gte: start, lt: end };
    const [byUserKind, owners, teamDraws, uploads, copilots, prospects] =
      await Promise.all([
        this.prisma.call.groupBy({
          by: ['user_id', 'kind'],
          where: {
            organisation_id: organisationId,
            started_at: inPeriod,
            usage_settled_at: { not: null },
          },
          _sum: { counted_seconds: true, personal_credit_seconds: true },
        }),
        this.prisma.membership.findMany({
          where: { organisation_id: organisationId, role: OrgRole.OWNER },
          select: { user_id: true },
        }),
        this.prisma.usageCreditConsumption.aggregate({
          where: {
            created_at: inPeriod,
            credit: { organisation_id: organisationId, user_id: null },
          },
          _sum: { live_seconds: true, practice_seconds: true },
        }),
        this.prisma.call.count({
          where: {
            organisation_id: organisationId,
            call_type: CallType.UPLOAD,
            started_at: inPeriod,
          },
        }),
        // Archived items do not count toward the maximum; the default co-pilot does (§8.2).
        this.prisma.assistantAgent.count({
          where: { organisation_id: organisationId, archived_at: null },
        }),
        this.prisma.practiceAgent.count({
          where: { organisation_id: organisationId, archived_at: null },
        }),
      ]);

    const ownerIds = owners.map((owner) => owner.user_id);
    const empty = (): KindConsumption => ({
      owners_seconds: 0,
      others_seconds: 0,
      by_user: {},
      team_credit_seconds: 0,
    });
    const live = empty();
    const practice = empty();
    live.team_credit_seconds = teamDraws._sum.live_seconds ?? 0;
    practice.team_credit_seconds = teamDraws._sum.practice_seconds ?? 0;

    for (const row of byUserKind) {
      // Seconds paid with personal credits never touch the pool or the caps (§3.5).
      const seconds = Math.max(
        0,
        (row._sum.counted_seconds ?? 0) - (row._sum.personal_credit_seconds ?? 0),
      );
      const target = row.kind === CallKind.LIVE ? live : practice;
      target.by_user[row.user_id] = (target.by_user[row.user_id] ?? 0) + seconds;
      if (ownerIds.includes(row.user_id)) target.owners_seconds += seconds;
      else target.others_seconds += seconds;
    }

    return {
      period: entitlements.period,
      live,
      practice,
      uploads,
      copilots,
      practice_prospects: prospects,
      owner_ids: ownerIds,
    };
  }

  private dropLocal(organisationId: string) {
    if (organisationId === ALL) {
      this.entitlements.clear();
      this.consumption.clear();
      return;
    }
    this.entitlements.delete(organisationId);
    this.consumption.delete(organisationId);
  }
}

const toMinutes = (seconds: number | null): number | null =>
  seconds == null ? null : round(seconds / 60, 1);

const mergeConsumption = (a: KindConsumption, b: KindConsumption): KindConsumption => {
  const byUser: Record<string, number> = { ...a.by_user };
  for (const [userId, seconds] of Object.entries(b.by_user))
    byUser[userId] = (byUser[userId] ?? 0) + seconds;
  return {
    owners_seconds: a.owners_seconds + b.owners_seconds,
    others_seconds: a.others_seconds + b.others_seconds,
    by_user: byUser,
    team_credit_seconds: a.team_credit_seconds + b.team_credit_seconds,
  };
};
