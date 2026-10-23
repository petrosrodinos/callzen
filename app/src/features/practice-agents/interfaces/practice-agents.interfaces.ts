import type { VoiceProvider } from "@/features/catalog/interfaces/catalog.interfaces";

export const LeadTemperatures = {
    COLD: "COLD",
    WARM: "WARM",
} as const;
export type LeadTemperature = (typeof LeadTemperatures)[keyof typeof LeadTemperatures];

export const PersonalityTypes = {
    ANALYTICAL: "ANALYTICAL",
    DRIVER: "DRIVER",
    AMIABLE: "AMIABLE",
    EXPRESSIVE: "EXPRESSIVE",
    SKEPTICAL: "SKEPTICAL",
    INDECISIVE: "INDECISIVE",
} as const;
export type PersonalityType = (typeof PersonalityTypes)[keyof typeof PersonalityTypes];

export const MoodTypes = {
    NEUTRAL: "NEUTRAL",
    RUSHED: "RUSHED",
    IRRITATED: "IRRITATED",
    CURIOUS: "CURIOUS",
    DISTRACTED: "DISTRACTED",
    ENTHUSIASTIC: "ENTHUSIASTIC",
} as const;
export type MoodType = (typeof MoodTypes)[keyof typeof MoodTypes];

export const DecisionAuthorityTypes = {
    DECISION_MAKER: "DECISION_MAKER",
    INFLUENCER: "INFLUENCER",
    GATEKEEPER: "GATEKEEPER",
    NEEDS_APPROVAL: "NEEDS_APPROVAL",
} as const;
export type DecisionAuthorityType = (typeof DecisionAuthorityTypes)[keyof typeof DecisionAuthorityTypes];

export const BudgetTypes = {
    NO_BUDGET: "NO_BUDGET",
    LIMITED: "LIMITED",
    BUDGET_AVAILABLE: "BUDGET_AVAILABLE",
    PRICE_SENSITIVE: "PRICE_SENSITIVE",
} as const;
export type BudgetType = (typeof BudgetTypes)[keyof typeof BudgetTypes];

export const TimelineTypes = {
    URGENT: "URGENT",
    WITHIN_3_MONTHS: "WITHIN_3_MONTHS",
    JUST_RESEARCHING: "JUST_RESEARCHING",
    NO_TIMELINE: "NO_TIMELINE",
} as const;
export type TimelineType = (typeof TimelineTypes)[keyof typeof TimelineTypes];

export const ScenarioTypes = {
    COLD_CALL: "COLD_CALL",
    INBOUND: "INBOUND",
    FOLLOW_UP: "FOLLOW_UP",
    DEMO_FOLLOW_UP: "DEMO_FOLLOW_UP",
    DISCOVERY: "DISCOVERY",
    RENEWAL: "RENEWAL",
    NEGOTIATION: "NEGOTIATION",
    GATEKEEPER: "GATEKEEPER",
} as const;
export type ScenarioType = (typeof ScenarioTypes)[keyof typeof ScenarioTypes];

export interface PracticeObjection {
    text: string;
    persistence: number;
}

export interface PracticeAgentFields {
    name: string;
    prospect_name: string | null;
    role_prompt: string;
    scenario_context: string | null;
    scenario_type: string;
    selling_product: string | null;
    user_objective: string | null;
    lead_temperature: LeadTemperature;
    difficulty: number;
    personality: string | null;
    mood: string | null;
    communication_style: string | null;
    decision_authority: string | null;
    budget: string | null;
    timeline: string | null;
    current_solution: string | null;
    pain_points: string[];
    objections: PracticeObjection[];
    hidden_information: string[];
    conversion_conditions: string[];
    patience: number;
    language: string;
    accent: string | null;
    industry: string | null;
    company: string | null;
    job_title: string | null;
    age_range: string | null;
    background_story: string | null;
    briefing: string | null;
    voice: string;
}

export interface PracticeAgentStats {
    sessions_count: number;
    best_score: number | null;
    last_score: number | null;
    objective_rate: number | null;
    last_practiced_at: string | null;
}

export interface PracticeAgent extends PracticeAgentFields {
    id: string;
    user_id: string;
    linked_assistant_agent_id: string | null;
    voice_provider: VoiceProvider;
    time_limit_minutes: number | null;
    source_call_id: string | null;
    template_key: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
    stats?: PracticeAgentStats;
}

export interface PracticeAgentQuery {
    search?: string;
    status?: "active" | "archived" | "all";
    lead_temperature?: LeadTemperature;
    difficulty?: number;
}

export type CreatePracticeAgentDto = Partial<
    Omit<PracticeAgent, "id" | "user_id" | "created_at" | "updated_at" | "archived_at" | "stats" | "source_call_id">
> & { name: string; role_prompt: string };

export type UpdatePracticeAgentDto = Partial<CreatePracticeAgentDto>;

export interface GeneratePracticeAgentDto {
    description: string;
    assistant_agent_id?: string;
    lead_temperature?: LeadTemperature;
    difficulty?: number;
    save?: boolean;
}

export interface RandomizePracticeAgentDto {
    lead_temperature?: LeadTemperature;
    difficulty?: number;
    scenario_type?: string;
    industry?: string;
    assistant_agent_id?: string;
    save?: boolean;
}
