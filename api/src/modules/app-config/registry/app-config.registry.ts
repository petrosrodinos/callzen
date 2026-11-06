import { z } from 'zod';
import { PlanKey } from 'generated/prisma';
import { PlanDefinition } from '@/shared/config/plans/plans.config';
import { AnalysisVisibilityMatrix } from '@/shared/config/plans/analysis-visibility.config';
import { AppConfigDefinition } from './app-config.types';
import { PRICING_KEYS } from './pricing.keys';
import { PLANS_KEYS } from './plans.keys';
import { ANALYSIS_KEYS } from './analysis.keys';
import { AI_KEYS } from './ai.keys';
import { COACHING_KEYS } from './coaching.keys';
import { BILLING_KEYS } from './billing.keys';

// Adding a setting = adding an entry here. Defaults are written on boot (ensureDefaults) and never overwrite
// admin edits; fields added to object values later are deep-merged into the stored values.
export const APP_CONFIG_REGISTRY = {
  ...PRICING_KEYS,
  ...PLANS_KEYS,
  ...ANALYSIS_KEYS,
  ...AI_KEYS,
  ...COACHING_KEYS,
  ...BILLING_KEYS,
};

export type AppConfigKey = keyof typeof APP_CONFIG_REGISTRY;
// Domain types for keys whose Zod inference is less precise than the domain model (nullable limits).
interface AppConfigValueOverrides {
  'plans.definitions': Record<PlanKey, PlanDefinition>;
  'analysis.visibility': AnalysisVisibilityMatrix;
}

export type AppConfigValue<K extends AppConfigKey> =
  K extends keyof AppConfigValueOverrides
    ? AppConfigValueOverrides[K]
    : z.infer<(typeof APP_CONFIG_REGISTRY)[K]['schema']>;

export const APP_CONFIG_KEYS = Object.keys(
  APP_CONFIG_REGISTRY,
) as AppConfigKey[];

export const isAppConfigKey = (key: string): key is AppConfigKey =>
  Object.prototype.hasOwnProperty.call(APP_CONFIG_REGISTRY, key);

export const getDefinition = (key: AppConfigKey): AppConfigDefinition =>
  APP_CONFIG_REGISTRY[key] as unknown as AppConfigDefinition;
