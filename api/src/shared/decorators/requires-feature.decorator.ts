import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '@/shared/config/plans/plans.config';

export const PLAN_FEATURES_KEY = 'required_plan_features';

// All listed plan features are required (403 PLAN_FEATURE_LOCKED otherwise). Enforced by OrgGuard.
export const RequiresFeature = (...features: PlanFeature[]) =>
  SetMetadata(PLAN_FEATURES_KEY, features);
