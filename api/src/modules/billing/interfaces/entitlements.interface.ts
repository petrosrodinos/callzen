import {
  CallKind,
  PlanKey,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import {
  PlanFeatureValues,
  PlanLimitValues,
} from '@/shared/config/plans/plans.config';

// NONE = the organisation has no subscription (e.g. an owner's second organisation after their trial).
export type EffectiveStatus = SubscriptionStatus | 'NONE';

export interface UsagePeriod {
  start: Date;
  end: Date;
}

export interface Entitlements {
  organisation_id: string;
  plan: PlanKey;
  status: EffectiveStatus;
  source: SubscriptionSource | null;
  // Creation (calls, prospects, co-pilots, uploads, invites) is blocked; history stays readable (§8.4).
  read_only: boolean;
  period: UsagePeriod;
  limits: PlanLimitValues;
  features: PlanFeatureValues;
  // seats_included + paid extra seats.
  seats_total: number;
  extra_seats: number;
  trial_ends_at: Date | null;
  cancel_at_period_end: boolean;
  past_due_grace_ends_at: Date | null;
  team_credits: { live_seconds: number; practice_seconds: number };
}

export interface KindConsumption {
  // Pool seconds (counted call seconds minus personal-credit seconds) by owners / everyone else.
  owners_seconds: number;
  others_seconds: number;
  by_user: Record<string, number>;
  // Team credit seconds drawn this period (part of the pool, §8.3a).
  team_credit_seconds: number;
}

export interface Consumption {
  period: UsagePeriod;
  live: KindConsumption;
  practice: KindConsumption;
  uploads: number;
  copilots: number;
  practice_prospects: number;
  owner_ids: string[];
}

export type MinutesKind = typeof CallKind.LIVE | typeof CallKind.PRACTICE;

export interface Availability {
  kind: MinutesKind;
  // Pool + cap seconds left for this person (Infinity when unlimited), before personal credits.
  pool_seconds: number;
  personal_credit_seconds: number;
  // pool_seconds + personal credits.
  total_seconds: number;
  // Which limit binds when pool_seconds is 0: the pool or the person's cap.
  limited_by: 'pool' | 'member_cap' | null;
}

export interface KindMeter {
  // Minutes this person can see as their total (students see the pool without the owner reserve).
  included_minutes: number | null;
  used_minutes: number;
  // Per-member cap for non-owners.
  member_cap_minutes: number | null;
  member_used_minutes: number;
  available_minutes: number | null;
  team_credit_minutes: number;
  personal_credit_minutes: number;
  // Owners only: reserve and how much of it is left.
  owner_reserve_minutes: number | null;
  owner_reserve_left_minutes: number | null;
}

export interface PlanUsage {
  plan: PlanKey;
  status: EffectiveStatus;
  source: SubscriptionSource | null;
  read_only: boolean;
  is_owner: boolean;
  period: UsagePeriod;
  trial_ends_at: Date | null;
  cancel_at_period_end: boolean;
  live: KindMeter;
  practice: KindMeter;
  practice_shares_live_pool: boolean;
  uploads: { used: number; included: number | null };
  copilots: { used: number; max: number | null };
  practice_prospects: { used: number; max: number | null };
  seats: { used: number; total: number };
  features: PlanFeatureValues;
  can_buy_topups: boolean;
  can_buy_team_topups: boolean;
  // Organisations with usage.view: live/practice minutes per member this period.
  members?: {
    user_id: string;
    name: string;
    is_owner: boolean;
    live_minutes: number;
    practice_minutes: number;
    live_cap_minutes: number | null;
    practice_cap_minutes: number | null;
  }[];
}
