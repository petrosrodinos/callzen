export const SuggestionFrequencies = {
    OBJECTIONS_ONLY: "OBJECTIONS_ONLY",
    BALANCED: "BALANCED",
    CONSTANT: "CONSTANT",
} as const;
export type SuggestionFrequency = (typeof SuggestionFrequencies)[keyof typeof SuggestionFrequencies];

export const SuggestionLengths = {
    SHORT: "SHORT",
    MEDIUM: "MEDIUM",
} as const;
export type SuggestionLength = (typeof SuggestionLengths)[keyof typeof SuggestionLengths];

export const ScriptStageTypes = {
    OPENER: "OPENER",
    PITCH: "PITCH",
    DISCOVERY: "DISCOVERY",
    OBJECTION_HANDLING: "OBJECTION_HANDLING",
    CLOSE: "CLOSE",
    OTHER: "OTHER",
} as const;
export type ScriptStageType = (typeof ScriptStageTypes)[keyof typeof ScriptStageTypes];

export const Methodologies = {
    SPIN: "SPIN",
    BANT: "BANT",
    MEDDIC: "MEDDIC",
    CHALLENGER: "CHALLENGER",
    SANDLER: "SANDLER",
    CUSTOM: "CUSTOM",
} as const;
export type Methodology = (typeof Methodologies)[keyof typeof Methodologies];

export const Tones = {
    PROFESSIONAL: "PROFESSIONAL",
    FRIENDLY: "FRIENDLY",
    CONSULTATIVE: "CONSULTATIVE",
    ASSERTIVE: "ASSERTIVE",
} as const;
export type Tone = (typeof Tones)[keyof typeof Tones];

export interface ScriptStage {
    id: string;
    stage: string;
    title: string;
    content: string;
}

export interface ObjectionEntry {
    id: string;
    objection: string;
    response: string;
}

export interface AnalysisCriterion {
    key: string;
    label: string;
    weight: number;
    description?: string;
}

export interface AssistantAgentStats {
    calls_count: number;
    live_calls_count: number;
    practice_calls_count: number;
    average_score: number | null;
    trend: number | null;
    last_used_at: string | null;
}

export interface AssistantAgent {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    call_goal: string | null;
    script: ScriptStage[];
    instructions: string | null;
    knowledge: string | null;
    objection_library: ObjectionEntry[];
    methodology: string | null;
    language: string;
    languages: string[];
    tone: string;
    suggestion_frequency: SuggestionFrequency;
    suggestion_length: SuggestionLength;
    alternatives_count: number;
    realtime_model: string;
    analysis_model: string;
    analysis_criteria: AnalysisCriterion[];
    consent_line: string | null;
    suggest_consent_line: boolean;
    template_key: string | null;
    is_default: boolean;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    stats?: AssistantAgentStats;
}

export interface AssistantAgentQuery {
    search?: string;
    status?: "active" | "archived" | "all";
}

export type CreateAssistantAgentDto = Partial<
    Omit<AssistantAgent, "id" | "user_id" | "created_at" | "updated_at" | "archived_at" | "stats">
> & { name: string };

export type UpdateAssistantAgentDto = Partial<CreateAssistantAgentDto>;
