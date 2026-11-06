import { PlanKey } from 'generated/prisma';

// The full analysis always runs and is always stored. These keys control which parts are served per plan
// (seed of the "analysis.visibility" AppConfig key, §9.2).
export const AnalysisFeatures = {
  OVERVIEW: 'overview',
  CATEGORY_SCORES: 'category_scores',
  MOMENTS: 'moments',
  IMPROVEMENTS: 'improvements',
  METRICS: 'metrics',
  PROSPECT_INSIGHTS: 'prospect_insights',
  NEXT_STEPS: 'next_steps',
  FOLLOW_UP_DRAFT: 'follow_up_draft',
  PRACTICE_REVEAL: 'practice_reveal',
  COPILOT_USAGE: 'copilot_usage',
  SUGGESTED_PRACTICE: 'suggested_practice',
} as const;
export type AnalysisFeature =
  (typeof AnalysisFeatures)[keyof typeof AnalysisFeatures];
export const ANALYSIS_FEATURE_KEYS = Object.values(
  AnalysisFeatures,
) as AnalysisFeature[];

// Stored CallAnalysis fields behind each feature key.
export const ANALYSIS_FEATURE_FIELDS: Record<AnalysisFeature, string[]> = {
  overview: ['overall_score', 'verdict', 'summary'],
  category_scores: ['category_scores'],
  moments: ['mistakes', 'strengths'],
  improvements: ['improvements'],
  metrics: ['metrics'],
  prospect_insights: ['prospect_insights'],
  next_steps: ['next_steps'],
  follow_up_draft: ['follow_up_draft'],
  practice_reveal: ['practice_result'],
  copilot_usage: ['suggestion_usage'],
  suggested_practice: ['suggested_practice'],
};

export type AnalysisVisibilityMatrix = Record<
  PlanKey,
  Record<AnalysisFeature, boolean>
>;

const all = (visible: boolean) =>
  Object.fromEntries(
    ANALYSIS_FEATURE_KEYS.map((key) => [key, visible]),
  ) as Record<AnalysisFeature, boolean>;

export const DEFAULT_ANALYSIS_VISIBILITY: AnalysisVisibilityMatrix = {
  [PlanKey.TRIAL]: all(true),
  [PlanKey.STARTER]: {
    ...all(false),
    overview: true,
    category_scores: true,
    next_steps: true,
    practice_reveal: true,
  },
  [PlanKey.PRO]: all(true),
  [PlanKey.COACH]: all(true),
};
