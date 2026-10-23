import { z } from 'zod';

const optionalInt = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : undefined));

export const CallQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) =>
      v ? Math.min(100, Math.max(1, parseInt(v, 10) || 20)) : 20,
    ),
  search: z.string().optional(),
  mine: z.enum(['true']).optional(),
  kind: z.enum(['LIVE', 'PRACTICE']).optional(),
  call_type: z.enum(['ONLINE_MEETING', 'MICROPHONE', 'PRACTICE']).optional(),
  assistant_agent_id: z.string().uuid().optional(),
  practice_agent_id: z.string().uuid().optional(),
  outcome: z
    .enum([
      'MEETING_BOOKED',
      'DEAL_WON',
      'FOLLOW_UP',
      'LOST',
      'NO_DECISION',
      'GATEKEEPER',
      'CUSTOM',
      'NONE',
    ])
    .optional(),
  status: z
    .enum(['IN_PROGRESS', 'ANALYZING', 'ANALYZED', 'ANALYSIS_FAILED', 'ENDED'])
    .optional(),
  min_score: optionalInt,
  max_score: optionalInt,
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  order_by: z
    .enum(['started_at', 'duration_seconds', 'score'])
    .optional()
    .default('started_at'),
  order_direction: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CallQueryType = z.infer<typeof CallQuerySchema>;
