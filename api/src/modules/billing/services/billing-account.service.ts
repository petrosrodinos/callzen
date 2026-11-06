import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  InvitationStatus,
  PlanKey,
  Prisma,
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from './subscriptions.service';
import { StripeSyncService } from './stripe-sync.service';
import { StripePriceAmountsService } from './stripe-price-amounts.service';
import {
  BillingCheckoutService,
  BillingErrorCodes,
} from './billing-checkout.service';
import {
  BillingInterval,
  canManageBilling,
  classifyChange,
  fromUnix,
} from '../utils/stripe-billing.utils';
import { pastDueGraceEndsAt } from '../utils/subscription-period.utils';

export interface PlanChangeInput {
  plan: PlanKey;
  interval: BillingInterval;
  extra_seats?: number;
}

const INVOICE_PAGE = 20;

// The user billing page (§11a). Reads come from our mirror of Stripe; changes go to Stripe and are mirrored
// back by the webhooks (applied immediately too, so the page updates without waiting).
@Injectable()
export class BillingAccountService {
  private readonly logger = new Logger(BillingAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly stripe: StripeBillingService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly sync: StripeSyncService,
    private readonly priceAmounts: StripePriceAmountsService,
    private readonly checkout: BillingCheckoutService,
  ) {}

  async overview(ctx: OrgContext) {
    const [subscription, entitlements, seatsUsed, actionRequired] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { organisation_id: ctx.organisationId } }),
      this.entitlements.getEntitlements(ctx.organisationId),
      this.seatsUsed(ctx.organisationId),
      this.prisma.billingInvoice.findFirst({
        where: {
          organisation_id: ctx.organisationId,
          user_id: null,
          requires_action: true,
          status: 'open',
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    const amounts = await this.priceAmounts.planAmounts();
    const interval = (subscription?.billing_interval ?? 'month') as BillingInterval;
    const planAmounts = amounts[entitlements.plan];
    const graceDays = this.appConfig.get('billing.past_due_grace_days');
    const isStripe = subscription?.source === SubscriptionSource.STRIPE;
    const willRenew =
      isStripe &&
      !subscription.cancel_at_period_end &&
      subscription.status !== SubscriptionStatus.CANCELED;

    return {
      plan: entitlements.plan,
      status: entitlements.status,
      stored_status: subscription?.status ?? null,
      source: subscription?.source ?? null,
      interval: subscription?.billing_interval ?? null,
      read_only: entitlements.read_only,
      price: {
        amount_cents:
          subscription?.unit_amount_cents ??
          (interval === 'year' ? planAmounts?.yearly : planAmounts?.monthly)?.amount_cents ??
          null,
        currency: subscription?.currency ?? 'usd',
      },
      current_period_start: subscription?.current_period_start ?? null,
      current_period_end: subscription?.current_period_end ?? null,
      next_charge: willRenew
        ? { date: subscription.current_period_end, amount_cents: subscription.unit_amount_cents }
        : null,
      trial_ends_at: subscription?.trial_ends_at ?? null,
      cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
      canceled_at: subscription?.canceled_at ?? null,
      pending_change: subscription?.pending_change_at
        ? {
            plan: subscription.pending_plan,
            interval: subscription.pending_interval,
            extra_seats: subscription.pending_extra_seats,
            effective_at: subscription.pending_change_at,
          }
        : null,
      seats: {
        used: seatsUsed.total,
        members: seatsUsed.members,
        pending_invitations: seatsUsed.pending,
        included: entitlements.limits.seats_included,
        extra: entitlements.extra_seats,
        total: entitlements.seats_total,
        extra_seats_allowed: entitlements.limits.extra_seats_allowed,
        extra_seat_price:
          (interval === 'year' ? planAmounts?.extra_seat_yearly : planAmounts?.extra_seat_monthly) ??
          null,
      },
      payment_method: subscription?.payment_method ?? null,
      has_stripe_customer: !!subscription?.stripe_customer_id,
      has_stripe_subscription: !!subscription?.stripe_subscription_id,
      manual_plan: subscription?.source === SubscriptionSource.MANUAL,
      can_manage: canManageBilling(ctx),
      banners: {
        past_due:
          subscription?.status === SubscriptionStatus.PAST_DUE
            ? { grace_ends_at: pastDueGraceEndsAt(subscription, graceDays) }
            : null,
        action_required: actionRequired
          ? { invoice_id: actionRequired.id, hosted_invoice_url: actionRequired.hosted_invoice_url }
          : null,
      },
    };
  }

  // Organisation invoices (personal top-ups stay private to their buyer), newest first, cursor paginated.
  async invoices(ctx: OrgContext, cursor?: string, limit = INVOICE_PAGE) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.billingInvoice.findMany({
      where: { organisation_id: ctx.organisationId, user_id: null, status: { not: 'draft' } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const page = rows.slice(0, take);
    return {
      data: page.map((row) => this.toInvoiceView(row)),
      next_cursor: rows.length > take ? page.at(-1)?.id : null,
    };
  }

  async events(ctx: OrgContext) {
    const events = await this.prisma.subscriptionEvent.findMany({
      where: { organisation_id: ctx.organisationId },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    // A member's personal purchases are never shown to the organisation. Filtered here rather than with a JSON
    // path filter: in Postgres NOT(path = 'personal') is NULL for events without a scope and would drop them.
    return events
      .filter((event) => (event.data as { scope?: string } | null)?.scope !== 'personal')
      .slice(0, 100)
      .map(({ actor_id: _actor, note: _note, ...event }) => event);
  }

  async myPurchases(ctx: OrgContext) {
    const [credits, invoices] = await Promise.all([
      this.prisma.usageCredit.findMany({
        where: { organisation_id: ctx.organisationId, user_id: ctx.userId },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.billingInvoice.findMany({
        where: { organisation_id: ctx.organisationId, user_id: ctx.userId },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
    ]);
    return {
      credits: credits.map((credit) => ({
        id: credit.id,
        pack_id: credit.pack_id,
        live_minutes_granted: credit.live_seconds_granted / 60,
        practice_minutes_granted: credit.practice_seconds_granted / 60,
        live_minutes_remaining: credit.live_seconds_remaining / 60,
        practice_minutes_remaining: credit.practice_seconds_remaining / 60,
        created_at: credit.created_at,
      })),
      invoices: invoices.map((row) => this.toInvoiceView(row)),
    };
  }

  async previewChange(ctx: OrgContext, input: PlanChangeInput) {
    this.checkout.assertCanManage(ctx);
    const lineItems = this.checkout.lineItems(input.plan, input.interval, input.extra_seats);
    const nextAmount = await this.amountOf(lineItems);
    const subscription = await this.activeStripeSubscription(ctx.organisationId);
    if (!subscription)
      return {
        mode: 'checkout' as const,
        timing: 'immediate' as const,
        amount_due_now_cents: nextAmount,
        next_amount_cents: nextAmount,
        next_charge_at: null,
        currency: 'usd',
      };

    const timing = classifyChange(this.currentChange(subscription), this.toChange(input));
    if (timing === 'none') throw new BadRequestException('This is already your plan');
    await this.assertSeatsFit(ctx.organisationId, input);

    if (timing === 'scheduled')
      return {
        mode: 'scheduled' as const,
        timing,
        amount_due_now_cents: 0,
        next_amount_cents: nextAmount,
        next_charge_at: subscription.current_period_end,
        effective_at: subscription.current_period_end,
        currency: subscription.currency,
      };

    const stripeSub = await this.stripe.retrieveSubscription(subscription.stripe_subscription_id);
    const preview = await this.stripe.previewInvoice({
      customer: subscription.stripe_customer_id,
      subscription: stripeSub.id,
      subscription_details: {
        items: this.itemUpdates(stripeSub, lineItems),
        proration_behavior: 'always_invoice',
        proration_date: Math.floor(Date.now() / 1000),
      },
    });
    const next = this.sync.parseItems(stripeSub);
    return {
      mode: 'immediate' as const,
      timing,
      amount_due_now_cents: preview.amount_due ?? 0,
      next_amount_cents: nextAmount,
      next_charge_at:
        input.interval === subscription.billing_interval ? next.periodEnd : null,
      currency: preview.currency ?? 'usd',
    };
  }

  async changePlan(ctx: OrgContext, input: PlanChangeInput, idempotencyKey?: string) {
    this.checkout.assertCanManage(ctx);
    const lineItems = this.checkout.lineItems(input.plan, input.interval, input.extra_seats);
    const subscription = await this.activeStripeSubscription(ctx.organisationId);
    // No card on file (trial or manual plan): the change goes through Checkout instead.
    if (!subscription) {
      const session = await this.checkout.checkout(ctx, input, idempotencyKey);
      return { mode: 'checkout' as const, url: session.url };
    }

    const current = this.currentChange(subscription);
    const next = this.toChange(input);
    const timing = classifyChange(current, next);
    if (timing === 'none') throw new BadRequestException('This is already your plan');
    await this.assertSeatsFit(ctx.organisationId, input);

    const stripeSub = await this.stripe.retrieveSubscription(subscription.stripe_subscription_id);
    // A newer decision replaces any earlier scheduled change.
    if (subscription.stripe_schedule_id) {
      await this.stripe.releaseSchedule(subscription.stripe_schedule_id).catch(() => undefined);
      await this.sync.clearPending(ctx.organisationId);
    }

    if (timing === 'immediate') {
      let updated: Stripe.Subscription;
      try {
        updated = await this.stripe.updateSubscription(
          stripeSub.id,
          {
            items: this.itemUpdates(stripeSub, lineItems),
            proration_behavior: 'always_invoice',
            // A failed payment rejects the update: the customer stays on the old plan (§11a).
            payment_behavior: 'error_if_incomplete',
            cancel_at_period_end: false,
          },
          idempotencyKey ? `change-${ctx.organisationId}-${idempotencyKey}` : undefined,
        );
      } catch (error) {
        throw new BadRequestException({
          message: `The payment for this change did not go through, so your plan was not changed. ${error?.message ?? ''}`.trim(),
          code: 'PAYMENT_FAILED',
        });
      }
      await this.sync.applySubscription(updated, { actorKind: 'USER' });
      return { mode: 'immediate' as const, applied: true };
    }

    // Scheduled: the current phase runs to the period end, then the new prices apply.
    const scheduleId =
      (typeof stripeSub.schedule === 'string' ? stripeSub.schedule : stripeSub.schedule?.id) ??
      (await this.stripe.createSchedule({ from_subscription: stripeSub.id })).id;
    const schedule = await this.stripe.retrieveSchedule(scheduleId);
    const currentPhase = schedule.phases[0];
    const updatedSchedule = await this.stripe.updateSchedule(scheduleId, {
      end_behavior: 'release',
      phases: [
        {
          items: currentPhase.items.map((item) => ({
            price: typeof item.price === 'string' ? item.price : item.price.id,
            quantity: item.quantity ?? 1,
          })),
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
        },
        { items: lineItems, proration_behavior: 'none' },
      ],
    });
    await this.sync.applySchedule(updatedSchedule);
    await this.subscriptions.recordEvent({
      organisationId: ctx.organisationId,
      type: SubscriptionEventType.CHANGE_SCHEDULED,
      fromPlan: subscription.plan,
      toPlan: input.plan,
      actorKind: 'USER',
      actorId: ctx.userId,
      data: {
        interval: input.interval,
        extra_seats: next.extraSeats,
        effective_at: fromUnix(currentPhase.end_date)?.toISOString() ?? null,
      },
    });
    return {
      mode: 'scheduled' as const,
      effective_at: fromUnix(currentPhase.end_date),
    };
  }

  async cancel(ctx: OrgContext, input: { reason?: string; comment?: string }) {
    this.checkout.assertCanManage(ctx);
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: ctx.organisationId },
    });
    if (!subscription || subscription.status === SubscriptionStatus.CANCELED)
      throw new BadRequestException({
        message: 'There is no active plan to cancel',
        code: BillingErrorCodes.NO_SUBSCRIPTION,
      });
    if (subscription.cancel_at_period_end) return this.overview(ctx);

    if (subscription.stripe_subscription_id) {
      if (subscription.stripe_schedule_id)
        await this.stripe.releaseSchedule(subscription.stripe_schedule_id).catch(() => undefined);
      const updated = await this.stripe.updateSubscription(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: { cancel_reason: (input.reason ?? '').slice(0, 100) },
      });
      await this.sync.applySubscription(updated, { actorKind: 'USER' });
    } else {
      await this.prisma.subscription.update({
        where: { organisation_id: ctx.organisationId },
        data: { cancel_at_period_end: true },
      });
      await this.subscriptions.recordEvent({
        organisationId: ctx.organisationId,
        type: SubscriptionEventType.CANCEL_SCHEDULED,
        fromPlan: subscription.plan,
        toPlan: subscription.plan,
        actorKind: 'USER',
        actorId: ctx.userId,
        data: {},
      });
    }
    await this.prisma.subscription.update({
      where: { organisation_id: ctx.organisationId },
      data: { cancel_reason: [input.reason, input.comment].filter(Boolean).join(': ').slice(0, 1000) || null },
    });
    // Reason and comment are kept on the latest CANCEL_SCHEDULED event for the admin timeline.
    const latest = await this.prisma.subscriptionEvent.findFirst({
      where: { organisation_id: ctx.organisationId, type: SubscriptionEventType.CANCEL_SCHEDULED },
      orderBy: { created_at: 'desc' },
    });
    if (latest)
      await this.prisma.subscriptionEvent.update({
        where: { id: latest.id },
        data: {
          actor_id: ctx.userId,
          data: {
            ...(latest.data as object),
            reason: input.reason ?? null,
            comment: input.comment?.slice(0, 1000) ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    await this.entitlements.invalidate(ctx.organisationId);
    return this.overview(ctx);
  }

  // Removes a scheduled cancellation or a scheduled change.
  async resume(ctx: OrgContext, actor: { kind: 'USER' | 'ADMIN'; id: string } = { kind: 'USER', id: ctx.userId }) {
    if (actor.kind === 'USER') this.checkout.assertCanManage(ctx);
    await this.resumeOrganisation(ctx.organisationId, actor);
    return this.overview(ctx);
  }

  async resumeOrganisation(organisationId: string, actor: { kind: 'USER' | 'ADMIN'; id: string }) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (!subscription || subscription.status === SubscriptionStatus.CANCELED)
      throw new BadRequestException({
        message: 'There is nothing to resume',
        code: BillingErrorCodes.NO_SUBSCRIPTION,
      });

    if (subscription.stripe_schedule_id) {
      await this.stripe.releaseSchedule(subscription.stripe_schedule_id).catch((error) =>
        this.logger.warn(`Release schedule failed: ${error?.message}`),
      );
      await this.sync.clearPending(organisationId);
      await this.subscriptions.recordEvent({
        organisationId,
        type: SubscriptionEventType.CHANGE_CANCELED,
        fromPlan: subscription.plan,
        toPlan: subscription.plan,
        actorKind: actor.kind,
        actorId: actor.id,
        data: { pending_plan: subscription.pending_plan },
      });
    }
    if (subscription.cancel_at_period_end) {
      if (subscription.stripe_subscription_id) {
        const updated = await this.stripe.updateSubscription(subscription.stripe_subscription_id, {
          cancel_at_period_end: false,
        });
        await this.sync.applySubscription(updated, { actorKind: actor.kind });
      } else {
        await this.prisma.subscription.update({
          where: { organisation_id: organisationId },
          data: { cancel_at_period_end: false },
        });
        await this.subscriptions.recordEvent({
          organisationId,
          type: SubscriptionEventType.CANCEL_REVOKED,
          fromPlan: subscription.plan,
          toPlan: subscription.plan,
          actorKind: actor.kind,
          actorId: actor.id,
          data: {},
        });
      }
      await this.prisma.subscription.update({
        where: { organisation_id: organisationId },
        data: { cancel_reason: null },
      });
    }
    await this.entitlements.invalidate(organisationId);
  }

  toInvoiceView(row: Prisma.BillingInvoiceGetPayload<object>) {
    return {
      id: row.id,
      number: row.number,
      kind: row.kind,
      params: row.params,
      status: row.status,
      amount_due_cents: row.amount_due_cents,
      amount_paid_cents: row.amount_paid_cents,
      amount_refunded_cents: row.amount_refunded_cents,
      currency: row.currency,
      period_start: row.period_start,
      period_end: row.period_end,
      hosted_invoice_url: row.hosted_invoice_url,
      invoice_pdf_url: row.invoice_pdf_url,
      requires_action: row.requires_action,
      attempt_count: row.attempt_count,
      last_error: row.last_error,
      created_at: row.created_at,
      paid_at: row.paid_at,
    };
  }

  async seatsUsed(organisationId: string) {
    const [members, pending] = await Promise.all([
      this.prisma.membership.count({ where: { organisation_id: organisationId } }),
      this.prisma.invitation.count({
        where: {
          organisation_id: organisationId,
          status: InvitationStatus.PENDING,
          expires_at: { gt: new Date() },
        },
      }),
    ]);
    return { members, pending, total: members + pending };
  }

  // Leaving Coach (or removing seats) is blocked while members + pending invitations exceed the new seats.
  private async assertSeatsFit(organisationId: string, input: PlanChangeInput) {
    const definition = this.appConfig.get('plans.definitions')[input.plan];
    const seatsAfter =
      definition.limits.seats_included +
      (definition.limits.extra_seats_allowed ? Math.max(0, input.extra_seats ?? 0) : 0);
    const used = await this.seatsUsed(organisationId);
    if (used.total > seatsAfter)
      throw new BadRequestException({
        message: `This plan has ${seatsAfter} seat(s) but ${used.total} are in use. Remove members or revoke invitations first.`,
        code: BillingErrorCodes.SEATS_IN_USE,
        seats_after: seatsAfter,
        members: used.members,
        pending_invitations: used.pending,
        to_remove: used.total - seatsAfter,
      });
  }

  private async activeStripeSubscription(organisationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (
      !subscription?.stripe_subscription_id ||
      !subscription.stripe_customer_id ||
      subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.INCOMPLETE
    )
      return null;
    return subscription;
  }

  private currentChange(subscription: {
    plan: PlanKey;
    billing_interval: string | null;
    extra_seats: number;
  }) {
    return {
      plan: subscription.plan,
      interval: (subscription.billing_interval ?? 'month') as BillingInterval,
      extraSeats: subscription.extra_seats,
    };
  }

  private toChange(input: PlanChangeInput) {
    const definition = this.appConfig.get('plans.definitions')[input.plan];
    return {
      plan: input.plan,
      interval: input.interval,
      extraSeats: definition.limits.extra_seats_allowed ? Math.max(0, input.extra_seats ?? 0) : 0,
    };
  }

  // Maps the new line items onto the existing subscription items (base plan item, optional seat item).
  private itemUpdates(
    stripeSub: Stripe.Subscription,
    lineItems: { price: string; quantity: number }[],
  ): Stripe.SubscriptionUpdateParams.Item[] {
    const [base, seats] = lineItems;
    const existingBase = stripeSub.items.data.find(
      (item) => !this.priceAmounts.planForPrice(item.price?.id)?.seat,
    );
    const existingSeat = stripeSub.items.data.find(
      (item) => this.priceAmounts.planForPrice(item.price?.id)?.seat,
    );
    const updates: Stripe.SubscriptionUpdateParams.Item[] = [
      existingBase ? { id: existingBase.id, price: base.price, quantity: 1 } : { price: base.price, quantity: 1 },
    ];
    if (seats)
      updates.push(
        existingSeat
          ? { id: existingSeat.id, price: seats.price, quantity: seats.quantity }
          : { price: seats.price, quantity: seats.quantity },
      );
    else if (existingSeat) updates.push({ id: existingSeat.id, deleted: true });
    return updates;
  }

  private async amountOf(lineItems: { price: string; quantity: number }[]) {
    const amounts = await Promise.all(
      lineItems.map(async (item) => ((await this.priceAmounts.amount(item.price))?.amount_cents ?? 0) * item.quantity),
    );
    return amounts.reduce((sum, value) => sum + value, 0);
  }
}
