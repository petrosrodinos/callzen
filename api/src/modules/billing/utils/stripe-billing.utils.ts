import { OrgRole, PlanKey, SubscriptionStatus } from 'generated/prisma';
import { PLAN_ORDER } from '@/shared/config/plans/plans.config';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';

export type BillingInterval = 'month' | 'year';

// Stripe subscription status -> our SubscriptionStatus.
export const mapStripeStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
    case 'incomplete_expired':
      return SubscriptionStatus.CANCELED;
    case 'incomplete':
    case 'paused':
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
};

export interface PlanChange {
  plan: PlanKey;
  interval: BillingInterval;
  extraSeats: number;
}

export type ChangeTiming = 'immediate' | 'scheduled' | 'none';

// §11a rules: upgrades, monthly→yearly and added seats apply now (prorated, invoiced now); downgrades,
// yearly→monthly and removed seats apply at the end of the period. A mixed change (e.g. a higher plan on a
// shorter interval) is scheduled, so a customer is never charged for something that takes effect later.
export const classifyChange = (current: PlanChange, next: PlanChange): ChangeTiming => {
  const rank = (plan: PlanKey) => PLAN_ORDER.indexOf(plan);
  const planDelta = Math.sign(rank(next.plan) - rank(current.plan));
  const intervalDelta =
    current.interval === next.interval ? 0 : next.interval === 'year' ? 1 : -1;
  const seatDelta = Math.sign(next.extraSeats - current.extraSeats);

  const deltas = [planDelta, intervalDelta, seatDelta];
  if (deltas.every((d) => d === 0)) return 'none';
  if (deltas.some((d) => d < 0)) return 'scheduled';
  return 'immediate';
};

// Monthly-normalised recurring revenue in cents (yearly prices / 12).
export const monthlyCents = (
  unitAmountCents: number | null | undefined,
  interval: string | null | undefined,
): number => {
  if (!unitAmountCents) return 0;
  return interval === 'year' ? Math.round(unitAmountCents / 12) : unitAmountCents;
};

// Out-of-order webhooks: an update older than what is stored is ignored (§11b edge cases).
export const isStaleUpdate = (
  stored: Date | null | undefined,
  incoming: Date | null | undefined,
): boolean => !!stored && !!incoming && incoming.getTime() < stored.getTime();

export type TopupScope = 'personal' | 'team';

// Every member can buy personal minutes; only owners and billing.manage holders buy for the team (§2.4).
export const canBuyTopup = (
  ctx: Pick<OrgContext, 'role' | 'permissions'>,
  scope: TopupScope,
): boolean =>
  scope === 'personal' ||
  ctx.role === OrgRole.OWNER ||
  can(ctx as OrgContext, Permissions.BILLING_MANAGE);

export const canManageBilling = (ctx: Pick<OrgContext, 'role' | 'permissions'>) =>
  ctx.role === OrgRole.OWNER || can(ctx as OrgContext, Permissions.BILLING_MANAGE);

export const fromUnix = (value: number | null | undefined): Date | null =>
  value ? new Date(value * 1000) : null;

// CSV cell: quotes, and neutralises spreadsheet formula injection.
export const csvCell = (value: unknown): string => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (header: string[], rows: unknown[][]): string =>
  '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
