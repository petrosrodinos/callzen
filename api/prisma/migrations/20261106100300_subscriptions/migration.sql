-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('TRIAL', 'STARTER', 'PRO', 'COACH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('STRIPE', 'MANUAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "trial_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "max_duration_seconds" INTEGER,
ADD COLUMN     "counted_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "personal_credit_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usage_settled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "calls_organisation_id_kind_started_at_idx" ON "calls"("organisation_id", "kind", "started_at");

-- Backfill: finished historical calls count their exact seconds (calls under 5 s never count).
UPDATE "calls"
SET "counted_seconds" = CASE WHEN "duration_seconds" >= 5 THEN "duration_seconds" ELSE 0 END,
    "usage_settled_at" = NOW()
WHERE "status" <> 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "plan" "PlanKey" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "source" "SubscriptionSource" NOT NULL DEFAULT 'STRIPE',
    "billing_interval" TEXT,
    "extra_seats" INTEGER NOT NULL DEFAULT 0,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "past_due_since" TIMESTAMP(3),
    "manual_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_credits" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT,
    "pack_id" TEXT,
    "live_seconds_granted" INTEGER NOT NULL DEFAULT 0,
    "practice_seconds_granted" INTEGER NOT NULL DEFAULT 0,
    "live_seconds_remaining" INTEGER NOT NULL DEFAULT 0,
    "practice_seconds_remaining" INTEGER NOT NULL DEFAULT 0,
    "stripe_payment_id" TEXT,
    "granted_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_credit_consumptions" (
    "id" TEXT NOT NULL,
    "credit_id" TEXT NOT NULL,
    "call_id" TEXT,
    "live_seconds" INTEGER NOT NULL DEFAULT 0,
    "practice_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_credit_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organisation_id_key" ON "subscriptions"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_status_idx" ON "subscriptions"("plan", "status");

-- CreateIndex
CREATE UNIQUE INDEX "usage_credits_stripe_payment_id_key" ON "usage_credits"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "usage_credits_organisation_id_created_at_idx" ON "usage_credits"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_credits_organisation_id_user_id_idx" ON "usage_credits"("organisation_id", "user_id");

-- CreateIndex
CREATE INDEX "usage_credit_consumptions_credit_id_idx" ON "usage_credit_consumptions"("credit_id");

-- CreateIndex
CREATE INDEX "usage_credit_consumptions_call_id_idx" ON "usage_credit_consumptions"("call_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credits" ADD CONSTRAINT "usage_credits_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credits" ADD CONSTRAINT "usage_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_consumptions" ADD CONSTRAINT "usage_credit_consumptions_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "usage_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
