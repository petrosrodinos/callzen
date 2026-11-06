import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { findOwnedCall } from '@/modules/calls/utils/snapshot.utils';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { SlidingWindowLimiter } from '@/shared/utils/rate-limit/sliding-window-limiter';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import {
  canDeleteComment,
  canEditComment,
  canReplyTo,
  canWriteOnCall,
  CommentViewer,
} from '../utils/comment-rules.utils';

type CommentRow = {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  at_ms: number | null;
  body: string;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  author: { id: string; full_name: string | null; email: string } | null;
};

// Coach notes on calls (§10.1d). Kept with the call and removed with it; never expired.
@Injectable()
export class CommentsService {
  private readonly limiter = new SlidingWindowLimiter(20, 60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly planLimits: PlanLimitService,
  ) {}

  // Anyone who can read the call reads its comments, whatever the plan (comments are independent of analysis).
  async list(ctx: OrgContext, callId: string) {
    const call = await findOwnedCall(this.prisma, ctx, callId, undefined, 'read');
    const viewer = await this.viewer(ctx);
    const rows = await this.prisma.callComment.findMany({
      where: { call_id: callId },
      include: { author: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'asc' },
    });
    const replies = rows.filter((row) => row.parent_id);
    const threads = rows
      .filter((row) => !row.parent_id)
      // A deleted thread stays only as a placeholder while it still has replies.
      .filter((row) => !row.deleted_at || replies.some((r) => r.parent_id === row.id && !r.deleted_at))
      .map((thread) => ({
        ...this.serialize(thread, viewer, call.user_id),
        replies: replies
          .filter((reply) => reply.parent_id === thread.id && !reply.deleted_at)
          .map((reply) => this.serialize(reply, viewer, call.user_id)),
      }));
    return {
      can_comment: canWriteOnCall(viewer, call.user_id),
      feature_enabled: viewer.featureEnabled,
      data: threads,
    };
  }

  async create(ctx: OrgContext, callId: string, dto: CreateCommentDto) {
    const call = await findOwnedCall(this.prisma, ctx, callId, undefined, 'read');
    const viewer = await this.viewer(ctx);
    if (!viewer.featureEnabled)
      await this.planLimits.assertFeature(ctx, PlanFeatures.CALL_COMMENTS);

    let parent: { id: string; author_id: string | null } | null = null;
    if (dto.parent_id) {
      const row = await this.prisma.callComment.findFirst({
        where: { id: dto.parent_id, call_id: callId },
      });
      if (!row) throw new NotFoundException('Comment not found');
      if (
        !canReplyTo(viewer, call.user_id, {
          authorId: row.author_id,
          deleted: !!row.deleted_at,
          isReply: !!row.parent_id,
        })
      )
        throw new ForbiddenException({
          message: 'You cannot reply here',
          code: 'COMMENT_NOT_ALLOWED',
        });
      parent = row;
    } else if (!canWriteOnCall(viewer, call.user_id)) {
      throw new ForbiddenException({
        message: 'You can only comment on your own calls',
        code: 'COMMENT_NOT_ALLOWED',
      });
    }
    this.limiter.assert(ctx.userId, 'You are commenting too fast. Try again in a minute.');

    const body = dto.body.trim();
    if (!body) throw new BadRequestException('The comment is empty');
    const comment = await this.prisma.callComment.create({
      data: {
        call_id: callId,
        organisation_id: ctx.organisationId,
        author_id: ctx.userId,
        parent_id: parent?.id ?? null,
        // Replies inherit nothing: only threads are pinned to a moment.
        at_ms: parent ? null : (dto.at_ms ?? null),
        body,
      },
      include: { author: { select: { id: true, full_name: true, email: true } } },
    });

    const authorName = comment.author?.full_name || comment.author?.email || null;
    const params = {
      call_id: callId,
      comment_id: comment.id,
      thread_id: parent?.id ?? comment.id,
      at_ms: comment.at_ms,
      author_id: ctx.userId,
      author_name: authorName,
    };
    if (parent) {
      if (parent.author_id && parent.author_id !== ctx.userId)
        this.notifications.notify({
          organisationId: ctx.organisationId,
          userIds: [parent.author_id],
          type: NotificationType.COMMENT_REPLY,
          params,
        });
    } else if (call.user_id !== ctx.userId) {
      this.notifications.notify({
        organisationId: ctx.organisationId,
        userIds: [call.user_id],
        type: NotificationType.COMMENT_NEW,
        params,
      });
    }
    return this.serialize(comment, viewer, call.user_id);
  }

  async update(ctx: OrgContext, callId: string, commentId: string, dto: UpdateCommentDto) {
    const call = await findOwnedCall(this.prisma, ctx, callId, undefined, 'read');
    const viewer = await this.viewer(ctx);
    const comment = await this.getComment(callId, commentId);
    if (!canEditComment(viewer, this.target(comment)))
      throw new ForbiddenException({
        message: 'You can only edit your own comments',
        code: 'COMMENT_NOT_ALLOWED',
      });
    const updated = await this.prisma.callComment.update({
      where: { id: commentId },
      data: { body: dto.body.trim(), edited_at: new Date() },
      include: { author: { select: { id: true, full_name: true, email: true } } },
    });
    return this.serialize(updated, viewer, call.user_id);
  }

  // Soft delete, so a thread is not broken.
  async remove(ctx: OrgContext, callId: string, commentId: string) {
    await findOwnedCall(this.prisma, ctx, callId, undefined, 'read');
    const viewer = await this.viewer(ctx);
    const comment = await this.getComment(callId, commentId);
    if (!canDeleteComment(viewer, this.target(comment)))
      throw new ForbiddenException({
        message: 'You cannot delete this comment',
        code: 'COMMENT_NOT_ALLOWED',
      });
    await this.prisma.callComment.update({
      where: { id: commentId },
      data: { deleted_at: new Date() },
    });
    return { id: commentId, deleted: true };
  }

  // Latest comments on a student's calls, for the student page.
  async recentForUser(organisationId: string, userId: string, take = 10) {
    const rows = await this.prisma.callComment.findMany({
      where: {
        organisation_id: organisationId,
        deleted_at: null,
        call: { user_id: userId },
      },
      orderBy: { created_at: 'desc' },
      take,
      include: {
        author: { select: { id: true, full_name: true, email: true } },
        call: { select: { id: true, title: true, started_at: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      call_id: row.call.id,
      call_title: row.call.title,
      at_ms: row.at_ms,
      body: row.body,
      author: row.author
        ? { id: row.author.id, name: row.author.full_name || row.author.email }
        : null,
      created_at: row.created_at,
    }));
  }

  private async viewer(ctx: OrgContext): Promise<CommentViewer> {
    return {
      userId: ctx.userId,
      canCoach: can(ctx, Permissions.COACHING_MANAGE),
      canManageAllCalls: can(ctx, Permissions.CALLS_MANAGE_ALL),
      featureEnabled: await this.planLimits.hasFeature(
        ctx.organisationId,
        PlanFeatures.CALL_COMMENTS,
      ),
    };
  }

  private async getComment(callId: string, commentId: string) {
    const comment = await this.prisma.callComment.findFirst({
      where: { id: commentId, call_id: callId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private target(comment: { author_id: string | null; deleted_at: Date | null; parent_id: string | null }) {
    return {
      authorId: comment.author_id,
      deleted: !!comment.deleted_at,
      isReply: !!comment.parent_id,
    };
  }

  private serialize(row: CommentRow, viewer: CommentViewer, callOwnerId: string) {
    const target = this.target(row);
    return {
      id: row.id,
      parent_id: row.parent_id,
      at_ms: row.at_ms,
      body: row.deleted_at ? null : row.body,
      deleted: !!row.deleted_at,
      edited_at: row.edited_at,
      created_at: row.created_at,
      author: row.author
        ? { id: row.author.id, name: row.author.full_name || row.author.email }
        : null,
      can_edit: canEditComment(viewer, target),
      can_delete: canDeleteComment(viewer, target),
      can_reply: !row.parent_id && canReplyTo(viewer, callOwnerId, target),
    };
  }
}
