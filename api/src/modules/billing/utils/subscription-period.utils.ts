import { DateTime } from 'luxon';
import { SubscriptionSource, SubscriptionStatus } from 'generated/prisma';
import { EffectiveStatus, UsagePeriod } from '../interfaces/entitlements.interface';

export interface SubscriptionLike {
  status: SubscriptionStatus;
  source: SubscriptionSource;
  current_period_start: Date;
  current_period_end: Date;
  trial_ends_at: Date | null;
  past_due_since: Date | null;
}

// Usage windows (§8.1): the trial lifetime while trialing, otherwise monthly windows anchored on the
// subscription start, so yearly plans still reset their allowances every month.
export const currentUsagePeriod = (
  subscription: SubscriptionLike | null,
  now: Date = new Date(),
): UsagePeriod => {
  if (!subscription) {
    const start = DateTime.fromJSDate(now).toUTC().startOf('month');
    return { start: start.toJSDate(), end: start.plus({ months: 1 }).toJSDate() };
  }
  if (subscription.status === SubscriptionStatus.TRIALING)
    return {
      start: subscription.current_period_start,
      end: subscription.trial_ends_at ?? subscription.current_period_end,
    };

  const anchor = DateTime.fromJSDate(subscription.current_period_start).toUTC();
  const at = DateTime.fromJSDate(now).toUTC();
  // Whole months between the anchor and now; luxon clamps month-end anchors (Jan 31 -> Feb 28).
  let months = Math.max(0, Math.floor(at.diff(anchor, 'months').months));
  let start = anchor.plus({ months });
  if (start > at) {
    months = Math.max(0, months - 1);
    start = anchor.plus({ months });
  }
  let end = anchor.plus({ months: months + 1 });
  if (end <= at) {
    start = end;
    end = anchor.plus({ months: months + 2 });
  }
  return { start: start.toJSDate(), end: end.toJSDate() };
};

export const pastDueGraceEndsAt = (
  subscription: Pick<SubscriptionLike, 'status' | 'past_due_since'>,
  graceDays: number,
): Date | null =>
  subscription.status === SubscriptionStatus.PAST_DUE && subscription.past_due_since
    ? DateTime.fromJSDate(subscription.past_due_since).plus({ days: graceDays }).toJSDate()
    : null;

// The status enforcement acts on (§8.4). Expired trials, expired manual plans and past-due subscriptions
// beyond their grace period are treated as canceled even before the daily job persists it.
export const effectiveStatus = (
  subscription: SubscriptionLike | null,
  graceDays: number,
  now: Date = new Date(),
): EffectiveStatus => {
  if (!subscription) return 'NONE';
  const { status } = subscription;
  if (status === SubscriptionStatus.TRIALING) {
    const endsAt = subscription.trial_ends_at ?? subscription.current_period_end;
    return endsAt <= now ? SubscriptionStatus.CANCELED : status;
  }
  if (
    status === SubscriptionStatus.ACTIVE &&
    subscription.source === SubscriptionSource.MANUAL &&
    subscription.current_period_end <= now
  )
    return SubscriptionStatus.CANCELED;
  if (status === SubscriptionStatus.PAST_DUE) {
    const graceEnd = pastDueGraceEndsAt(subscription, graceDays);
    return graceEnd && graceEnd <= now ? SubscriptionStatus.CANCELED : status;
  }
  return status;
};

export const isReadOnlyStatus = (status: EffectiveStatus): boolean =>
  status === 'NONE' ||
  status === SubscriptionStatus.CANCELED ||
  status === SubscriptionStatus.INCOMPLETE;
