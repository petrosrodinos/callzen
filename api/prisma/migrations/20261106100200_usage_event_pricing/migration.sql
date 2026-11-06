-- AlterTable
ALTER TABLE "usage_events" ADD COLUMN     "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "charged_cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "markup_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pricing_source" "PricingSource",
ADD COLUMN     "reasoning_tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit_prices" JSONB;

-- CreateIndex
CREATE INDEX "usage_events_call_id_idx" ON "usage_events"("call_id");

-- Backfill: historical events were estimates without markup.
UPDATE "usage_events" SET "charged_cost_usd" = "cost_usd", "markup_percent" = 0;
