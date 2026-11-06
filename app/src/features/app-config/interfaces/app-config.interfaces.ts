import type { PlanDefinition, PlanKey } from "@/features/billing/interfaces/billing.interfaces";
import type { ModelUnitPrices, PricingSource } from "@/features/catalog/interfaces/catalog.interfaces";

export const AppConfigCategories = {
    PRICING: "pricing",
    PLANS: "plans",
    ANALYSIS: "analysis",
    AI: "ai",
    COACHING: "coaching",
    BILLING: "billing",
} as const;
export type AppConfigCategory = (typeof AppConfigCategories)[keyof typeof AppConfigCategories];

export const AppConfigKeys = {
    MARKUP_PERCENT: "pricing.markup_percent",
    MODEL_OVERRIDES: "pricing.model_overrides",
    AUDIO_TOKENS_PER_MINUTE: "pricing.audio_tokens_per_minute",
    PRICING_SYNC: "pricing.sync",
    PLAN_DEFINITIONS: "plans.definitions",
    STRIPE_PRICES: "plans.stripe_prices",
    TOPUP_PACKS: "plans.topup_packs",
    ANALYSIS_VISIBILITY: "analysis.visibility",
    DEFAULT_MODELS: "ai.default_models",
    COACHING_DIGEST: "coaching.digest",
    COACHING_INACTIVE_DAYS: "coaching.inactive_days",
    PAST_DUE_GRACE_DAYS: "billing.past_due_grace_days",
} as const;
export type AppConfigKey = (typeof AppConfigKeys)[keyof typeof AppConfigKeys];

export interface AppConfigEntry<T = unknown> {
    key: string;
    category: AppConfigCategory;
    description: string;
    public: boolean;
    value: T;
    default: T;
    // 0 = never stored; the default is served.
    version: number;
    invalid: boolean;
    validation_error: string | null;
    updated_at: string | null;
    updated_by: { id: string; name: string } | null;
}

export interface AppConfigHistoryEntry {
    id: string;
    key: string;
    old_value: unknown;
    new_value: unknown;
    changed_by: { id: string; name: string | null } | null;
    created_at: string;
}

export interface UpdateAppConfigDto {
    key: string;
    value: unknown;
    version: number;
}

export type PlanDefinitionsValue = Record<PlanKey, PlanDefinition>;
export type AnalysisVisibilityValue = Record<PlanKey, Record<string, boolean>>;
export type ModelOverridesValue = Record<string, ModelUnitPrices>;

export interface ResolvedModelPrice {
    model_id: string;
    source: PricingSource;
    resolved_from: string | null;
    unit_prices: ModelUnitPrices;
    is_reasoning: boolean | null;
    fetched_at: string | null;
    stale: boolean;
}

export interface PricingOverview {
    markup_percent: number;
    prices: ResolvedModelPrice[];
    unpriced_models: { model_id: string; events: number; last_seen_at: string | null }[];
    sync: {
        last_attempt_at: string | null;
        last_success_at: string | null;
        last_error: string | null;
        synced_models: number;
        unpriced_models: string[];
        running: boolean;
    };
    last_fetched_at: string | null;
    snapshot_is_old: boolean;
}
