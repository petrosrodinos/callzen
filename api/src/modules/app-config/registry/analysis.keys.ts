import { z } from 'zod';
import { PlanKey } from 'generated/prisma';
import { AppConfigCategories, defineConfig } from './app-config.types';
import {
  ANALYSIS_FEATURE_KEYS,
  AnalysisFeature,
  AnalysisVisibilityMatrix,
  DEFAULT_ANALYSIS_VISIBILITY,
} from '@/shared/config/plans/analysis-visibility.config';

const FeatureRow = z.object(
  Object.fromEntries(
    ANALYSIS_FEATURE_KEYS.map((key) => [key, z.boolean()]),
  ) as Record<AnalysisFeature, z.ZodBoolean>,
);

export const ANALYSIS_KEYS = {
  'analysis.visibility': defineConfig({
    schema: z.object(
      Object.fromEntries(
        Object.values(PlanKey).map((plan) => [plan, FeatureRow]),
      ) as Record<PlanKey, typeof FeatureRow>,
    ),
    default: DEFAULT_ANALYSIS_VISIBILITY as AnalysisVisibilityMatrix,
    category: AppConfigCategories.ANALYSIS,
    description:
      'Which parts of the stored analysis each plan can see. The full analysis is always stored.',
    public: true,
  }),
};
