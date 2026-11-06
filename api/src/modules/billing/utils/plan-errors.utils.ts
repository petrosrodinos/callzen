import { ForbiddenException } from '@nestjs/common';
import { PlanKey } from 'generated/prisma';
import {
  PLAN_ORDER,
  PlanDefinition,
  PlanErrorCodes,
  PlanFeature,
  PlanLimitValues,
} from '@/shared/config/plans/plans.config';

// The next plan up that raises the limit (null or higher) or enables the feature, for upgrade prompts.
export const nextPlanFor = (
  current: PlanKey,
  definitions: Record<PlanKey, PlanDefinition>,
  check: (definition: PlanDefinition) => boolean,
): PlanKey | null => {
  const from = PLAN_ORDER.indexOf(current);
  return (
    PLAN_ORDER.slice(from + 1).find(
      (plan) => plan !== PlanKey.TRIAL && check(definitions[plan]),
    ) ?? null
  );
};

export const raisesLimit =
  (limit: keyof PlanLimitValues, current: number | null) =>
  (definition: PlanDefinition) => {
    const value = definition.limits[limit] as number | null;
    return value == null || (current != null && value > current);
  };

export const planLimitReached = (details: {
  limit: string;
  current: number;
  max: number | null;
  plan: PlanKey;
  next_plan: PlanKey | null;
  message: string;
  // Extra fields for minutes limits (e.g. whether personal minutes can be bought).
  [key: string]: unknown;
}) =>
  new ForbiddenException({
    code: PlanErrorCodes.PLAN_LIMIT_REACHED,
    ...details,
  });

export const planFeatureLocked = (
  feature: PlanFeature,
  plan: PlanKey,
  nextPlan: PlanKey | null,
) =>
  new ForbiddenException({
    code: PlanErrorCodes.PLAN_FEATURE_LOCKED,
    message: 'Your plan does not include this feature',
    feature,
    plan,
    next_plan: nextPlan,
  });

export const subscriptionRequired = (plan: PlanKey, status: string) =>
  new ForbiddenException({
    code: PlanErrorCodes.SUBSCRIPTION_REQUIRED,
    message:
      'This organisation has no active plan. Subscribe to create new calls, prospects and co-pilots; your history stays available.',
    plan,
    status,
  });
