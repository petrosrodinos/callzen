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

export interface UsageSummary {
    period_days: number;
    live_minutes: number;
    practice_minutes: number;
    calls_count: number;
    analyses_count: number;
    suggestions_count: number;
    estimated_cost_usd: number;
    by_kind: { kind: UsageKind; count: number; cost_usd: number }[];
    by_model: { model: string; count: number; input_tokens: number; output_tokens: number; cost_usd: number }[];
}
