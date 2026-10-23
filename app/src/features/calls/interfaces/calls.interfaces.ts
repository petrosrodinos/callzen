import type { Pagination } from "@/interfaces/pagination/pagination.interface";
import type { AnalysisCriterion, SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import type { PracticeAgentFields } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import type { VoiceProvider } from "@/features/catalog/interfaces/catalog.interfaces";

export const CallKinds = {
    LIVE: "LIVE",
    PRACTICE: "PRACTICE",
} as const;
export type CallKind = (typeof CallKinds)[keyof typeof CallKinds];

export const CallTypes = {
    ONLINE_MEETING: "ONLINE_MEETING",
    MICROPHONE: "MICROPHONE",
    PRACTICE: "PRACTICE",
} as const;
export type CallType = (typeof CallTypes)[keyof typeof CallTypes];

export const CallStatuses = {
    IN_PROGRESS: "IN_PROGRESS",
    ANALYZING: "ANALYZING",
    ANALYZED: "ANALYZED",
    ANALYSIS_FAILED: "ANALYSIS_FAILED",
    ENDED: "ENDED",
} as const;
export type CallStatus = (typeof CallStatuses)[keyof typeof CallStatuses];

export const CallOutcomes = {
    MEETING_BOOKED: "MEETING_BOOKED",
    DEAL_WON: "DEAL_WON",
    FOLLOW_UP: "FOLLOW_UP",
    LOST: "LOST",
    NO_DECISION: "NO_DECISION",
    GATEKEEPER: "GATEKEEPER",
    CUSTOM: "CUSTOM",
} as const;
export type CallOutcome = (typeof CallOutcomes)[keyof typeof CallOutcomes];

export const CallEndReasons = {
    USER: "USER",
    PROSPECT_HUNG_UP: "PROSPECT_HUNG_UP",
    TIME_LIMIT: "TIME_LIMIT",
    INTERRUPTED: "INTERRUPTED",
} as const;
export type CallEndReason = (typeof CallEndReasons)[keyof typeof CallEndReasons];

export const Speakers = {
    USER: "USER",
    PROSPECT: "PROSPECT",
    UNKNOWN: "UNKNOWN",
} as const;
export type Speaker = (typeof Speakers)[keyof typeof Speakers];

export const SuggestionTypes = {
    OPENER: "OPENER",
    DISCOVERY_QUESTION: "DISCOVERY_QUESTION",
    OBJECTION_RESPONSE: "OBJECTION_RESPONSE",
    VALUE_STATEMENT: "VALUE_STATEMENT",
    BUYING_SIGNAL: "BUYING_SIGNAL",
    NEXT_STEP: "NEXT_STEP",
    REMINDER: "REMINDER",
    WARNING: "WARNING",
    CONSENT: "CONSENT",
    ANSWER: "ANSWER",
} as const;
export type SuggestionType = (typeof SuggestionTypes)[keyof typeof SuggestionTypes];

export const SuggestionStatuses = {
    SHOWN: "SHOWN",
    DISMISSED: "DISMISSED",
    PINNED: "PINNED",
} as const;
export type SuggestionStatus = (typeof SuggestionStatuses)[keyof typeof SuggestionStatuses];

export type SuggestionFeedback = "UP" | "DOWN";

export const TimelineMarkerKinds = {
    MISTAKE: "MISTAKE",
    STRENGTH: "STRENGTH",
    OBJECTION: "OBJECTION",
    BUYING_SIGNAL: "BUYING_SIGNAL",
    BOOKMARK: "BOOKMARK",
} as const;
export type TimelineMarkerKind = (typeof TimelineMarkerKinds)[keyof typeof TimelineMarkerKinds];

export interface TranscriptSegment {
    id: string;
    call_id: string;
    client_id: string | null;
    speaker: Speaker;
    text: string;
    start_ms: number;
    end_ms: number;
}

export interface InfoCard {
    title: string;
    content: string;
}

export interface Suggestion {
    id: string;
    call_id: string;
    type: SuggestionType;
    text: string;
    alternatives: string[];
    reason: string | null;
    info_card: InfoCard | null;
    at_ms: number;
    status: SuggestionStatus;
    feedback: SuggestionFeedback | null;
    model: string | null;
    latency_ms: number | null;
    created_at: string;
}

export interface Bookmark {
    id: string;
    call_id: string;
    at_ms: number;
    label: string | null;
}

export interface MomentRef {
    at_ms: number | null;
    segment_id: string | null;
}

export interface CategoryScore {
    key: string;
    label: string;
    weight: number;
    score: number | null;
    comment: string;
}

export interface AnalysisMistake extends MomentRef {
    title: string;
    category_key: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    what_happened: string;
    why_it_matters: string;
    what_to_do_instead: string;
}

export interface AnalysisStrength extends MomentRef {
    title: string;
    category_key: string;
    detail: string;
}

export interface AnalysisObjection extends MomentRef {
    objection: string;
    handled: boolean;
    comment: string;
}

export interface AnalysisBuyingSignal extends MomentRef {
    signal: string;
    acted_on: boolean;
}

export interface ConversationMetrics {
    talk_ratio_user: number;
    talk_ratio_prospect: number;
    user_talk_seconds: number;
    prospect_talk_seconds: number;
    questions_asked: number;
    longest_monologue_seconds: number;
    speaking_pace_wpm: number;
    filler_words: number;
    filler_breakdown: Record<string, number>;
    interruptions: number;
    objections_raised: number;
    objections_handled: number;
    objections: AnalysisObjection[];
    buying_signals: AnalysisBuyingSignal[];
}

export interface ProspectInsights {
    summary: string;
    needs: string[];
    pain_points: string[];
    objections: string[];
    interest_level: "LOW" | "MEDIUM" | "HIGH";
    buying_signals: string[];
    budget: string;
    timeline: string;
    decision_makers: string;
    competitors: string;
}

export interface SuggestedPractice {
    title: string;
    focus: string;
    scenario_description: string;
    lead_temperature: "COLD" | "WARM";
    difficulty: number;
}

export interface PracticeReveal {
    kind: "PAIN_POINT" | "HIDDEN_INFO" | "OBJECTION" | "CONVERSION_CONDITION";
    item: string;
    uncovered: boolean;
    comment: string;
}

export interface PracticeResult {
    objective_achieved: boolean;
    objective_explanation: string;
    prospect_thinking: string;
    reveal: PracticeReveal[];
    what_would_change_outcome: string;
    lost_attention: MomentRef;
}

export interface SuggestionUsageItem {
    suggestion_id: string;
    text: string;
    type: SuggestionType;
    at_ms: number;
    usage: "FOLLOWED" | "ADAPTED" | "IGNORED";
    helpful: boolean;
    comment: string;
}

export interface SuggestionUsage {
    items: SuggestionUsageItem[];
    followed: number;
    adapted: number;
    ignored: number;
    effect_on_outcome: string;
    copilot_improvements: string[];
}

export interface CallAnalysis {
    id: string;
    call_id: string;
    model: string;
    overall_score: number;
    verdict: string;
    category_scores: CategoryScore[];
    mistakes: AnalysisMistake[];
    strengths: AnalysisStrength[];
    improvements: { title: string; tip: string }[];
    metrics: ConversationMetrics;
    prospect_insights: ProspectInsights;
    summary: string;
    next_steps: string[];
    follow_up_draft: string | null;
    suggested_practice: SuggestedPractice[];
    practice_result: PracticeResult | null;
    suggestion_usage: SuggestionUsage | null;
    error: string | null;
    created_at: string;
}

export interface AgentSnapshot {
    id: string;
    name: string;
    call_goal: string | null;
    script: { id: string; stage: string; title: string; content: string }[];
    suggestion_frequency: SuggestionFrequency;
    realtime_model: string;
    analysis_model: string;
    analysis_criteria: AnalysisCriterion[];
    language: string;
}

export type PracticeSnapshot = Partial<PracticeAgentFields> & {
    id: string;
    name: string;
    voice_provider: VoiceProvider;
    voice: string;
    time_limit_minutes: number | null;
};

export interface Call {
    id: string;
    user_id: string;
    kind: CallKind;
    call_type: CallType;
    status: CallStatus;
    assistant_agent_id: string | null;
    practice_agent_id: string | null;
    copilot_enabled: boolean;
    title: string | null;
    prospect_name: string | null;
    prospect_company: string | null;
    prospect_role: string | null;
    context_notes: string | null;
    goal: string | null;
    prior_call_id: string | null;
    language: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number;
    ended_reason: CallEndReason | null;
    outcome: CallOutcome | null;
    custom_outcome: string | null;
    objective_achieved: boolean | null;
    keep_recording: boolean;
    has_recording: boolean;
    recording_mime: string | null;
    recording_size: number | null;
    user_notes: string | null;
    script_progress: string[];
    analysis_error: string | null;
    agent_snapshot: AgentSnapshot | null;
    practice: PracticeSnapshot | null;
    segments: TranscriptSegment[];
    suggestions: Suggestion[];
    bookmarks: Bookmark[];
    analysis: CallAnalysis | null;
    assistant_agent: { id: string; name: string; archived_at: string | null } | null;
    practice_agent: { id: string; name: string; difficulty: number; archived_at: string | null } | null;
}

export interface CallListItem {
    id: string;
    kind: CallKind;
    call_type: CallType;
    status: CallStatus;
    title: string | null;
    prospect_name: string | null;
    prospect_company: string | null;
    started_at: string;
    duration_seconds: number;
    outcome: CallOutcome | null;
    custom_outcome: string | null;
    copilot_enabled: boolean;
    objective_achieved: boolean | null;
    has_recording: boolean;
    score: number | null;
    assistant_agent: { id: string; name: string } | null;
    practice_agent: { id: string; name: string; difficulty: number; lead_temperature: string } | null;
}

export interface CallListResponse {
    data: CallListItem[];
    pagination: Pagination;
}

export interface CallQuery {
    page?: number;
    limit?: number;
    search?: string;
    kind?: CallKind;
    call_type?: CallType;
    assistant_agent_id?: string;
    practice_agent_id?: string;
    outcome?: CallOutcome | "NONE";
    status?: CallStatus;
    min_score?: number;
    max_score?: number;
    from?: string;
    to?: string;
    order_by?: "started_at" | "duration_seconds" | "score";
    order_direction?: "asc" | "desc";
}

export interface CreateCallDto {
    call_type: CallType;
    assistant_agent_id?: string;
    prospect_name?: string;
    prospect_company?: string;
    prospect_role?: string;
    context_notes?: string;
    goal?: string;
    prior_call_id?: string;
    keep_recording?: boolean;
    language?: string;
}

export interface CreatePracticeCallDto {
    practice_agent_id: string;
    copilot_enabled?: boolean;
    assistant_agent_id?: string;
    voice_provider?: VoiceProvider;
    voice?: string;
    keep_recording?: boolean;
}

export interface UpdateCallDto {
    title?: string;
    outcome?: CallOutcome | null;
    custom_outcome?: string;
    user_notes?: string;
    prospect_name?: string;
    prospect_company?: string;
    prospect_role?: string;
    assistant_agent_id?: string;
}

export interface SegmentInput {
    client_id: string;
    speaker: Speaker;
    text: string;
    start_ms: number;
    end_ms: number;
}

export interface AddSegmentsDto {
    segments: SegmentInput[];
    request_suggestion?: boolean;
    frequency?: SuggestionFrequency;
    elapsed_ms?: number;
}

export interface SuggestionResult {
    suggestion: Suggestion | null;
    speaker_updates: { id: string; speaker: Speaker }[];
    script_progress?: string[];
    suggestions_unavailable?: boolean;
    fallback_model?: string | null;
}

export interface AddSegmentsResponse extends SuggestionResult {
    segments: TranscriptSegment[];
}

export interface AskCopilotResponse {
    suggestion: Suggestion;
    found_in_knowledge: boolean;
    fallback_model: string | null;
}

export interface EndCallDto {
    ended_reason: CallEndReason;
    duration_seconds: number;
    outcome?: CallOutcome;
    custom_outcome?: string;
    audio_seconds?: number;
}

export interface RerunAnalysisDto {
    model?: string;
    use_current_criteria?: boolean;
}

export interface PracticeTurnDto {
    user_text?: string;
    client_id?: string;
    start_ms: number;
    end_ms: number;
}

export interface PracticeTurnResponse {
    user_segment: TranscriptSegment | null;
    prospect_segment: TranscriptSegment;
    end_call: boolean;
    objective_agreed: boolean;
}

export type RealtimePurpose = "TRANSCRIPTION" | "PRACTICE_VOICE";

export interface RealtimeSession {
    client_secret: string;
    expires_at: number;
    model: string;
    webrtc_url: string;
    voice?: string;
    end_call_tool?: string;
}
