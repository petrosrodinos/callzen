// Pool, owner reserve and per-member caps (§8.3a). All values in seconds, for one kind and one period.
// null pool or cap = unlimited. Pure functions so the rules are unit-tested in isolation.

export interface PoolState {
  // P: plan allowance plus team credits (consumed this period + remaining). null = unlimited.
  poolSeconds: number | null;
  // R: owner reserve (0 when not set). Clamped to the pool.
  ownerReserveSeconds: number;
  // U_o / U_n: pool seconds used by OWNER members / everyone else (personal-credit seconds excluded).
  ownersUsedSeconds: number;
  othersUsedSeconds: number;
}

export interface MemberState {
  isOwner: boolean;
  // C: per-member cap for non-owners; null = no cap. Owners are never capped.
  memberCapSeconds: number | null;
  // u_m: this member's pool seconds used.
  memberUsedSeconds: number;
}

const nonNegative = (value: number) => (value > 0 ? value : 0);

// Seconds of plan pool (incl. team credits) and cap this person may still use. Infinity when unlimited.
export const availablePoolSeconds = (
  pool: PoolState,
  member: MemberState,
): number => {
  const capLeft =
    !member.isOwner && member.memberCapSeconds != null
      ? nonNegative(member.memberCapSeconds - member.memberUsedSeconds)
      : Infinity;
  if (pool.poolSeconds == null) return capLeft;

  const P = pool.poolSeconds;
  const R = Math.min(nonNegative(pool.ownerReserveSeconds), P);
  const used = pool.ownersUsedSeconds + pool.othersUsedSeconds;

  // Owners can spend their reserve and anything students left unused: the reserve is a guarantee, not a limit.
  if (member.isOwner) return nonNegative(P - used);

  // Non-owners are held to P − R; if owners used more than R, the extra also reduces what students have.
  const poolLeft = nonNegative(
    P - Math.max(R, pool.ownersUsedSeconds) - pool.othersUsedSeconds,
  );
  return Math.min(poolLeft, capLeft);
};

// What a student's meter shows as their total: the pool without the owner reserve (§8.3a).
export const visiblePoolSeconds = (
  pool: Pick<PoolState, 'poolSeconds' | 'ownerReserveSeconds'>,
  isOwner: boolean,
): number | null => {
  if (pool.poolSeconds == null) return null;
  if (isOwner) return pool.poolSeconds;
  return nonNegative(
    pool.poolSeconds - Math.min(pool.ownerReserveSeconds, pool.poolSeconds),
  );
};

export interface SettlementInput {
  callSeconds: number;
  // Pool + cap seconds the caller had before this call (availablePoolSeconds, computed without the call).
  availableBefore: number;
  // Plan allowance left before the call (without team credits). Infinity when unlimited.
  planAllowanceLeftBefore: number;
  personalCreditSeconds: number;
}

export interface Settlement {
  // Seconds charged to the shared pool (plan allowance, then team credits).
  fromPool: number;
  // Of fromPool, the part drawn from team credits (beyond the plan allowance).
  fromTeamCredits: number;
  // Seconds drawn from the caller's personal credits (never counted against the pool or caps).
  fromPersonalCredits: number;
  // Not covered by anything (concurrent-call race): logged as a soft overrun, never charged.
  overrun: number;
}

// How a finished call's seconds are paid for (§3.5): the pool and cap allowance first, team credits once the
// plan allowance is used up, then the caller's personal credits, oldest first.
export const settleSeconds = (input: SettlementInput): Settlement => {
  const seconds = nonNegative(Math.round(input.callSeconds));
  const fromPool = Math.min(seconds, nonNegative(input.availableBefore));
  const fromTeamCredits = Number.isFinite(input.planAllowanceLeftBefore)
    ? Math.min(fromPool, nonNegative(fromPool - input.planAllowanceLeftBefore))
    : 0;
  const overflow = seconds - fromPool;
  const fromPersonalCredits = Math.min(
    overflow,
    nonNegative(input.personalCreditSeconds),
  );
  return {
    fromPool,
    fromTeamCredits,
    fromPersonalCredits,
    overrun: overflow - fromPersonalCredits,
  };
};

export const minutesToSeconds = (minutes: number | null): number | null =>
  minutes == null ? null : Math.round(minutes * 60);
