import { z } from 'zod';
import { PlanKey } from 'generated/prisma';
import {
  AppConfigCategories,
  defineConfig,
  nullableCount,
  nullableMinutes,
} from './app-config.types';
import {
  DEFAULT_PLAN_DEFINITIONS,
  PLAN_FEATURE_KEYS,
  PlanDefinition,
  PlanFeature,
} from '@/shared/config/plans/plans.config';

const capMinutes = z.number().min(1).max(1_000_000).nullable();

const PlanLimitsSchema = z
  .object({
    seats_included: z.number().int().min(1).max(10_000),
    extra_seats_allowed: z.boolean(),
    live_minutes_per_period: nullableMinutes,
    practice_minutes_per_period: nullableMinutes,
    practice_shares_live_pool: z.boolean(),
    live_minutes_reserved_for_owner_per_period: nullableMinutes,
    practice_minutes_reserved_for_owner_per_period: nullableMinutes,
    // A cap, when set, must be at least 1 minute (§2.2).
    live_minutes_per_member_per_period: capMinutes,
    practice_minutes_per_member_per_period: capMinutes,
    copilots_max: nullableCount,
    practice_prospects_max: nullableCount,
    practice_prospects_per_member_max: nullableCount,
    uploads_per_period: nullableCount,
    trial_days: z.number().int().min(1).max(365).nullable(),
  })
  .superRefine((limits, ctx) => {
    const pairs = [
      [
        'live_minutes_reserved_for_owner_per_period',
        'live_minutes_per_period',
      ],
      [
        'practice_minutes_reserved_for_owner_per_period',
        'practice_minutes_per_period',
      ],
    ] as const;
    for (const [reserveKey, poolKey] of pairs) {
      const reserve = limits[reserveKey];
      const pool = limits[poolKey];
      if (reserve != null && pool != null && reserve > pool)
        ctx.addIssue({
          code: 'custom',
          path: [reserveKey],
          message: 'The owner reserve cannot exceed the pool',
        });
    }
  });

const PlanFeaturesSchema = z.object(
  Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => [key, z.boolean()]),
  ) as Record<PlanFeature, z.ZodBoolean>,
);

export const PlanDefinitionSchema = z.object({
  limits: PlanLimitsSchema,
  features: PlanFeaturesSchema,
});

export const PlanDefinitionsSchema = z.object(
  Object.fromEntries(
    Object.values(PlanKey).map((plan) => [plan, PlanDefinitionSchema]),
  ) as Record<PlanKey, typeof PlanDefinitionSchema>,
);

const stripePriceId = z.string().max(200);

export const StripePricesSchema = z.object({
  STARTER: z.object({ monthly: stripePriceId, yearly: stripePriceId }),
  PRO: z.object({ monthly: stripePriceId, yearly: stripePriceId }),
  COACH: z.object({
    monthly: stripePriceId,
    yearly: stripePriceId,
    extra_seat_monthly: stripePriceId,
    extra_seat_yearly: stripePriceId,
  }),
});
export type StripePrices = z.infer<typeof StripePricesSchema>;

export const TopupPackSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_-]+$/),
  // i18n key suffix used by the app for the pack name.
  label_key: z.string().min(1).max(100),
  live_minutes: z.number().int().min(0).max(100_000),
  practice_minutes: z.number().int().min(0).max(100_000),
  stripe_price_id: stripePriceId,
});
export type TopupPack = z.infer<typeof TopupPackSchema>;

export const PLANS_KEYS = {
  'plans.definitions': defineConfig({
    schema: PlanDefinitionsSchema,
    default: DEFAULT_PLAN_DEFINITIONS as Record<PlanKey, PlanDefinition>,
    category: AppConfigCategories.PLANS,
    description:
      'Limits and feature flags per plan. null means unlimited. Changes apply to enforcement within seconds.',
    public: true,
  }),
  'plans.stripe_prices': defineConfig({
    schema: StripePricesSchema,
    default: {
      STARTER: { monthly: '', yearly: '' },
      PRO: { monthly: '', yearly: '' },
      COACH: {
        monthly: '',
        yearly: '',
        extra_seat_monthly: '',
        extra_seat_yearly: '',
      },
    } as StripePrices,
    category: AppConfigCategories.PLANS,
    description: 'Stripe price ids per plan and interval, set per environment.',
    public: false,
  }),
  'plans.topup_packs': defineConfig({
    schema: z
      .array(TopupPackSchema)
      .max(20)
      .refine(
        (packs) => new Set(packs.map((pack) => pack.id)).size === packs.length,
        'Pack ids must be unique',
      ),
    default: [
      {
        id: 'live_100',
        label_key: 'live_100',
        live_minutes: 100,
        practice_minutes: 0,
        stripe_price_id: '',
      },
      {
        id: 'practice_60',
        label_key: 'practice_60',
        live_minutes: 0,
        practice_minutes: 60,
        stripe_price_id: '',
      },
    ] as TopupPack[],
    category: AppConfigCategories.PLANS,
    description:
      'One-off minute packs. Bought minutes never expire and are used after the plan allowance.',
    public: true,
  }),
};
