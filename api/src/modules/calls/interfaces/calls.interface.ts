import { Speaker, Suggestion, TranscriptSegment } from 'generated/prisma';

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

export interface PracticeTurnResponse {
  user_segment: TranscriptSegment | null;
  prospect_segment: TranscriptSegment;
  end_call: boolean;
  objective_agreed: boolean;
}

export interface RealtimeSessionResponse {
  client_secret: string;
  expires_at: number;
  model: string;
  webrtc_url: string;
  voice?: string;
  end_call_tool?: string;
}

export interface CallListItem {
  id: string;
  kind: string;
  call_type: string;
  status: string;
  title: string | null;
  prospect_name: string | null;
  prospect_company: string | null;
  started_at: Date;
  duration_seconds: number;
  outcome: string | null;
  custom_outcome: string | null;
  copilot_enabled: boolean;
  objective_achieved: boolean | null;
  has_recording: boolean;
  score: number | null;
  assistant_agent: { id: string; name: string } | null;
  practice_agent: {
    id: string;
    name: string;
    difficulty: number;
    lead_temperature: string;
  } | null;
}
