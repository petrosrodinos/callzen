import { PlanKey } from 'generated/prisma';

// Plan keys are fixed in code (Prisma enum PlanKey). Every limit and feature flag for each plan lives in the
// "plans.definitions" AppConfig key; the values below are only the seed defaults. Never read these directly
// at runtime: use EntitlementsService, which reads the effective (admin-edited) config.

export const PAID_PLANS = [PlanKey.STARTER, PlanKey.PRO, PlanKey.COACH] as const;
export type PaidPlanKey = (typeof PAID_PLANS)[number];

// Order used for upgrade suggestions ("the next plan up").
export const PLAN_ORDER: PlanKey[] = [
  PlanKey.TRIAL,
  PlanKey.STARTER,
  PlanKey.PRO,
  PlanKey.COACH,
];

export const PlanFeatures = {
  KNOWLEDGE_DOCUMENT_IMPORT: 'knowledge_document_import',
  ORG_ROLES_PERMISSIONS: 'org_roles_permissions',
  ORG_INVITATIONS: 'org_invitations',
  VIEW_ALL_MEMBER_CALLS: 'view_all_member_calls',
  COHORT_DASHBOARD: 'cohort_dashboard',
  TOPUP_PURCHASES: 'topup_purchases',
  STUDENT_PAGES: 'student_pages',
  PRACTICE_ASSIGNMENTS: 'practice_assignments',
  CALL_COMMENTS: 'call_comments',
  COACH_REPORTS: 'coach_reports',
  STUDENT_EXPORT: 'student_export',
  AGENT_ACCESS_CONTROL: 'agent_access_control',
} as const;
export type PlanFeature = (typeof PlanFeatures)[keyof typeof PlanFeatures];
export const PLAN_FEATURE_KEYS = Object.values(PlanFeatures) as PlanFeature[];

export const PlanLimits = {
  SEATS_INCLUDED: 'seats_included',
  LIVE_MINUTES: 'live_minutes_per_period',
  PRACTICE_MINUTES: 'practice_minutes_per_period',
  LIVE_MINUTES_PER_MEMBER: 'live_minutes_per_member_per_period',
  PRACTICE_MINUTES_PER_MEMBER: 'practice_minutes_per_member_per_period',
  COPILOTS_MAX: 'copilots_max',
  PRACTICE_PROSPECTS_MAX: 'practice_prospects_max',
  PRACTICE_PROSPECTS_PER_MEMBER_MAX: 'practice_prospects_per_member_max',
  UPLOADS_PER_PERIOD: 'uploads_per_period',
} as const;
export type PlanLimit = (typeof PlanLimits)[keyof typeof PlanLimits];

export interface PlanLimitValues {
  seats_included: number;
  extra_seats_allowed: boolean;
  // null = unlimited. Minutes per billing period, pooled across the organisation.
  live_minutes_per_period: number | null;
  practice_minutes_per_period: number | null;
  // When true, practice draws from the live pool and practice_minutes_per_period is ignored (TRIAL).
  practice_shares_live_pool: boolean;
  live_minutes_reserved_for_owner_per_period: number | null;
  practice_minutes_reserved_for_owner_per_period: number | null;
  // Caps for non-owner members; null = no cap.
  live_minutes_per_member_per_period: number | null;
  practice_minutes_per_member_per_period: number | null;
  copilots_max: number | null;
  practice_prospects_max: number | null;
  practice_prospects_per_member_max: number | null;
  uploads_per_period: number | null;
  trial_days: number | null;
}

export type PlanFeatureValues = Record<PlanFeature, boolean>;

export interface PlanDefinition {
  limits: PlanLimitValues;
  features: PlanFeatureValues;
}

const features = (enabled: PlanFeature[]): PlanFeatureValues =>
  Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => [key, enabled.includes(key)]),
  ) as PlanFeatureValues;

const COACH_ONLY_FEATURES: PlanFeature[] = [
  PlanFeatures.ORG_ROLES_PERMISSIONS,
  PlanFeatures.ORG_INVITATIONS,
  PlanFeatures.VIEW_ALL_MEMBER_CALLS,
  PlanFeatures.COHORT_DASHBOARD,
  PlanFeatures.STUDENT_PAGES,
  PlanFeatures.PRACTICE_ASSIGNMENTS,
  PlanFeatures.CALL_COMMENTS,
  PlanFeatures.COACH_REPORTS,
  PlanFeatures.STUDENT_EXPORT,
  PlanFeatures.AGENT_ACCESS_CONTROL,
];

const NO_RESERVES = {
  live_minutes_reserved_for_owner_per_period: null,
  practice_minutes_reserved_for_owner_per_period: null,
  live_minutes_per_member_per_period: null,
  practice_minutes_per_member_per_period: null,
  practice_prospects_per_member_max: null,
};

// Seed values from the monetization plan (§2.2, §2.3, §10.1a, §10.1h). Pro and Coach minutes were lowered by the
// §10.2 margin check (2026-11-06) so the worst case stays within ~40% of the indicative prices ($79, $149).
export const DEFAULT_PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  [PlanKey.TRIAL]: {
    limits: {
      seats_included: 1,
      extra_seats_allowed: false,
      live_minutes_per_period: 20,
      practice_minutes_per_period: null,
      practice_shares_live_pool: true,
      ...NO_RESERVES,
      copilots_max: 1,
      practice_prospects_max: 2,
      uploads_per_period: 1,
      trial_days: 14,
    },
    features: features([]),
  },
  [PlanKey.STARTER]: {
    limits: {
      seats_included: 1,
      extra_seats_allowed: false,
      live_minutes_per_period: 120,
      practice_minutes_per_period: 30,
      practice_shares_live_pool: false,
      ...NO_RESERVES,
      copilots_max: 1,
      practice_prospects_max: 3,
      uploads_per_period: 5,
      trial_days: null,
    },
    features: features([PlanFeatures.TOPUP_PURCHASES]),
  },
  [PlanKey.PRO]: {
    limits: {
      seats_included: 1,
      extra_seats_allowed: false,
      live_minutes_per_period: 250,
      practice_minutes_per_period: 125,
      practice_shares_live_pool: false,
      ...NO_RESERVES,
      copilots_max: 5,
      practice_prospects_max: 25,
      uploads_per_period: 30,
      trial_days: null,
    },
    features: features([
      PlanFeatures.KNOWLEDGE_DOCUMENT_IMPORT,
      PlanFeatures.TOPUP_PURCHASES,
    ]),
  },
  [PlanKey.COACH]: {
    limits: {
      seats_included: 11,
      extra_seats_allowed: true,
      live_minutes_per_period: 475,
      practice_minutes_per_period: 235,
      practice_shares_live_pool: false,
      live_minutes_reserved_for_owner_per_period: 95,
      practice_minutes_reserved_for_owner_per_period: 0,
      live_minutes_per_member_per_period: 65,
      practice_minutes_per_member_per_period: 35,
      copilots_max: null,
      practice_prospects_max: null,
      practice_prospects_per_member_max: 15,
      uploads_per_period: 100,
      trial_days: null,
    },
    features: features([
      PlanFeatures.KNOWLEDGE_DOCUMENT_IMPORT,
      PlanFeatures.TOPUP_PURCHASES,
      ...COACH_ONLY_FEATURES,
    ]),
  },
};

export const PlanErrorCodes = {
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  PLAN_FEATURE_LOCKED: 'PLAN_FEATURE_LOCKED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  CALL_TIME_LIMIT: 'CALL_TIME_LIMIT',
  TRIAL_ALREADY_USED: 'TRIAL_ALREADY_USED',
} as const;

// Calls shorter than this (misclicks, failed connections) never count toward minutes.
export const MIN_COUNTED_CALL_SECONDS = 5;
// Grace after max_duration before the server stops serving co-pilot requests.
export const CALL_TIME_LIMIT_GRACE_SECONDS = 60;
