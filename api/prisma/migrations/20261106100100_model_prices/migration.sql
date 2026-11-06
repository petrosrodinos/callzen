-- CreateEnum
CREATE TYPE "PricingSource" AS ENUM ('MODELS_DEV', 'MODELS_DEV_ALIAS', 'ADMIN_OVERRIDE', 'UNPRICED');

-- CreateTable
CREATE TABLE "model_prices" (
    "model_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source" "PricingSource" NOT NULL,
    "resolved_from" TEXT,
    "cost" JSONB NOT NULL,
    "is_reasoning" BOOLEAN NOT NULL DEFAULT false,
    "modalities" JSONB NOT NULL DEFAULT '{}',
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_prices_pkey" PRIMARY KEY ("model_id")
);
