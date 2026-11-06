import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  BillingInvoiceKind,
  PlanKey,
  Prisma,
  Subscription,
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService, ActorKind } from './subscriptions.service';
import { StripePriceAmountsService } from './stripe-price-amounts.service';
import { BillingAlertKinds, BillingAlertsService } from './billing-alerts.service';
import { fromUnix, isStaleUpdate, mapStripeStatus } from '../utils/stripe-billing.utils';

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  !value ? null : typeof value === 'string' ? value : value.id;

interface ParsedItems {
  plan: PlanKey | null;
  interval: 'month' | 'year' | null;
  extraSeats: number;
  unitAmountCents: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

// Applies Stripe state (subscriptions, schedules, invoices, payment methods) to our tables. Stripe is the
// source of truth for paid plans; webhooks, the admin "Re-sync" action and the nightly reconcile job all go
// through here so the rules live in one place.
@Injectable()
export class StripeSyncService {
  private readonly logger = new Logger(StripeSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeBillingService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly priceAmounts: StripePriceAmountsService,
    private readonly alerts: BillingAlertsService,
  ) {}

  // ---------- Subscriptions ----------

  async applySubscription(
    stripeSub: Stripe.Subscription,
    options: { eventAt?: Date | null; actorKind?: ActorKind; recordSync?: boolean } = {},
  ): Promise<{ subscription: Subscription | null; drift: boolean }> {
    const organisationId = await this.organisationForSubscription(stripeSub);
    if (!organisationId) {
      this.logger.warn(`Stripe subscription ${stripeSub.id} has no organisation`);
      return { subscription: null, drift: false };
    }
    const existing = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (isStaleUpdate(existing?.last_synced_at, options.eventAt ?? null))
      return { subscription: existing, drift: false };

    // A newer Stripe subscription replaced this one (e.g. re-subscribed): ignore the old one's updates.
    if (
      existing?.stripe_subscription_id &&
      existing.stripe_subscription_id !== stripeSub.id &&
      existing.status !== SubscriptionStatus.CANCELED &&
      ['canceled', 'incomplete_expired'].includes(stripeSub.status)
    )
      return { subscription: existing, drift: false };

    const items = this.parseItems(stripeSub);
    const status = mapStripeStatus(stripeSub.status);
    const plan = items.plan ?? existing?.plan ?? PlanKey.STARTER;
    const data = {
      plan,
      status,
      source: SubscriptionSource.STRIPE,
      billing_interval: items.interval ?? existing?.billing_interval ?? null,
      extra_seats: items.extraSeats,
      stripe_customer_id: idOf(stripeSub.customer),
      stripe_subscription_id: stripeSub.id,
      current_period_start: items.periodStart ?? existing?.current_period_start ?? new Date(),
      current_period_end: items.periodEnd ?? existing?.current_period_end ?? new Date(),
      trial_ends_at: fromUnix(stripeSub.trial_end),
      cancel_at_period_end: !!stripeSub.cancel_at_period_end || !!stripeSub.cancel_at,
      canceled_at: fromUnix(stripeSub.canceled_at),
      past_due_since:
        status === SubscriptionStatus.PAST_DUE
          ? (existing?.past_due_since ?? new Date())
          : null,
      unit_amount_cents: items.unitAmountCents,
      currency: stripeSub.currency ?? 'usd',
      stripe_schedule_id: idOf(stripeSub.schedule as never),
      last_synced_at: options.eventAt ?? new Date(),
      manual_note: existing?.manual_note ?? null,
    };

    const drift =
      !!existing &&
      (existing.plan !== data.plan ||
        existing.status !== data.status ||
        existing.extra_seats !== data.extra_seats ||
        existing.cancel_at_period_end !== data.cancel_at_period_end ||
        existing.current_period_end.getTime() !== data.current_period_end.getTime());

    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscription.upsert({
        where: { organisation_id: organisationId },
        create: { organisation_id: organisationId, ...data },
        update: data,
      });
      for (const event of this.diffEvents(existing, row))
        await this.subscriptions.recordEvent(
          { organisationId, actorKind: options.actorKind ?? 'STRIPE', ...event },
          tx,
        );
      if (options.recordSync && drift)
        await this.subscriptions.recordEvent(
          {
            organisationId,
            type: SubscriptionEventType.SYNCED,
            fromPlan: existing?.plan,
            toPlan: row.plan,
            actorKind: options.actorKind ?? 'SYSTEM',
            data: { fixed: true },
          },
          tx,
        );
      return row;
    });

    if (
      existing?.status !== SubscriptionStatus.CANCELED &&
      saved.status === SubscriptionStatus.CANCELED
    )
      await this.alerts.alert(organisationId, BillingAlertKinds.PLAN_CANCELED, {
        plan: saved.plan,
      });
    if (saved.stripe_schedule_id) await this.refreshSchedule(saved.stripe_schedule_id);
    else if (existing?.pending_plan || existing?.pending_interval || existing?.pending_extra_seats != null)
      await this.clearPending(organisationId);

    await this.entitlements.invalidate(organisationId);
    return { subscription: saved, drift };
  }

  async markCanceled(stripeSub: Stripe.Subscription, eventAt?: Date | null) {
    return this.applySubscription(
      { ...stripeSub, status: 'canceled' } as Stripe.Subscription,
      { eventAt },
    );
  }

  private diffEvents(
    before: Subscription | null,
    after: Subscription,
  ): Omit<Parameters<SubscriptionsService['recordEvent']>[0], 'organisationId' | 'actorKind'>[] {
    const events = [];
    if (!before || before.source === SubscriptionSource.MANUAL || before.status === SubscriptionStatus.CANCELED) {
      if (after.status !== SubscriptionStatus.CANCELED)
        events.push({
          type: before?.status === SubscriptionStatus.CANCELED && before.source === SubscriptionSource.STRIPE
            ? SubscriptionEventType.REACTIVATED
            : SubscriptionEventType.STARTED,
          fromPlan: before?.plan ?? null,
          toPlan: after.plan,
          data: { interval: after.billing_interval, extra_seats: after.extra_seats, source_was: before?.source ?? null },
        });
      return events;
    }
    if (before.plan !== after.plan || before.billing_interval !== after.billing_interval)
      events.push({
        type: SubscriptionEventType.PLAN_CHANGED,
        fromPlan: before.plan,
        toPlan: after.plan,
        data: { from_interval: before.billing_interval, to_interval: after.billing_interval },
      });
    if (before.extra_seats !== after.extra_seats)
      events.push({
        type: SubscriptionEventType.SEATS_CHANGED,
        fromPlan: after.plan,
        toPlan: after.plan,
        data: { from: before.extra_seats, to: after.extra_seats },
      });
    if (!before.cancel_at_period_end && after.cancel_at_period_end)
      events.push({ type: SubscriptionEventType.CANCEL_SCHEDULED, fromPlan: after.plan, toPlan: after.plan, data: {} });
    if (before.cancel_at_period_end && !after.cancel_at_period_end && after.status !== SubscriptionStatus.CANCELED)
      events.push({ type: SubscriptionEventType.CANCEL_REVOKED, fromPlan: after.plan, toPlan: after.plan, data: {} });
    // `before` is not canceled here (handled above).
    if (after.status === SubscriptionStatus.CANCELED)
      events.push({ type: SubscriptionEventType.CANCELED, fromPlan: after.plan, toPlan: null, data: {} });
    return events;
  }

  parseItems(stripeSub: Stripe.Subscription): ParsedItems {
    const result: ParsedItems = {
      plan: null,
      interval: null,
      extraSeats: 0,
      unitAmountCents: 0,
      periodStart: null,
      periodEnd: null,
    };
    for (const item of stripeSub.items?.data ?? []) {
      const price = item.price;
      const mapped = this.priceAmounts.planForPrice(price?.id);
      const quantity = item.quantity ?? 1;
      result.unitAmountCents += (price?.unit_amount ?? 0) * quantity;
      // clover API: billing periods live on the items.
      result.periodStart ??= fromUnix((item as { current_period_start?: number }).current_period_start);
      result.periodEnd ??= fromUnix((item as { current_period_end?: number }).current_period_end);
      if (mapped?.seat) {
        result.extraSeats = quantity;
        continue;
      }
      if (mapped) result.plan = mapped.plan;
      result.interval ??= (price?.recurring?.interval as 'month' | 'year') ?? mapped?.interval ?? null;
    }
    return result;
  }

  private async organisationForSubscription(stripeSub: Stripe.Subscription) {
    const fromMetadata = stripeSub.metadata?.organisation_id;
    if (fromMetadata) {
      const exists = await this.prisma.organisation.findUnique({
        where: { id: fromMetadata },
        select: { id: true },
      });
      if (exists) return exists.id;
    }
    const row = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripe_subscription_id: stripeSub.id },
          { stripe_customer_id: idOf(stripeSub.customer) },
        ],
      },
      select: { organisation_id: true },
    });
    return row?.organisation_id ?? null;
  }

  // ---------- Schedules (scheduled downgrades, §11a) ----------

  async refreshSchedule(scheduleId: string) {
    try {
      const schedule = await this.stripe.retrieveSchedule(scheduleId);
      await this.applySchedule(schedule);
    } catch (error) {
      this.logger.warn(`Schedule ${scheduleId} refresh failed: ${error?.message}`);
    }
  }

  async applySchedule(schedule: Stripe.SubscriptionSchedule) {
    const subscriptionId = idOf(schedule.subscription as never);
    if (!subscriptionId) return;
    const row = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: subscriptionId },
    });
    if (!row) return;
    const active = schedule.status === 'active' || schedule.status === 'not_started';
    const now = Date.now() / 1000;
    const next = active ? schedule.phases.find((phase) => phase.start_date > now) : null;
    if (!next) {
      await this.clearPending(row.organisation_id);
      return;
    }
    let plan: PlanKey | null = null;
    let interval: string | null = null;
    let seats = 0;
    for (const item of next.items) {
      const mapped = this.priceAmounts.planForPrice(idOf(item.price as never));
      if (!mapped) continue;
      if (mapped.seat) seats = item.quantity ?? 0;
      else {
        plan = mapped.plan;
        interval = mapped.interval;
      }
    }
    await this.prisma.subscription.update({
      where: { organisation_id: row.organisation_id },
      data: {
        stripe_schedule_id: schedule.id,
        pending_plan: plan,
        pending_interval: interval,
        pending_extra_seats: seats,
        pending_change_at: fromUnix(next.start_date),
      },
    });
    await this.entitlements.invalidate(row.organisation_id);
  }

  async clearPending(organisationId: string) {
    await this.prisma.subscription.update({
      where: { organisation_id: organisationId },
      data: {
        pending_plan: null,
        pending_interval: null,
        pending_extra_seats: null,
        pending_change_at: null,
        stripe_schedule_id: null,
      },
    });
  }

  // ---------- Invoices ----------

  async upsertInvoice(
    invoice: Stripe.Invoice,
    options: { eventAt?: Date | null; requiresAction?: boolean } = {},
  ) {
    if (!invoice.id) return null;
    const customerId = idOf(invoice.customer as never);
    const subscriptionId = idOf(
      (invoice.parent?.subscription_details?.subscription as never) ?? null,
    );
    const metadata = invoice.metadata ?? {};
    const organisationId = await this.organisationForInvoice(
      metadata.organisation_id,
      subscriptionId,
      customerId,
    );
    if (!organisationId) {
      this.logger.warn(`Invoice ${invoice.id} has no organisation`);
      return null;
    }
    const existing = await this.prisma.billingInvoice.findUnique({ where: { id: invoice.id } });
    if (isStaleUpdate(existing?.stripe_updated_at, options.eventAt ?? null)) return existing;

    const { kind, params } = this.describeInvoice(invoice, metadata, subscriptionId);
    const paymentIntentId =
      existing?.payment_intent_id ??
      (invoice.status === 'paid' && this.stripe.isConfigured()
        ? await this.stripe.invoicePaymentIntentId(invoice.id).catch(() => null)
        : null);

    const data = {
      organisation_id: organisationId,
      user_id: metadata.scope === 'personal' ? (metadata.user_id ?? null) : null,
      stripe_customer_id: customerId ?? '',
      subscription_id: subscriptionId,
      kind,
      params: params as Prisma.InputJsonValue,
      number: invoice.number ?? null,
      status: invoice.status ?? 'draft',
      amount_due_cents: invoice.amount_due ?? 0,
      amount_paid_cents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? 'usd',
      period_start: fromUnix(invoice.period_start),
      period_end: fromUnix(invoice.period_end),
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf_url: invoice.invoice_pdf ?? null,
      payment_intent_id: paymentIntentId,
      requires_action:
        invoice.status === 'paid' || invoice.status === 'void'
          ? false
          : (options.requiresAction ?? existing?.requires_action ?? false),
      attempt_count: invoice.attempt_count ?? 0,
      last_error: invoice.last_finalization_error?.message ?? existing?.last_error ?? null,
      stripe_updated_at: options.eventAt ?? new Date(),
      created_at: fromUnix(invoice.created) ?? new Date(),
      paid_at: fromUnix(invoice.status_transitions?.paid_at),
    };
    return this.prisma.billingInvoice.upsert({
      where: { id: invoice.id },
      create: { id: invoice.id, ...data },
      update: data,
    });
  }

  private describeInvoice(
    invoice: Stripe.Invoice,
    metadata: Stripe.Metadata,
    subscriptionId: string | null,
  ): { kind: BillingInvoiceKind; params: Record<string, unknown> } {
    if (metadata.scope === 'personal' || metadata.scope === 'team')
      return {
        kind:
          metadata.scope === 'personal'
            ? BillingInvoiceKind.TOPUP_PERSONAL
            : BillingInvoiceKind.TOPUP_TEAM,
        params: { pack_id: metadata.pack_id ?? null },
      };
    if (!subscriptionId) return { kind: BillingInvoiceKind.OTHER, params: {} };

    let plan: PlanKey | null = null;
    let interval: string | null = null;
    let seats = 0;
    let onlySeats = true;
    for (const line of invoice.lines?.data ?? []) {
      const priceId = idOf(
        (line as { pricing?: { price_details?: { price?: string | { id: string } } } }).pricing
          ?.price_details?.price as never,
      );
      const mapped = this.priceAmounts.planForPrice(priceId);
      if (!mapped) continue;
      if (mapped.seat) seats = Math.max(seats, line.quantity ?? 0);
      else {
        onlySeats = false;
        plan = mapped.plan;
        interval = mapped.interval;
      }
    }
    return {
      kind:
        onlySeats && seats ? BillingInvoiceKind.SEATS : BillingInvoiceKind.SUBSCRIPTION,
      params: { plan, interval, seats, billing_reason: invoice.billing_reason ?? null },
    };
  }

  private async organisationForInvoice(
    metadataOrganisationId: string | undefined,
    subscriptionId: string | null,
    customerId: string | null,
  ) {
    if (metadataOrganisationId) {
      const exists = await this.prisma.organisation.findUnique({
        where: { id: metadataOrganisationId },
        select: { id: true },
      });
      if (exists) return exists.id;
    }
    const or: Prisma.SubscriptionWhereInput[] = [];
    if (subscriptionId) or.push({ stripe_subscription_id: subscriptionId });
    if (customerId) or.push({ stripe_customer_id: customerId });
    if (!or.length) return null;
    const row = await this.prisma.subscription.findFirst({
      where: { OR: or },
      select: { organisation_id: true },
    });
    return row?.organisation_id ?? null;
  }

  // ---------- Payment method summary ----------

  async refreshPaymentMethod(customerId: string | null) {
    if (!customerId || !this.stripe.isConfigured()) return;
    const rows = await this.prisma.subscription.findMany({
      where: { stripe_customer_id: customerId },
      select: { organisation_id: true },
    });
    if (!rows.length) return;
    try {
      const customer = (await this.stripe.retrieveCustomer(customerId)) as Stripe.Customer;
      if ((customer as unknown as { deleted?: boolean }).deleted) return;
      const method = customer.invoice_settings?.default_payment_method as
        | Stripe.PaymentMethod
        | string
        | null;
      const resolved =
        typeof method === 'string' ? await this.stripe.retrievePaymentMethod(method) : method;
      const card = resolved?.card;
      const summary = card
        ? {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
          }
        : null;
      await this.prisma.subscription.updateMany({
        where: { stripe_customer_id: customerId },
        data: { payment_method: (summary ?? Prisma.JsonNull) as Prisma.InputJsonValue },
      });
    } catch (error) {
      this.logger.warn(`Payment method refresh for ${customerId} failed: ${error?.message}`);
    }
  }

  // ---------- Re-sync / reconcile ----------

  // Re-pulls the subscription and invoices from Stripe. Returns whether the row had drifted.
  async syncOrganisation(organisationId: string, actorKind: ActorKind, actorId?: string) {
    const row = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (!row?.stripe_subscription_id) return { drift: false, synced: false };
    const stripeSub = await this.stripe.retrieveSubscription(row.stripe_subscription_id);
    const { drift } = await this.applySubscription(stripeSub, { actorKind, recordSync: false });
    if (row.stripe_customer_id) {
      const invoices = await this.stripe.listInvoices(row.stripe_customer_id);
      for (const invoice of invoices.data) await this.upsertInvoice(invoice);
      await this.refreshPaymentMethod(row.stripe_customer_id);
    }
    await this.prisma.subscription.update({
      where: { organisation_id: organisationId },
      data: { drift_detected_at: drift ? new Date() : row.drift_detected_at },
    });
    await this.subscriptions.recordEvent({
      organisationId,
      type: SubscriptionEventType.SYNCED,
      actorKind,
      actorId: actorId ?? null,
      data: { drift },
    });
    return { drift, synced: true };
  }

  // Organisation or account deletion cancels the Stripe subscription immediately (prorated) first (§11).
  async cancelForDeletion(organisationId: string) {
    const row = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (
      !row?.stripe_subscription_id ||
      row.status === SubscriptionStatus.CANCELED ||
      !this.stripe.isConfigured()
    )
      return;
    try {
      await this.stripe.cancelSubscription(row.stripe_subscription_id, { prorate: true });
    } catch (error) {
      this.logger.error(
        `Could not cancel Stripe subscription ${row.stripe_subscription_id} of ${organisationId}: ${error?.message}`,
      );
    }
  }
}
