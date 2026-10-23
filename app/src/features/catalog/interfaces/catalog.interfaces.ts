import type { ObjectionEntry, ScriptStage, AnalysisCriterion, SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import type { PracticeAgentFields } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const AiModelSpeeds = {
    FASTEST: "FASTEST",
    FAST: "FAST",
    BALANCED: "BALANCED",
    THOROUGH: "THOROUGH",
} as const;
export type AiModelSpeed = (typeof AiModelSpeeds)[keyof typeof AiModelSpeeds];

export const VoiceProviders = {
    OPENAI_REALTIME: "OPENAI_REALTIME",
    BROWSER: "BROWSER",
} as const;
export type VoiceProvider = (typeof VoiceProviders)[keyof typeof VoiceProviders];

export interface AiModel {
    id: string;
    provider: string;
    label: string;
    speed: AiModelSpeed;
    quality: number;
    relative_cost: number;
    languages: string;
    is_reasoning: boolean;
    realtime_suitable: boolean;
    description: string;
    input_per_million: number;
    output_per_million: number;
}

export interface VoiceOption {
    id: string;
    label: string;
    gender: "female" | "male" | "neutral";
    style: string;
}

export interface VoiceProviderInfo {
    id: VoiceProvider;
    label: string;
    recommended: boolean;
    realism: number;
    latency: string;
    cost_per_minute_usd: number;
    languages: string;
    supports_interruptions: boolean;
    description: string;
    voices: VoiceOption[];
}

export interface AssistantAgentTemplate {
    key: string;
    name: string;
    description: string;
    call_goal: string;
    methodology: string | null;
    tone: string;
    suggestion_frequency: SuggestionFrequency;
    instructions: string;
    knowledge: string;
    script: ScriptStage[];
    objection_library: ObjectionEntry[];
    analysis_criteria: AnalysisCriterion[];
}

export interface PracticeAgentTemplate extends PracticeAgentFields {
    key: string;
    description: string;
}

export interface Language {
    code: string;
    name: string;
}

export interface DataProcessor {
    name: string;
    purpose: string;
    region: string;
}

export interface Catalog {
    ai_configured: boolean;
    ai_models: AiModel[];
    recommended_realtime_model: string;
    recommended_analysis_model: string;
    voice_providers: VoiceProviderInfo[];
    assistant_templates: AssistantAgentTemplate[];
    practice_templates: PracticeAgentTemplate[];
    default_analysis_criteria: AnalysisCriterion[];
    default_consent_line: string;
    template_language: string;
    languages: Language[];
    max_conversation_languages: number;
    data_processors: DataProcessor[];
}
