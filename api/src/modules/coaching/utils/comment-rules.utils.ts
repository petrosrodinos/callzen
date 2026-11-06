// Who may read and write coach comments on a call (§10.1d). Pure so the rules are unit-tested.

export const MAX_COMMENT_LENGTH = 2000;

export interface CommentViewer {
  userId: string;
  // coaching.manage: comment on any call in the organisation.
  canCoach: boolean;
  // calls.manage_all: remove anyone's comment.
  canManageAllCalls: boolean;
  // The plan includes call_comments. Reading never depends on it.
  featureEnabled: boolean;
}

export interface CommentTarget {
  authorId: string | null;
  deleted: boolean;
  isReply: boolean;
}

// Writers: coaching.manage on any call, or the call's owner on their own call. A student can therefore reply
// in threads on their own calls and can never start one on someone else's.
export const canWriteOnCall = (viewer: CommentViewer, callOwnerId: string) =>
  viewer.featureEnabled &&
  (viewer.canCoach || viewer.userId === callOwnerId);

// Replies are one level deep and only under live (not deleted) top-level comments.
export const canReplyTo = (
  viewer: CommentViewer,
  callOwnerId: string,
  parent: CommentTarget,
) => canWriteOnCall(viewer, callOwnerId) && !parent.isReply && !parent.deleted;

export const canEditComment = (viewer: CommentViewer, comment: CommentTarget) =>
  viewer.featureEnabled &&
  !comment.deleted &&
  comment.authorId != null &&
  comment.authorId === viewer.userId;

// Authors delete their own; calls.manage_all can remove any (deleting stays available after a downgrade).
export const canDeleteComment = (viewer: CommentViewer, comment: CommentTarget) =>
  !comment.deleted &&
  ((comment.authorId != null && comment.authorId === viewer.userId) ||
    viewer.canManageAllCalls);
