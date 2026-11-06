import { z } from 'zod';
import {
  BillingInvoiceKind,
  PlanKey,
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';

const page = z
  .string()
  .optional()
  .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1));
const limit = z
  .string()
  .optional()
  .transform((v) => (v ? Math.min(2000, Math.max(1, parseInt(v, 10) || 25)) : 25));
const flag = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');
const optionalNumber = z
  .string()
  .optional()
  .transform((v) => (v == null || v === '' ? null : Number(v)))
  .refine((v) => v == null || Number.isFinite(v), 'Must be a number');

export const AdminSubscriptionsQuerySchema = z.object({
  page,
  limit,
  search: z.string().max(200).optional(),
  plan: z.nativeEnum(PlanKey).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  source: z.nativeEnum(SubscriptionSource).optional(),
  cancelling: flag,
  past_due: flag,
  no_subscription: flag,
  trial_ending_days: optionalNumber,
  // USD: rows whose margin (revenue − base AI cost this period) is below this value.
  margin_below: optionalNumber,
  order_by: z
    .enum(['created_at', 'name', 'mrr', 'margin', 'ai_cost', 'minutes_used'])
    .optional()
    .default('created_at'),
  order_direction: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type AdminSubscriptionsQueryType = z.infer<typeof AdminSubscriptionsQuerySchema>;

export const AdminPaymentsQuerySchema = z.object({
  page,
  limit,
  filter: z.enum(['all', 'failed', 'open', 'refunded', 'paid']).optional().default('all'),
  kind: z.nativeEnum(BillingInvoiceKind).optional(),
  organisation_id: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type AdminPaymentsQueryType = z.infer<typeof AdminPaymentsQuerySchema>;

export const AdminSubscriptionDetailQuerySchema = z.object({
  event_type: z.nativeEnum(SubscriptionEventType).optional(),
});
export type AdminSubscriptionDetailQueryType = z.infer<typeof AdminSubscriptionDetailQuerySchema>;

export const AdminOrganisationsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  days: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(365, Math.max(1, parseInt(v, 10) || 30)) : 30)),
});
export type AdminOrganisationsQueryType = z.infer<typeof AdminOrganisationsQuerySchema>;

export const BillingInvoicesQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10) || 20)) : 20)),
});
export type BillingInvoicesQueryType = z.infer<typeof BillingInvoicesQuerySchema>;
