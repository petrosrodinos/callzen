import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, OrgRole, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AgentAccessService } from '@/modules/agent-access/agent-access.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import {
  AssignmentQueryType,
  MyAssignmentsQueryType,
} from '../dto/coaching-query.schema';
import {
  applyAttempt,
  assignmentStatus,
  AssignmentStatuses,
  targetStatus,
} from '../utils/assignment-progress.utils';
import { CoachingMembersService } from './coaching-members.service';

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

const assignmentInclude = {
  targets: {
    include: { user: { select: { id: true, full_name: true, email: true } } },
    orderBy: { created_at: 'asc' },
  },
  practice_agent: { select: { id: true, name: true, archived_at: true } },
  created_by: { select: { id: true, full_name: true, email: true } },
} satisfies Prisma.PracticeAssignmentInclude;

type AssignmentWithTargets = Prisma.PracticeAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

const userName = (user: { full_name: string | null; email: string } | null) =>
  user ? user.full_name || user.email : null;

// Practice assignments (§10.1c): coaches assign a prospect to students; completion is tracked automatically
// from analyzed practice calls started from the assignment.
@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly agentAccess: AgentAccessService,
    private readonly planLimits: PlanLimitService,
    private readonly members: CoachingMembersService,
  ) {}

  async create(ctx: OrgContext, dto: CreateAssignmentDto) {
    await this.planLimits.assertWritable(ctx);
    const prospect = await this.prisma.practiceAgent.findFirst({
      where: {
        id: dto.practice_agent_id,
        organisation_id: ctx.organisationId,
        archived_at: null,
      },
      select: { id: true, name: true },
    });
    if (!prospect) throw new NotFoundException('Practice prospect not found');
    const dueAt = this.parseDue(dto.due_at);
    const userIds = await this.resolveTargets(ctx.organisationId, dto);

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.practiceAssignment.create({
        data: {
          organisation_id: ctx.organisationId,
          created_by_id: ctx.userId,
          practice_agent_id: prospect.id,
          practice_agent_name: prospect.name,
          title: dto.title.trim(),
          instructions: dto.instructions?.trim() || null,
          due_at: dueAt,
          target_score: dto.target_score ?? null,
          required_attempts: dto.required_attempts ?? 1,
          all_members: dto.all_members ?? false,
          targets: { create: userIds.map((user_id) => ({ user_id })) },
        },
      });
      // Assigning practice grants access to a restricted prospect (§10.1h rule 4).
      await this.agentAccess.grantPracticeAgentAccess(
        ctx.organisationId,
        prospect.id,
        userIds,
        ctx.userId,
        tx,
      );
      return created;
    });

    this.notifyNew(ctx.organisationId, assignment.id, assignment.title, userIds);
    return this.findOne(ctx, assignment.id);
  }

  async findAll(ctx: OrgContext, query: AssignmentQueryType) {
    const archived = query.status === 'archived';
    const assignments = await this.prisma.practiceAssignment.findMany({
      where: {
        organisation_id: ctx.organisationId,
        archived_at: archived ? { not: null } : null,
        ...(query.search && {
          title: { contains: query.search, mode: 'insensitive' },
        }),
        ...(query.user_id && { targets: { some: { user_id: query.user_id } } }),
      },
      include: assignmentInclude,
      orderBy: [{ due_at: { sort: 'asc', nulls: 'last' } }, { created_at: 'desc' }],
    });

    const now = new Date();
    const filtered = assignments.filter((assignment) => {
      if (query.status === 'all' || archived) return true;
      return assignmentStatus(assignment.targets, assignment.due_at, now) === query.status;
    });
    const total = filtered.length;
    const page = filtered.slice((query.page - 1) * query.limit, query.page * query.limit);
    const totalPages = Math.ceil(total / query.limit);
    return {
      data: page.map((assignment) => this.summary(assignment, now)),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: totalPages,
        has_next: query.page < totalPages,
        has_prev: query.page > 1,
      },
    };
  }

  async findOne(ctx: OrgContext, id: string) {
    const assignment = await this.getOwned(ctx, id);
    const now = new Date();
    const calls = await this.prisma.call.findMany({
      where: { assignment_id: id, organisation_id: ctx.organisationId },
      orderBy: { started_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        started_at: true,
        duration_seconds: true,
        status: true,
        analysis: { select: { overall_score: true } },
      },
    });
    return {
      ...this.summary(assignment, now),
      instructions: assignment.instructions,
      targets: assignment.targets.map((target) => ({
        user_id: target.user_id,
        name: userName(target.user),
        attempts_count: target.attempts_count,
        best_score: target.best_score,
        last_attempt_at: target.last_attempt_at,
        completed_at: target.completed_at,
        status: targetStatus(target, assignment.due_at, now),
        attempts: calls
          .filter((call) => call.user_id === target.user_id)
          .map((call) => ({
            call_id: call.id,
            started_at: call.started_at,
            duration_seconds: call.duration_seconds,
            status: call.status,
            score: call.analysis?.overall_score ?? null,
          })),
      })),
    };
  }

  async update(ctx: OrgContext, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.getOwned(ctx, id);
    if (dto.archived === false && assignment.archived_at)
      await this.planLimits.assertWritable(ctx);
    const dueAt = dto.due_at !== undefined ? this.parseDue(dto.due_at) : undefined;

    // New students can be added; students without attempts can be removed (history is never dropped).
    let added: string[] = [];
    const wantsAll = dto.all_members ?? assignment.all_members;
    if (dto.user_ids || (dto.all_members && !assignment.all_members)) {
      const wanted = await this.resolveTargets(ctx.organisationId, {
        all_members: wantsAll,
        user_ids: dto.user_ids ?? assignment.targets.map((t) => t.user_id),
      });
      const current = new Set(assignment.targets.map((t) => t.user_id));
      added = wanted.filter((userId) => !current.has(userId));
      const removable = assignment.targets
        .filter((t) => !wanted.includes(t.user_id) && t.attempts_count === 0)
        .map((t) => t.user_id);
      await this.prisma.$transaction(async (tx) => {
        if (added.length)
          await tx.assignmentTarget.createMany({
            data: added.map((user_id) => ({ assignment_id: id, user_id })),
            skipDuplicates: true,
          });
        if (removable.length && !wantsAll)
          await tx.assignmentTarget.deleteMany({
            where: { assignment_id: id, user_id: { in: removable } },
          });
        if (assignment.practice_agent_id)
          await this.agentAccess.grantPracticeAgentAccess(
            ctx.organisationId,
            assignment.practice_agent_id,
            added,
            ctx.userId,
            tx,
          );
      });
    }

    await this.prisma.practiceAssignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions?.trim() || null,
        }),
        ...(dueAt !== undefined && { due_at: dueAt, due_soon_notified_at: null }),
        ...(dto.target_score !== undefined && { target_score: dto.target_score }),
        ...(dto.required_attempts !== undefined && {
          required_attempts: dto.required_attempts,
        }),
        ...(dto.all_members !== undefined && { all_members: dto.all_members }),
        ...(dto.archived !== undefined && {
          archived_at: dto.archived ? new Date() : null,
        }),
      },
    });
    this.notifyNew(ctx.organisationId, id, dto.title ?? assignment.title, added);
    return this.findOne(ctx, id);
  }

  async remove(ctx: OrgContext, id: string) {
    await this.getOwned(ctx, id);
    // Calls keep existing; their assignment link is cleared (onDelete: SetNull).
    await this.prisma.practiceAssignment.delete({ where: { id } });
    return { id, deleted: true };
  }

  // The student side: "Assigned to me".
  async mine(ctx: OrgContext, query: MyAssignmentsQueryType) {
    const targets = await this.prisma.assignmentTarget.findMany({
      where: {
        user_id: ctx.userId,
        assignment: { organisation_id: ctx.organisationId, archived_at: null },
        ...(query.status === 'open' && { completed_at: null }),
      },
      include: {
        assignment: {
          include: {
            practice_agent: { select: { id: true, name: true, archived_at: true } },
            created_by: { select: { id: true, full_name: true, email: true } },
          },
        },
      },
    });
    const now = new Date();
    return targets
      .map((target) => {
        const assignment = target.assignment;
        return {
          id: assignment.id,
          title: assignment.title,
          instructions: assignment.instructions,
          due_at: assignment.due_at,
          target_score: assignment.target_score,
          required_attempts: assignment.required_attempts,
          practice_agent_id: assignment.practice_agent_id,
          practice_agent_name: assignment.practice_agent_name,
          // A removed or archived prospect cannot be started (§14).
          can_start: !!assignment.practice_agent && !assignment.practice_agent.archived_at,
          assigned_by: userName(assignment.created_by),
          attempts_count: target.attempts_count,
          best_score: target.best_score,
          completed_at: target.completed_at,
          status: targetStatus(target, assignment.due_at, now),
          created_at: assignment.created_at,
        };
      })
      .sort(
        (a, b) =>
          (a.due_at?.getTime() ?? Infinity) - (b.due_at?.getTime() ?? Infinity),
      );
  }

  // Practice started from an assignment: the caller must be one of its students and use its prospect.
  async assertStartable(ctx: OrgContext, assignmentId: string, practiceAgentId: string) {
    const target = await this.prisma.assignmentTarget.findUnique({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: ctx.userId } },
      include: { assignment: true },
    });
    const assignment = target?.assignment;
    if (
      !assignment ||
      assignment.organisation_id !== ctx.organisationId ||
      assignment.archived_at
    )
      throw new NotFoundException('Assignment not found');
    if (assignment.practice_agent_id !== practiceAgentId)
      throw new BadRequestException('This assignment uses a different prospect');
    return assignment;
  }

  // Post-step after a successful analysis (§10.1c). The analysis itself is unchanged; keyed by call id so an
  // analysis re-run counts once.
  async recordAttempt(callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        user_id: true,
        organisation_id: true,
        assignment_id: true,
        started_at: true,
        analysis: { select: { overall_score: true } },
        assignment: true,
      },
    });
    if (!call?.assignment_id || !call.assignment) return;
    const target = await this.prisma.assignmentTarget.findUnique({
      where: {
        assignment_id_user_id: { assignment_id: call.assignment_id, user_id: call.user_id },
      },
    });
    if (!target) return;

    const next = applyAttempt(target, call.assignment, {
      callId,
      score: call.analysis?.overall_score,
      at: new Date(),
    });
    if (!next) return;
    const updated = await this.prisma.assignmentTarget.updateMany({
      where: { id: target.id, NOT: { counted_call_ids: { has: callId } } },
      data: next,
    });
    if (!updated.count || target.completed_at || !next.completed_at) return;
    await this.notifyCompleted(call.assignment, call.user_id);
  }

  // Members who join later get "everyone" assignments too.
  async enrollNewMember(organisationId: string, userId: string, role: OrgRole) {
    if (role === OrgRole.OWNER) return;
    const assignments = await this.prisma.practiceAssignment.findMany({
      where: { organisation_id: organisationId, all_members: true, archived_at: null },
      select: { id: true, title: true, practice_agent_id: true },
    });
    for (const assignment of assignments) {
      await this.prisma.assignmentTarget.createMany({
        data: [{ assignment_id: assignment.id, user_id: userId }],
        skipDuplicates: true,
      });
      if (assignment.practice_agent_id)
        await this.agentAccess.grantPracticeAgentAccess(
          organisationId,
          assignment.practice_agent_id,
          [userId],
          null,
        );
      this.notifyNew(organisationId, assignment.id, assignment.title, [userId]);
    }
  }

  // Hourly: remind students 24 hours before the due date while their assignment is still open.
  async sendDueSoonReminders(now: Date = new Date()) {
    const due = await this.prisma.practiceAssignment.findMany({
      where: {
        archived_at: null,
        due_soon_notified_at: null,
        due_at: { gt: now, lte: new Date(now.getTime() + DUE_SOON_MS) },
      },
      include: { targets: { where: { completed_at: null }, select: { user_id: true } } },
    });
    for (const assignment of due) {
      const claimed = await this.prisma.practiceAssignment.updateMany({
        where: { id: assignment.id, due_soon_notified_at: null },
        data: { due_soon_notified_at: now },
      });
      if (!claimed.count) continue;
      if (!(await this.planLimits.hasFeature(assignment.organisation_id, PlanFeatures.PRACTICE_ASSIGNMENTS)))
        continue;
      this.notifications.notify({
        organisationId: assignment.organisation_id,
        userIds: assignment.targets.map((t) => t.user_id),
        type: NotificationType.ASSIGNMENT_DUE_SOON,
        params: {
          assignment_id: assignment.id,
          title: assignment.title,
          due_at: assignment.due_at?.toISOString(),
        },
        dedupeKey: `assignment-due:${assignment.id}`,
      });
    }
    return due.length;
  }

  private summary(assignment: AssignmentWithTargets, now: Date) {
    const statuses = assignment.targets.map((t) => targetStatus(t, assignment.due_at, now));
    return {
      id: assignment.id,
      title: assignment.title,
      practice_agent_id: assignment.practice_agent_id,
      practice_agent_name: assignment.practice_agent_name,
      prospect_removed:
        !assignment.practice_agent || !!assignment.practice_agent.archived_at,
      due_at: assignment.due_at,
      target_score: assignment.target_score,
      required_attempts: assignment.required_attempts,
      all_members: assignment.all_members,
      archived_at: assignment.archived_at,
      created_at: assignment.created_at,
      created_by: assignment.created_by
        ? { id: assignment.created_by.id, name: userName(assignment.created_by) }
        : null,
      status: assignmentStatus(assignment.targets, assignment.due_at, now),
      progress: {
        total: statuses.length,
        completed: statuses.filter((s) => s === AssignmentStatuses.COMPLETED).length,
        overdue: statuses.filter((s) => s === AssignmentStatuses.OVERDUE).length,
        open: statuses.filter((s) => s === AssignmentStatuses.OPEN).length,
      },
    };
  }

  private async getOwned(ctx: OrgContext, id: string) {
    const assignment = await this.prisma.practiceAssignment.findFirst({
      where: { id, organisation_id: ctx.organisationId },
      include: assignmentInclude,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  private parseDue(value: string | undefined | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (date.getTime() <= Date.now())
      throw new BadRequestException({
        message: 'The due date must be in the future',
        code: 'DUE_DATE_IN_PAST',
      });
    return date;
  }

  // "Everyone" targets every student (coaches excluded); otherwise the chosen people must be members.
  private async resolveTargets(
    organisationId: string,
    dto: { all_members?: boolean; user_ids?: string[] },
  ): Promise<string[]> {
    if (dto.all_members)
      return (await this.members.students(organisationId)).map((m) => m.user_id);
    const ids = [...new Set(dto.user_ids ?? [])];
    if (!ids.length)
      throw new BadRequestException({
        message: 'Choose at least one student, or assign it to everyone',
        code: 'NO_STUDENTS',
      });
    const memberships = await this.prisma.membership.count({
      where: { organisation_id: organisationId, user_id: { in: ids } },
    });
    if (memberships !== ids.length)
      throw new BadRequestException('Every student must be a member of this organisation');
    return ids;
  }

  private notifyNew(organisationId: string, assignmentId: string, title: string, userIds: string[]) {
    if (!userIds.length) return;
    this.notifications.notify({
      organisationId,
      userIds,
      type: NotificationType.ASSIGNMENT_NEW,
      params: { assignment_id: assignmentId, title },
    });
  }

  // Grouped per assignment per day so a class-wide assignment doesn't send one notification per student.
  private async notifyCompleted(
    assignment: { id: string; organisation_id: string; title: string; created_by_id: string | null },
    studentId: string,
  ) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [completedToday, coachIds] = await Promise.all([
      this.prisma.assignmentTarget.count({
        where: { assignment_id: assignment.id, completed_at: { gte: startOfDay } },
      }),
      this.members.coachIds(assignment.organisation_id),
    ]);
    const recipients = [
      ...new Set([assignment.created_by_id, ...coachIds].filter(Boolean)),
    ].filter((id) => id !== studentId);
    this.notifications.notify({
      organisationId: assignment.organisation_id,
      userIds: recipients,
      type: NotificationType.ASSIGNMENT_COMPLETED,
      params: {
        assignment_id: assignment.id,
        title: assignment.title,
        user_id: studentId,
        completed_count: completedToday,
      },
      dedupeKey: `assignment-completed:${assignment.id}:${startOfDay.toISOString().slice(0, 10)}`,
    });
  }
}
