// Practice assignment rules (§10.1c). Pure functions so they are unit-tested in isolation.

export const AssignmentStatuses = {
  OPEN: 'open',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;
export type AssignmentStatus =
  (typeof AssignmentStatuses)[keyof typeof AssignmentStatuses];

export interface TargetProgress {
  attempts_count: number;
  best_score: number | null;
  last_attempt_at: Date | null;
  completed_at: Date | null;
  counted_call_ids: string[];
}

export interface AssignmentRules {
  required_attempts: number;
  target_score: number | null;
}

export const isTargetComplete = (
  progress: Pick<TargetProgress, 'attempts_count' | 'best_score'>,
  rules: AssignmentRules,
): boolean =>
  progress.attempts_count >= Math.max(1, rules.required_attempts) &&
  (rules.target_score == null ||
    (progress.best_score != null && progress.best_score >= rules.target_score));

// Applies one analyzed practice call to a student's target. Returns null when it must not count: the call was
// already counted (an analysis re-run counts once) or it produced no score (no analysis).
export const applyAttempt = (
  progress: TargetProgress,
  rules: AssignmentRules,
  attempt: { callId: string; score: number | null | undefined; at: Date },
): TargetProgress | null => {
  if (attempt.score == null) return null;
  if (progress.counted_call_ids.includes(attempt.callId)) return null;

  const next: TargetProgress = {
    attempts_count: progress.attempts_count + 1,
    best_score:
      progress.best_score == null
        ? attempt.score
        : Math.max(progress.best_score, attempt.score),
    last_attempt_at: attempt.at,
    completed_at: progress.completed_at,
    counted_call_ids: [...progress.counted_call_ids, attempt.callId],
  };
  if (!next.completed_at && isTargetComplete(next, rules))
    next.completed_at = attempt.at;
  return next;
};

// Status is derived, never stored.
export const targetStatus = (
  target: Pick<TargetProgress, 'completed_at'>,
  dueAt: Date | null,
  now: Date = new Date(),
): AssignmentStatus => {
  if (target.completed_at) return AssignmentStatuses.COMPLETED;
  if (dueAt && dueAt < now) return AssignmentStatuses.OVERDUE;
  return AssignmentStatuses.OPEN;
};

// An assignment is completed when every target is; overdue when past due with any target still open.
export const assignmentStatus = (
  targets: Pick<TargetProgress, 'completed_at'>[],
  dueAt: Date | null,
  now: Date = new Date(),
): AssignmentStatus => {
  if (targets.length && targets.every((t) => t.completed_at))
    return AssignmentStatuses.COMPLETED;
  if (dueAt && dueAt < now) return AssignmentStatuses.OVERDUE;
  return AssignmentStatuses.OPEN;
};
