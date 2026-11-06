import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  Prisma,
  SubscriptionEventType,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { CreditsService } from './credits.service';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from './subscriptions.service';
import { StripeSyncService } from './stripe-sync.service';
import { BillingAlertKinds, BillingAlertsService } from './billing-alerts.service';
import { fromUnix } from '../utils/stripe-billing.utils';

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  !value ? null : typeof value === 'string' ? value : value.id;

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

// Stripe webhooks (§11, §11a). Idempotent: each event id is claimed in stripe_events before it is handled,
// so a replayed event is a no-op; a failed handler releases the claim so Stripe's retry runs it again.
@Injectable()
export class StripeWebhooksService {
  private readonly logger = new Logger(StripeWebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeBillingService,
    private readonly sync: StripeSyncService,
    private readonly credits: CreditsService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly alerts: BillingAlertsService,
  ) {}

  async receive(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !signature) throw new BadRequestException('Missing Stripe signature');
    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      throw new BadRequestException(`Invalid Stripe signature: ${error?.message}`);
    }

    try {
      await this.prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch (error) {
      if (isUniqueViolation(error)) return { received: true, duplicate: true };
      throw error;
    }

    try {
      await this.handle(event);
    } catch (error) {
      this.logger.error(`Stripe event ${event.type} ${event.id} failed: ${error?.message}`);
      await this.prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
      throw error;
    }
    return { received: true };
  }

  async handle(event: Stripe.Event) {
    const eventAt = fromUnix(event.created);
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.sync.applySubscription(event.data.object as Stripe.Subscription, { eventAt });
        return;
      case 'customer.subscription.deleted':
        await this.sync.markCanceled(event.data.object as Stripe.Subscription, eventAt);
        return;
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription;
        const row = await this.rowForSubscription(sub.id);
        if (row)
          await this.alerts.alert(
            row.organisation_id,
            BillingAlertKinds.TRIAL_ENDING,
            { trial_ends_at: fromUnix(sub.trial_end)?.toISOString() ?? null },
            `trial-ending:${sub.id}`,
          );
        return;
      }

      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.updated':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible':
        await this.sync.upsertInvoice(event.data.object as Stripe.Invoice, { eventAt });
        return;
      case 'invoice.paid':
        return this.onInvoicePaid(event.data.object as Stripe.Invoice, eventAt);
      case 'invoice.payment_failed':
        return this.onInvoiceFailed(event.data.object as Stripe.Invoice, eventAt);
      case 'invoice.payment_action_required': {
        const saved = await this.sync.upsertInvoice(event.data.object as Stripe.Invoice, {
          eventAt,
          requiresAction: true,
        });
        if (saved)
          await this.alerts.alert(
            saved.organisation_id,
            BillingAlertKinds.PAYMENT_ACTION_REQUIRED,
            { invoice_id: saved.id },
            `action-required:${saved.id}`,
          );
        return;
      }

      case 'subscription_schedule.created':
      case 'subscription_schedule.updated':
      case 'subscription_schedule.completed':
      case 'subscription_schedule.released':
      case 'subscription_schedule.canceled':
        await this.sync.applySchedule(event.data.object as Stripe.SubscriptionSchedule);
        return;

      case 'customer.updated':
        await this.sync.refreshPaymentMethod((event.data.object as Stripe.Customer).id);
        return;
      case 'payment_method.attached':
      case 'payment_method.updated':
      case 'payment_method.automatically_updated':
      case 'payment_method.detached': {
        const method = event.data.object as Stripe.PaymentMethod;
        const previous = (event.data.previous_attributes ?? {}) as { customer?: string };
        await this.sync.refreshPaymentMethod(idOf(method.customer as never) ?? previous.customer ?? null);
        return;
      }

      case 'charge.refunded':
        return this.onChargeRefunded(event.data.object as Stripe.Charge);
      default:
        return;
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    if (session.mode === 'subscription') {
      const subscriptionId = idOf(session.subscription as never);
      if (!subscriptionId) return;
      const stripeSub = await this.stripe.retrieveSubscription(subscriptionId);
      if (!stripeSub.metadata?.organisation_id && metadata.organisation_id)
        stripeSub.metadata = { ...stripeSub.metadata, organisation_id: metadata.organisation_id };
      // A MANUAL subscription switches to STRIPE on the same row (Phase 7 step 4).
      await this.sync.applySubscription(stripeSub, { actorKind: 'USER' });
      await this.sync.refreshPaymentMethod(idOf(session.customer as never));
      return;
    }

    if (session.mode !== 'payment' || session.payment_status !== 'paid') return;
    if (metadata.scope !== 'personal' && metadata.scope !== 'team') return;
    const paymentIntentId = idOf(session.payment_intent as never);
    if (!paymentIntentId || !metadata.organisation_id) return;
    try {
      await this.credits.grant({
        organisationId: metadata.organisation_id,
        userId: metadata.scope === 'personal' ? metadata.user_id : null,
        liveMinutes: Number(metadata.live_minutes ?? 0),
        practiceMinutes: Number(metadata.practice_minutes ?? 0),
        packId: metadata.pack_id ?? null,
        stripePaymentId: paymentIntentId,
        note: `Top-up (${metadata.scope})`,
      });
    } catch (error) {
      // stripe_payment_id is unique: a replayed purchase can never grant twice.
      if (!isUniqueViolation(error)) throw error;
    }
  }

  private async onInvoicePaid(invoice: Stripe.Invoice, eventAt: Date | null) {
    const saved = await this.sync.upsertInvoice(invoice, { eventAt });
    if (!saved?.subscription_id) return;
    const row = await this.rowForSubscription(saved.subscription_id);
    if (!row) return;
    if (row.status === SubscriptionStatus.PAST_DUE)
      await this.prisma.subscription.update({
        where: { organisation_id: row.organisation_id },
        data: { status: SubscriptionStatus.ACTIVE, past_due_since: null },
      });
    await this.subscriptions.recordEvent({
      organisationId: row.organisation_id,
      type: SubscriptionEventType.PAYMENT_SUCCEEDED,
      fromPlan: row.plan,
      toPlan: row.plan,
      actorKind: 'STRIPE',
      data: { invoice_id: saved.id, amount_cents: saved.amount_paid_cents },
    });
    await this.entitlements.invalidate(row.organisation_id);
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice, eventAt: Date | null) {
    const saved = await this.sync.upsertInvoice(invoice, { eventAt });
    if (!saved) return;
    if (saved.subscription_id) {
      const row = await this.rowForSubscription(saved.subscription_id);
      if (row && row.status !== SubscriptionStatus.CANCELED)
        await this.prisma.subscription.update({
          where: { organisation_id: row.organisation_id },
          data: {
            status: SubscriptionStatus.PAST_DUE,
            past_due_since: row.past_due_since ?? new Date(),
          },
        });
    }
    await this.subscriptions.recordEvent({
      organisationId: saved.organisation_id,
      type: SubscriptionEventType.PAYMENT_FAILED,
      actorKind: 'STRIPE',
      data: { invoice_id: saved.id, attempt_count: saved.attempt_count, amount_cents: saved.amount_due_cents },
    });
    // Personal top-up failures concern only the buyer; plan alerts go to the owners.
    if (saved.kind !== 'TOPUP_PERSONAL')
      await this.alerts.alert(
        saved.organisation_id,
        BillingAlertKinds.PAYMENT_FAILED,
        { invoice_id: saved.id },
        `payment-failed:${saved.id}`,
      );
    await this.entitlements.invalidate(saved.organisation_id);
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId = idOf(charge.payment_intent as never);
    if (!paymentIntentId) return;
    const invoice = await this.prisma.billingInvoice.findFirst({
      where: { payment_intent_id: paymentIntentId },
    });
    if (invoice)
      await this.prisma.billingInvoice.update({
        where: { id: invoice.id },
        data: { amount_refunded_cents: charge.amount_refunded ?? 0 },
      });
    // Remaining minutes of a refunded top-up are zeroed; used minutes are not clawed back (§14).
    const credit = await this.credits.zeroCreditForPayment(paymentIntentId);
    const organisationId = invoice?.organisation_id ?? credit?.organisation_id;
    if (!organisationId) return;
    await this.subscriptions.recordEvent({
      organisationId,
      type: SubscriptionEventType.REFUNDED,
      actorKind: 'STRIPE',
      data: {
        invoice_id: invoice?.id ?? null,
        amount_refunded_cents: charge.amount_refunded ?? 0,
        credit_zeroed: !!credit,
      },
    });
  }

  private rowForSubscription(stripeSubscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: stripeSubscriptionId },
    });
  }
}
