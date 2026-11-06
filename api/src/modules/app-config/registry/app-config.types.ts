import { z } from 'zod';

export const AppConfigCategories = {
  PRICING: 'pricing',
  PLANS: 'plans',
  ANALYSIS: 'analysis',
  AI: 'ai',
  COACHING: 'coaching',
  BILLING: 'billing',
} as const;
export type AppConfigCategory =
  (typeof AppConfigCategories)[keyof typeof AppConfigCategories];

export interface AppConfigDefinition<S extends z.ZodType = z.ZodType> {
  schema: S;
  default: z.infer<S>;
  category: AppConfigCategory;
  description: string;
  // Public keys may be served to signed-in users (e.g. plan limits for the pricing page).
  public: boolean;
}

// Preserves the schema's inferred type on each registry entry.
export const defineConfig = <S extends z.ZodType>(
  definition: AppConfigDefinition<S>,
): AppConfigDefinition<S> => definition;

// null means "unlimited" for limits.
export const nullableMinutes = z.number().min(0).max(1_000_000).nullable();
export const nullableCount = z.number().int().min(0).max(1_000_000).nullable();
