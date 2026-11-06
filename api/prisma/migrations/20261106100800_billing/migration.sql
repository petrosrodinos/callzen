-- CreateEnum
CREATE TYPE "BillingInvoiceKind" AS ENUM ('SUBSCRIPTION', 'SEATS', 'TOPUP_TEAM', 'TOPUP_PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('STARTED', 'PLAN_CHANGED', 'CHANGE_SCHEDULED', 'CHANGE_CANCELED', 'SEATS_CHANGED', 'CANCEL_SCHEDULED', 'CANCEL_REVOKED', 'CANCELED', 'REACTIVATED', 'TRIAL_STARTED', 'TRIAL_ENDED', 'TRIAL_EXTENDED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'REFUNDED', 'CREDITS_GRANTED', 'MANUAL_ASSIGNED', 'DISCOUNT_APPLIED', 'SYNCED');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN     "drift_detected_at" TIMESTAMP(3),
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "payment_method" JSONB,
ADD COLUMN     "pending_change_at" TIMESTAMP(3),
ADD COLUMN     "pending_extra_seats" INTEGER,
ADD COLUMN     "pending_interval" TEXT,
ADD COLUMN     "pending_plan" "PlanKey",
ADD COLUMN     "stripe_schedule_id" TEXT,
ADD COLUMN     "unit_amount_cents" INTEGER;

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT,
    "stripe_customer_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "kind" "BillingInvoiceKind" NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "number" TEXT,
    "status" TEXT NOT NULL,
    "amount_due_cents" INTEGER NOT NULL,
    "amount_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "amount_refunded_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "hosted_invoice_url" TEXT,
    "invoice_pdf_url" TEXT,
    "payment_intent_id" TEXT,
    "charge_id" TEXT,
    "requires_action" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "stripe_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "type" "SubscriptionEventType" NOT NULL,
    "from_plan" "PlanKey",
    "to_plan" "PlanKey",
    "actor_kind" TEXT NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_invoices_organisation_id_created_at_idx" ON "billing_invoices"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_invoices_user_id_created_at_idx" ON "billing_invoices"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices"("status");

-- CreateIndex
CREATE INDEX "billing_invoices_charge_id_idx" ON "billing_invoices"("charge_id");

-- CreateIndex
CREATE INDEX "subscription_events_organisation_id_created_at_idx" ON "subscription_events"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "subscription_events_type_created_at_idx" ON "subscription_events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
