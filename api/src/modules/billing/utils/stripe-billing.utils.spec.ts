import { OrgRole, PlanKey, SubscriptionStatus } from 'generated/prisma';
import {
  canBuyTopup,
  classifyChange,
  csvCell,
  isStaleUpdate,
  mapStripeStatus,
  monthlyCents,
} from './stripe-billing.utils';

const change = (plan: PlanKey, interval: 'month' | 'year' = 'month', extraSeats = 0) => ({
  plan,
  interval,
  extraSeats,
});

describe('classifyChange', () => {
  it('applies upgrades now', () => {
    expect(classifyChange(change(PlanKey.STARTER), change(PlanKey.PRO))).toBe('immediate');
  });
  it('schedules downgrades', () => {
    expect(classifyChange(change(PlanKey.COACH), change(PlanKey.PRO))).toBe('scheduled');
  });
  it('applies monthly -> yearly now and schedules yearly -> monthly', () => {
    expect(classifyChange(change(PlanKey.PRO), change(PlanKey.PRO, 'year'))).toBe('immediate');
    expect(classifyChange(change(PlanKey.PRO, 'year'), change(PlanKey.PRO))).toBe('scheduled');
  });
  it('applies added seats now and schedules removed seats', () => {
    expect(classifyChange(change(PlanKey.COACH, 'month', 2), change(PlanKey.COACH, 'month', 5))).toBe('immediate');
    expect(classifyChange(change(PlanKey.COACH, 'month', 5), change(PlanKey.COACH, 'month', 2))).toBe('scheduled');
  });
  it('schedules mixed changes and detects no change', () => {
    expect(classifyChange(change(PlanKey.STARTER, 'year'), change(PlanKey.PRO, 'month'))).toBe('scheduled');
    expect(classifyChange(change(PlanKey.PRO), change(PlanKey.PRO))).toBe('none');
  });
});

describe('mapStripeStatus', () => {
  it.each([
    ['trialing', SubscriptionStatus.TRIALING],
    ['active', SubscriptionStatus.ACTIVE],
    ['past_due', SubscriptionStatus.PAST_DUE],
    ['unpaid', SubscriptionStatus.PAST_DUE],
    ['canceled', SubscriptionStatus.CANCELED],
    ['incomplete_expired', SubscriptionStatus.CANCELED],
    ['incomplete', SubscriptionStatus.INCOMPLETE],
  ])('%s -> %s', (stripe, ours) => expect(mapStripeStatus(stripe)).toBe(ours));
});

describe('monthlyCents', () => {
  it('normalises yearly prices to a month', () => {
    expect(monthlyCents(59000, 'year')).toBe(4917);
    expect(monthlyCents(5900, 'month')).toBe(5900);
    expect(monthlyCents(null, 'month')).toBe(0);
  });
});

describe('isStaleUpdate', () => {
  it('ignores updates older than what is stored', () => {
    expect(isStaleUpdate(new Date(2000), new Date(1000))).toBe(true);
    expect(isStaleUpdate(new Date(1000), new Date(2000))).toBe(false);
    expect(isStaleUpdate(null, new Date(1000))).toBe(false);
  });
});

describe('canBuyTopup', () => {
  const student = { role: OrgRole.MEMBER, permissions: [] };
  it('lets a student buy personal minutes but not team minutes', () => {
    expect(canBuyTopup(student, 'personal')).toBe(true);
    expect(canBuyTopup(student, 'team')).toBe(false);
  });
  it('lets owners and billing managers buy team minutes', () => {
    expect(canBuyTopup({ role: OrgRole.OWNER, permissions: [] }, 'team')).toBe(true);
    expect(canBuyTopup({ role: OrgRole.ADMIN, permissions: ['billing.manage'] } as never, 'team')).toBe(true);
  });
});

describe('csvCell', () => {
  it('neutralises formulas and quotes', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('a,b')).toBe('"a,b"');
  });
});
