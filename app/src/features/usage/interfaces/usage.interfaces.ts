export const UsageKinds = {
    SUGGESTION: "SUGGESTION",
    ASK: "ASK",
    ANALYSIS: "ANALYSIS",
    PRACTICE_TURN: "PRACTICE_TURN",
    PRACTICE_VOICE: "PRACTICE_VOICE",
    TRANSCRIPTION: "TRANSCRIPTION",
    GENERATION: "GENERATION",
} as const;
export type UsageKind = (typeof UsageKinds)[keyof typeof UsageKinds];

export interface UsageSession {
    id: string;
    title: string | null;
    kind: "LIVE" | "PRACTICE";
    call_type: string;
    started_at: string;
    duration_seconds: number;
    owner: { id: string; name: string; is_you: boolean };
}

export interface UsageCostBreakdown {
    // Charged (with markup) and base provider cost, USD. Platform admins only.
    estimated_cost_usd: number;
    base_cost_usd: number;
    by_kind: { kind: UsageKind; count: number; cost_usd: number; base_cost_usd: number }[];
    by_model: { model: string; count: number; input_tokens: number; output_tokens: number; cost_usd: number; base_cost_usd: number }[];
    cost_per_session: {
        average_usd: number;
        sessions: { call_id: string; charged_usd: number; base_usd: number }[];
    };
}

// Minutes and counts for everyone; cost fields are only present for platform admins (§6.2a).
export interface UsageSummary extends Partial<UsageCostBreakdown> {
    period_days: number;
    live_minutes: number;
    practice_minutes: number;
    calls_count: number;
    analyses_count: number;
    suggestions_count: number;
    average_session_minutes: number;
    sessions: UsageSession[];
}
