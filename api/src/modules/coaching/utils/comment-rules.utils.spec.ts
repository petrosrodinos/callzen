import {
  canDeleteComment,
  canEditComment,
  canReplyTo,
  canWriteOnCall,
  CommentViewer,
} from './comment-rules.utils';

const coach: CommentViewer = { userId: 'coach', canCoach: true, canManageAllCalls: true, featureEnabled: true };
const student: CommentViewer = { userId: 'student', canCoach: false, canManageAllCalls: false, featureEnabled: true };
const thread = { authorId: 'coach', deleted: false, isReply: false };

describe('comment rules', () => {
  it('lets coaches write on any call and students only on their own', () => {
    expect(canWriteOnCall(coach, 'student')).toBe(true);
    expect(canWriteOnCall(student, 'student')).toBe(true);
    expect(canWriteOnCall(student, 'other')).toBe(false);
  });

  it('blocks writing when the plan lacks the feature', () => {
    expect(canWriteOnCall({ ...coach, featureEnabled: false }, 'student')).toBe(false);
  });

  it('allows one level of replies only', () => {
    expect(canReplyTo(student, 'student', thread)).toBe(true);
    expect(canReplyTo(student, 'student', { ...thread, isReply: true })).toBe(false);
    expect(canReplyTo(student, 'student', { ...thread, deleted: true })).toBe(false);
    expect(canReplyTo(student, 'other', thread)).toBe(false);
  });

  it('lets only authors edit', () => {
    expect(canEditComment(coach, thread)).toBe(true);
    expect(canEditComment(student, thread)).toBe(false);
  });

  it('lets authors and calls.manage_all delete', () => {
    expect(canDeleteComment(student, { authorId: 'student', deleted: false, isReply: true })).toBe(true);
    expect(canDeleteComment(student, thread)).toBe(false);
    expect(canDeleteComment({ ...student, canManageAllCalls: true }, thread)).toBe(true);
    expect(canDeleteComment(coach, { ...thread, deleted: true })).toBe(false);
  });
});
