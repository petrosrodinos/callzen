export interface GroupStat {
  key: string;
  sessions: number;
  average_score: number | null;
  best_score: number | null;
  objective_rate: number | null;
}

export interface RecommendedPractice {
  title: string;
  focus: string;
  scenario_description: string;
  lead_temperature: 'COLD' | 'WARM';
  difficulty: number;
  source: 'RECURRING_MISTAKE' | 'LATEST_CALL';
  call_id: string | null;
}

export interface DashboardOverview {
  period_days: number;
  totals: {
    calls: number;
    live_calls: number;
    practice_sessions: number;
    analyzed_calls: number;
    average_score: number | null;
    live_average_score: number | null;
    practice_average_score: number | null;
    talk_minutes: number;
    meetings_booked: number;
    practice_streak_days: number;
  };
  score_trend: {
    call_id: string;
    date: Date;
    score: number;
    kind: string;
    title: string | null;
  }[];
  categories: {
    key: string;
    label: string;
    average: number | null;
    live_average: number | null;
    practice_average: number | null;
    change_percent: number | null;
    series: { date: Date; score: number }[];
  }[];
  recurring_mistakes: {
    category_key: string;
    label: string;
    count: number;
    calls_affected: number;
    common_titles: string[];
    calls: { call_id: string; title: string | null }[];
  }[];
  outcomes: { outcome: string; count: number; rate: number }[];
  highlights: string[];
  recommended_practice: RecommendedPractice[];
  practice_progress: {
    by_scenario: GroupStat[];
    by_difficulty: GroupStat[];
    by_temperature: GroupStat[];
    with_copilot: GroupStat;
    without_copilot: GroupStat;
  };
}
