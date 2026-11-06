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
    // 1 (cheapest) to 4, derived from the synced models.dev price; null when unpriced.
    relative_cost: number | null;
    languages: string;
    is_reasoning: boolean;
    realtime_suitable: boolean;
    description: string;
    // USD per 1M tokens (platform admins only).
    prices: ModelUnitPrices;
    pricing_source: PricingSource;
}

export const PricingSources = {
    MODELS_DEV: "MODELS_DEV",
    MODELS_DEV_ALIAS: "MODELS_DEV_ALIAS",
    ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
    UNPRICED: "UNPRICED",
} as const;
export type PricingSource = (typeof PricingSources)[keyof typeof PricingSources];

export interface ModelUnitPrices {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
    input_audio?: number;
    output_audio?: number;
    per_minute?: number;
}

export interface AudioModel {
    id: string;
    label: string;
    uses: ("voice" | "transcription" | "upload_transcription")[];
    supports_diarization: boolean;
    shutdown_at: string | null;
    prices: ModelUnitPrices;
    pricing_source: PricingSource;
    estimated_cost_per_minute_usd: number;
}

export interface DefaultModels {
    realtime: string;
    analysis: string;
    utility: string;
    voice: string;
    transcription: string;
    upload_transcription: string;
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
    // Model choice and prices are internal: only present for platform admins (§6.3).
    ai_models?: AiModel[];
    audio_models?: AudioModel[];
    recommended_realtime_model?: string;
    recommended_analysis_model?: string;
    default_models?: DefaultModels;
    // Users only get OpenAI Realtime; browser voice is listed for platform admins only (§6.4).
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
