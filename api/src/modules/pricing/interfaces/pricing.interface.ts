import { PricingSource } from 'generated/prisma';

// USD per 1M tokens, except per_minute (USD per audio minute, for models billed by duration).
export interface UnitPrices {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  reasoning?: number;
  input_audio?: number;
  output_audio?: number;
  per_minute?: number;
}

export interface ResolvedPrice {
  model_id: string;
  source: PricingSource;
  // e.g. "vercel/openai/gpt-4o-transcribe" for aliases, "admin" for overrides.
  resolved_from: string | null;
  unit_prices: UnitPrices;
  // From models.dev when known; null = unknown (callers fall back to the curated catalog).
  is_reasoning: boolean | null;
  fetched_at: Date | null;
  stale: boolean;
}

export interface CostEstimate {
  baseCostUsd: number;
  unitPrices: UnitPrices;
  source: PricingSource;
}

export interface TokenUsageInput {
  model: string;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  reasoningTokens?: number;
}

export interface AudioUsageInput {
  model: string;
  inputSeconds: number;
  outputSeconds?: number;
}

export interface AudioTokensPerMinute {
  input: number;
  output: number;
}

export interface PricingSyncStatus {
  last_attempt_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  synced_models: number;
  unpriced_models: string[];
  running: boolean;
}
