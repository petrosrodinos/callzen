import { z } from 'zod';
import { AppConfigCategories, defineConfig } from './app-config.types';

export const BILLING_KEYS = {
  'billing.past_due_grace_days': defineConfig({
    schema: z.number().int().min(0).max(60),
    default: 7,
    category: AppConfigCategories.BILLING,
    description:
      'Days a past-due subscription keeps working before it is treated as canceled.',
    public: false,
  }),
};
