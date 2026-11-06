import {
  applyAttempt,
  assignmentStatus,
  isTargetComplete,
  targetStatus,
  TargetProgress,
} from './assignment-progress.utils';

const fresh = (): TargetProgress => ({
  attempts_count: 0,
  best_score: null,
  last_attempt_at: null,
  completed_at: null,
  counted_call_ids: [],
});
const at = new Date('2026-11-06T10:00:00Z');

describe('applyAttempt', () => {
  it('completes after the required attempts when there is no target score', () => {
    const rules = { required_attempts: 2, target_score: null };
    const first = applyAttempt(fresh(), rules, { callId: 'a', score: 40, at });
    expect(first.attempts_count).toBe(1);
    expect(first.completed_at).toBeNull();
    const second = applyAttempt(first, rules, { callId: 'b', score: 30, at });
    expect(second.attempts_count).toBe(2);
    expect(second.best_score).toBe(40);
    expect(second.completed_at).toEqual(at);
  });

  it('needs the best score to reach the target', () => {
    const rules = { required_attempts: 1, target_score: 70 };
    const low = applyAttempt(fresh(), rules, { callId: 'a', score: 60, at });
    expect(low.completed_at).toBeNull();
    const high = applyAttempt(low, rules, { callId: 'b', score: 75, at });
    expect(high.completed_at).toEqual(at);
  });

  it('counts a re-run analysis of the same call only once', () => {
    const rules = { required_attempts: 3, target_score: null };
    const once = applyAttempt(fresh(), rules, { callId: 'a', score: 50, at });
    expect(applyAttempt(once, rules, { callId: 'a', score: 90, at })).toBeNull();
  });

  it('ignores calls without an analysis score', () => {
    const rules = { required_attempts: 1, target_score: null };
    expect(applyAttempt(fresh(), rules, { callId: 'a', score: null, at })).toBeNull();
  });

  it('keeps the original completion date', () => {
    const rules = { required_attempts: 1, target_score: null };
    const done = applyAttempt(fresh(), rules, { callId: 'a', score: 50, at });
    const later = new Date('2026-11-07T10:00:00Z');
    expect(applyAttempt(done, rules, { callId: 'b', score: 80, at: later }).completed_at).toEqual(at);
  });
});

describe('status', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const past = new Date('2026-11-05T00:00:00Z');

  it('derives target status', () => {
    expect(targetStatus({ completed_at: at }, past, now)).toBe('completed');
    expect(targetStatus({ completed_at: null }, past, now)).toBe('overdue');
    expect(targetStatus({ completed_at: null }, null, now)).toBe('open');
  });

  it('derives assignment status', () => {
    expect(assignmentStatus([{ completed_at: at }], past, now)).toBe('completed');
    expect(assignmentStatus([{ completed_at: at }, { completed_at: null }], past, now)).toBe('overdue');
    expect(assignmentStatus([], null, now)).toBe('open');
  });

  it('isTargetComplete requires at least one attempt', () => {
    expect(isTargetComplete({ attempts_count: 0, best_score: null }, { required_attempts: 0, target_score: null })).toBe(false);
  });
});
