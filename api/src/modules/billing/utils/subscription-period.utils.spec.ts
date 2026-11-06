import { SubscriptionSource, SubscriptionStatus } from 'generated/prisma';
import {
  currentUsagePeriod,
  effectiveStatus,
  isReadOnlyStatus,
} from './subscription-period.utils';

const d = (iso: string) => new Date(iso);
const base = {
  status: SubscriptionStatus.ACTIVE,
  source: SubscriptionSource.STRIPE,
  current_period_start: d('2026-01-15T10:00:00Z'),
  current_period_end: d('2027-01-15T10:00:00Z'),
  trial_ends_at: null,
  past_due_since: null,
};

describe('currentUsagePeriod', () => {
  it('derives monthly windows from the anchor of a yearly subscription', () => {
    const period = currentUsagePeriod(base, d('2026-03-20T00:00:00Z'));
    expect(period.start.toISOString()).toBe('2026-03-15T10:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-04-15T10:00:00.000Z');
  });

  it('starts a new window exactly at the anchor time', () => {
    const period = currentUsagePeriod(base, d('2026-04-15T10:00:00Z'));
    expect(period.start.toISOString()).toBe('2026-04-15T10:00:00.000Z');
  });

  it('uses the trial lifetime while trialing', () => {
    const period = currentUsagePeriod(
      { ...base, status: SubscriptionStatus.TRIALING, trial_ends_at: d('2026-01-29T10:00:00Z') },
      d('2026-01-20T00:00:00Z'),
    );
    expect(period.start).toEqual(base.current_period_start);
    expect(period.end.toISOString()).toBe('2026-01-29T10:00:00.000Z');
  });

  it('falls back to the calendar month without a subscription', () => {
    const period = currentUsagePeriod(null, d('2026-05-20T12:00:00Z'));
    expect(period.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});

describe('effectiveStatus', () => {
  const now = d('2026-06-01T00:00:00Z');

  it('is NONE without a subscription', () => {
    expect(effectiveStatus(null, 7, now)).toBe('NONE');
    expect(isReadOnlyStatus('NONE')).toBe(true);
  });

  it('cancels an expired trial', () => {
    expect(
      effectiveStatus(
        { ...base, status: SubscriptionStatus.TRIALING, trial_ends_at: d('2026-05-31T00:00:00Z') },
        7,
        now,
      ),
    ).toBe(SubscriptionStatus.CANCELED);
  });

  it('keeps past due during the grace period, then cancels', () => {
    const pastDue = { ...base, status: SubscriptionStatus.PAST_DUE };
    expect(effectiveStatus({ ...pastDue, past_due_since: d('2026-05-28T00:00:00Z') }, 7, now)).toBe(
      SubscriptionStatus.PAST_DUE,
    );
    expect(effectiveStatus({ ...pastDue, past_due_since: d('2026-05-20T00:00:00Z') }, 7, now)).toBe(
      SubscriptionStatus.CANCELED,
    );
  });

  it('expires manual plans at their period end', () => {
    expect(
      effectiveStatus(
        { ...base, source: SubscriptionSource.MANUAL, current_period_end: d('2026-05-01T00:00:00Z') },
        7,
        now,
      ),
    ).toBe(SubscriptionStatus.CANCELED);
  });
});
