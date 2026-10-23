import { z } from 'zod';

export const UsageQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) =>
      v ? Math.min(365, Math.max(1, parseInt(v, 10) || 30)) : 30,
    ),
});

export type UsageQueryType = z.infer<typeof UsageQuerySchema>;
