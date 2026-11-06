import { z } from 'zod';
import { AppConfigCategories, defineConfig } from './app-config.types';

export const COACHING_KEYS = {
  'coaching.digest': defineConfig({
    schema: z.object({
      enabled: z.boolean(),
      weekday: z.number().int().min(0).max(6),
      hour_utc: z.number().int().min(0).max(23),
      // Average-score points a student must gain to be listed as improved.
      improved_threshold: z.number().min(0).max(100),
    }),
    default: { enabled: true, weekday: 1, hour_utc: 7, improved_threshold: 5 },
    category: AppConfigCategories.COACHING,
    description: 'Weekly coach report schedule (UTC) and thresholds.',
    public: false,
  }),
  'coaching.inactive_days': defineConfig({
    schema: z.number().int().min(1).max(365),
    default: 7,
    category: AppConfigCategories.COACHING,
    description:
      'Days without practice after which a student is listed as inactive.',
    public: true,
  }),
};
