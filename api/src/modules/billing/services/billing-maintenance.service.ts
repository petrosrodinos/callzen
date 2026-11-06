import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from './subscriptions.service';
import { StripeSyncService } from './stripe-sync.service';
import { BillingAlertKinds, BillingAlertsService } from './billing-alerts.service';

const TRIAL_ENDING_DAYS = 3;
const BATCH = 200;

// Daily: persists what EntitlementsService already enforces on read (expired trials and manual plans,
// past-due beyond grace) and sends trial-ending alerts. Nightly: reconciles Stripe with our rows (§11a).
@Injectable()
export class BillingMaintenanceService {
  private readonly logger = new Logger(BillingMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly stripe: StripeBillingService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly sync: StripeSyncService,
    private readonly alerts: BillingAlertsService,
  ) {}

  async runDaily(now: Date = new Date()) {
    const results = {
      trials_ended: await this.endTrials(now),
      manual_expired: await this.expireManualPlans(now),
      past_due_canceled: await this.cancelPastDue(now),
      trial_ending_alerts: await this.alertTrialsEnding(now),
    };
    this.logger.log(`Billing maintenance: ${JSON.stringify(results)}`);
    return results;
  }

  private async endTrials(now: Date) {
    // Stripe-managed trials end through Stripe; only our own (MANUAL) trials are closed here.
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        source: SubscriptionSource.MANUAL,
        trial_ends_at: { lte: now },
      },
      take: BATCH,
    });
    for (const row of expired) {
      await this.cancelRow(row.organisation_id, row.plan, SubscriptionEventType.TRIAL_ENDED);
    }
    return expired.length;
  }

  private async expireManualPlans(now: Date) {
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        source: SubscriptionSource.MANUAL,
        current_period_end: { lte: now },
      },
      take: BATCH,
    });
    for (const row of expired)
      await this.cancelRow(row.organisation_id, row.plan, SubscriptionEventType.CANCELED);
    return expired.length;
  }

  private async cancelPastDue(now: Date) {
    const graceDays = this.appConfig.get('billing.past_due_grace_days');
    const cutoff = DateTime.fromJSDate(now).minus({ days: graceDays }).toJSDate();
    const overdue = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE, past_due_since: { lte: cutoff } },
      take: BATCH,
    });
    for (const row of overdue) {
      // Stripe keeps retrying per its dunning settings; our side becomes read-only after the grace period.
      if (row.stripe_subscription_id && this.stripe.isConfigured())
        await this.stripe
          .cancelSubscription(row.stripe_subscription_id, { prorate: false })
          .catch((error) =>
            this.logger.warn(`Cancel past-due ${row.stripe_subscription_id} failed: ${error?.message}`),
          );
      await this.cancelRow(row.organisation_id, row.plan, SubscriptionEventType.CANCELED, {
        reason: 'past_due_grace_expired',
      });
    }
    return overdue.length;
  }

  private async alertTrialsEnding(now: Date) {
    const soon = DateTime.fromJSDate(now).plus({ days: TRIAL_ENDING_DAYS }).toJSDate();
    const ending = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        source: SubscriptionSource.MANUAL,
        trial_ends_at: { gt: now, lte: soon },
      },
      take: BATCH,
    });
    for (const row of ending) {
      const dedupeKey = `trial-ending:${row.id}:${row.trial_ends_at.toISOString().slice(0, 10)}`;
      // The dedupe key makes the alert (and its email) go out once per trial end date.
      const already = await this.prisma.notification.findFirst({ where: { dedupe_key: dedupeKey } });
      if (already) continue;
      await this.alerts.alert(
        row.organisation_id,
        BillingAlertKinds.TRIAL_ENDING,
        { trial_ends_at: row.trial_ends_at.toISOString() },
        dedupeKey,
      );
    }
    return ending.length;
  }

  private async cancelRow(
    organisationId: string,
    plan: Parameters<SubscriptionsService['recordEvent']>[0]['fromPlan'],
    type: SubscriptionEventType,
    data: Record<string, unknown> = {},
  ) {
    await this.prisma.subscription.update({
      where: { organisation_id: organisationId },
      data: { status: SubscriptionStatus.CANCELED, canceled_at: new Date(), cancel_at_period_end: false },
    });
    await this.subscriptions.recordEvent({
      organisationId,
      type,
      fromPlan: plan,
      toPlan: null,
      actorKind: 'SYSTEM',
      data,
    });
    await this.alerts.alert(organisationId, BillingAlertKinds.PLAN_CANCELED, { plan });
    await this.entitlements.invalidate(organisationId);
  }

  // Nightly safety net for missed webhooks (§11a).
  async reconcile() {
    if (!this.stripe.isConfigured()) return { checked: 0, drifted: 0 };
    let cursor: string | undefined;
    let checked = 0;
    let drifted = 0;
    for (;;) {
      const rows = await this.prisma.subscription.findMany({
        where: { stripe_subscription_id: { not: null }, status: { not: SubscriptionStatus.CANCELED } },
        orderBy: { id: 'asc' },
        take: BATCH,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });
      if (!rows.length) break;
      for (const row of rows) {
        checked += 1;
        try {
          const stripeSub = await this.stripe.retrieveSubscription(row.stripe_subscription_id);
          const { drift } = await this.sync.applySubscription(stripeSub, {
            actorKind: 'SYSTEM',
            recordSync: true,
          });
          if (drift) {
            drifted += 1;
            await this.prisma.subscription.update({
              where: { organisation_id: row.organisation_id },
              data: { drift_detected_at: new Date() },
            });
          }
        } catch (error) {
          this.logger.warn(`Reconcile ${row.stripe_subscription_id} failed: ${error?.message}`);
        }
      }
      cursor = rows.at(-1).id;
    }
    this.logger.log(`Billing reconcile: ${checked} checked, ${drifted} fixed`);
    return { checked, drifted };
  }
}
