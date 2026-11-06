import {
  availablePoolSeconds,
  settleSeconds,
  visiblePoolSeconds,
} from './allowance.utils';

const MIN = 60;
// Coach seeds: 1,500 live minutes pooled, 300 reserved for owners, 200 per student.
const coachPool = (ownersUsed: number, othersUsed: number) => ({
  poolSeconds: 1500 * MIN,
  ownerReserveSeconds: 300 * MIN,
  ownersUsedSeconds: ownersUsed * MIN,
  othersUsedSeconds: othersUsed * MIN,
});
const owner = { isOwner: true, memberCapSeconds: 200 * MIN, memberUsedSeconds: 0 };
const student = (used: number) => ({
  isOwner: false,
  memberCapSeconds: 200 * MIN,
  memberUsedSeconds: used * MIN,
});

describe('availablePoolSeconds', () => {
  it('reduces to the plain pool check without reserve or cap', () => {
    const pool = { poolSeconds: 120 * MIN, ownerReserveSeconds: 0, ownersUsedSeconds: 30 * MIN, othersUsedSeconds: 0 };
    expect(availablePoolSeconds(pool, { isOwner: true, memberCapSeconds: null, memberUsedSeconds: 0 })).toBe(90 * MIN);
  });

  it('is unlimited when the pool is null and there is no cap', () => {
    const pool = { poolSeconds: null, ownerReserveSeconds: 0, ownersUsedSeconds: 0, othersUsedSeconds: 0 };
    expect(availablePoolSeconds(pool, owner)).toBe(Infinity);
  });

  it('lets owners use the whole pool and is not capped', () => {
    expect(availablePoolSeconds(coachPool(0, 1000), owner)).toBe(500 * MIN);
  });

  it('holds students to the pool minus the owner reserve', () => {
    // 1,200 shared by students; 1,100 already used -> 100 left, under the 200 cap.
    expect(availablePoolSeconds(coachPool(0, 1100), student(0))).toBe(100 * MIN);
  });

  it('applies the per-member cap', () => {
    expect(availablePoolSeconds(coachPool(0, 300), student(150))).toBe(50 * MIN);
    expect(availablePoolSeconds(coachPool(0, 300), student(250))).toBe(0);
  });

  it('reduces what students have when owners exceed the reserve', () => {
    // Owners used 500 (> 300 reserve): students share 1,500 − 500 − 900 = 100.
    expect(availablePoolSeconds(coachPool(500, 900), student(0))).toBe(100 * MIN);
  });

  it('keeps the reserve for owners while students are exhausted', () => {
    expect(availablePoolSeconds(coachPool(0, 1200), student(0))).toBe(0);
    expect(availablePoolSeconds(coachPool(0, 1200), owner)).toBe(300 * MIN);
  });

  it('shares one reserve between several owners (combined usage)', () => {
    expect(availablePoolSeconds(coachPool(250, 0), owner)).toBe(1250 * MIN);
    expect(availablePoolSeconds(coachPool(250, 0), student(0))).toBe(200 * MIN);
  });

  it('clamps a reserve larger than the pool', () => {
    const pool = { poolSeconds: 100, ownerReserveSeconds: 500, ownersUsedSeconds: 0, othersUsedSeconds: 0 };
    expect(availablePoolSeconds(pool, student(0))).toBe(0);
    expect(availablePoolSeconds(pool, owner)).toBe(100);
  });
});

describe('visiblePoolSeconds', () => {
  it('hides the reserve from students', () => {
    expect(visiblePoolSeconds(coachPool(0, 0), false)).toBe(1200 * MIN);
    expect(visiblePoolSeconds(coachPool(0, 0), true)).toBe(1500 * MIN);
  });
});

describe('settleSeconds', () => {
  it('charges the pool first', () => {
    expect(
      settleSeconds({ callSeconds: 600, availableBefore: 1000, planAllowanceLeftBefore: 1000, personalCreditSeconds: 0 }),
    ).toEqual({ fromPool: 600, fromTeamCredits: 0, fromPersonalCredits: 0, overrun: 0 });
  });

  it('uses team credits for the part beyond the plan allowance', () => {
    expect(
      settleSeconds({ callSeconds: 600, availableBefore: 900, planAllowanceLeftBefore: 200, personalCreditSeconds: 0 }),
    ).toEqual({ fromPool: 600, fromTeamCredits: 400, fromPersonalCredits: 0, overrun: 0 });
  });

  it('pays the overflow from personal credits, then logs the rest as overrun', () => {
    expect(
      settleSeconds({ callSeconds: 600, availableBefore: 100, planAllowanceLeftBefore: 100, personalCreditSeconds: 300 }),
    ).toEqual({ fromPool: 100, fromTeamCredits: 0, fromPersonalCredits: 300, overrun: 200 });
  });

  it('never draws team credits on an unlimited plan', () => {
    expect(
      settleSeconds({ callSeconds: 60, availableBefore: Infinity, planAllowanceLeftBefore: Infinity, personalCreditSeconds: 0 }).fromTeamCredits,
    ).toBe(0);
  });
});
