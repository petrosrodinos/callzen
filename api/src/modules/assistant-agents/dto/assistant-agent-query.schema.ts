import { z } from 'zod';

export const AssistantAgentQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).optional().default('active'),
});

export type AssistantAgentQueryType = z.infer<typeof AssistantAgentQuerySchema>;
