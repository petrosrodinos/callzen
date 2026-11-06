import { z } from 'zod';

const page = z
  .string()
  .optional()
  .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1));
const limit = z
  .string()
  .optional()
  .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10) || 20)) : 20));

export const AssignmentQuerySchema = z.object({
  page,
  limit,
  status: z.enum(['open', 'overdue', 'completed', 'archived', 'all']).optional().default('all'),
  search: z.string().max(200).optional(),
  user_id: z.string().uuid().optional(),
});
export type AssignmentQueryType = z.infer<typeof AssignmentQuerySchema>;

export const MyAssignmentsQuerySchema = z.object({
  status: z.enum(['open', 'all']).optional().default('open'),
});
export type MyAssignmentsQueryType = z.infer<typeof MyAssignmentsQuerySchema>;

export const CoachingWindowQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(365, Math.max(7, parseInt(v, 10) || 30)) : 30)),
});
export type CoachingWindowQueryType = z.infer<typeof CoachingWindowQuerySchema>;

export const ReportsQuerySchema = z.object({ page, limit });
export type ReportsQueryType = z.infer<typeof ReportsQuerySchema>;

export const CallsExportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  user_id: z.string().uuid().optional(),
});
export type CallsExportQueryType = z.infer<typeof CallsExportQuerySchema>;
