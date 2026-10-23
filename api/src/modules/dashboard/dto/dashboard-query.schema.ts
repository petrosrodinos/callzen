import { z } from 'zod';

export const DashboardQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) =>
      v ? Math.min(365, Math.max(7, parseInt(v, 10) || 90)) : 90,
    ),
});

export type DashboardQueryType = z.infer<typeof DashboardQuerySchema>;
