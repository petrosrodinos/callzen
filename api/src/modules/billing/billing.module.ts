import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { BILLING_QUEUE } from '@/core/queues/queues.constants';
import { StripeIntegrationModule } from '@/integrations/stripe/stripe.module';
import { ResendModule } from '@/integrations/notifications/resend/resend.module';
import { UsageModule } from '@/modules/usage/usage.module';
import { EntitlementsService } from './services/entitlements.service';
import { PlanLimitService } from './services/plan-limit.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { CreditsService } from './services/credits.service';
import { PlansCatalogService } from './services/plans-catalog.service';
import { StripePriceAmountsService } from './services/stripe-price-amounts.service';
import { AnalysisVisibilityService } from './services/analysis-visibility.service';
import { BillingAlertsService } from './services/billing-alerts.service';
import { StripeSyncService } from './services/stripe-sync.service';
import { BillingCheckoutService } from './services/billing-checkout.service';
import { BillingAccountService } from './services/billing-account.service';
import { StripeWebhooksService } from './services/stripe-webhooks.service';
import { BillingMaintenanceService } from './services/billing-maintenance.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { PlansController } from './controllers/plans.controller';
import { BillingController } from './controllers/billing.controller';
import { BillingWebhookController } from './controllers/billing-webhook.controller';
import { AdminBillingController } from './controllers/admin-billing.controller';
import {
  BillingJobsScheduler,
  BillingProcessor,
} from './processors/billing.processor';

// Global: entitlements and plan limits are enforced across agents, calls, organisations and coaching.
@Global()
@Module({
  imports: [
    PrismaModule,
    StripeIntegrationModule,
    ResendModule,
    UsageModule,
    BullModule.registerQueue({ name: BILLING_QUEUE }),
  ],
  controllers: [
    PlansController,
    BillingController,
    BillingWebhookController,
    AdminBillingController,
  ],
  providers: [
    EntitlementsService,
    PlanLimitService,
    SubscriptionsService,
    CreditsService,
    PlansCatalogService,
    StripePriceAmountsService,
    AnalysisVisibilityService,
    BillingAlertsService,
    StripeSyncService,
    BillingCheckoutService,
    BillingAccountService,
    StripeWebhooksService,
    BillingMaintenanceService,
    AdminSubscriptionsService,
    BillingProcessor,
    BillingJobsScheduler,
  ],
  exports: [
    AnalysisVisibilityService,
    EntitlementsService,
    PlanLimitService,
    SubscriptionsService,
    CreditsService,
    StripePriceAmountsService,
    StripeSyncService,
  ],
})
export class BillingModule {}
