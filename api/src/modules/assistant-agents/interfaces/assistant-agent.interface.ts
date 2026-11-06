import { AssistantAgent } from 'generated/prisma';

export interface AssistantAgentStats {
  calls_count: number;
  live_calls_count: number;
  practice_calls_count: number;
  average_score: number | null;
  trend: number | null;
  last_used_at: Date | null;
}

export interface AssistantAgentWithStats extends AssistantAgent {
  stats: AssistantAgentStats;
  // Members on the access list; only returned to people who manage access (§10.1h).
  access_user_ids?: string[];
}
