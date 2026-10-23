import { PracticeAgent } from 'generated/prisma';

export interface PracticeAgentStats {
  sessions_count: number;
  best_score: number | null;
  last_score: number | null;
  objective_rate: number | null;
  last_practiced_at: Date | null;
}

export interface PracticeAgentWithStats extends PracticeAgent {
  stats: PracticeAgentStats;
}
