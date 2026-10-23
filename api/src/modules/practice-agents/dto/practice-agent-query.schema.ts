import { z } from 'zod';

export const PracticeAgentQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).optional().default('active'),
  lead_temperature: z.enum(['COLD', 'WARM']).optional(),
  difficulty: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
});

export type PracticeAgentQueryType = z.infer<typeof PracticeAgentQuerySchema>;
