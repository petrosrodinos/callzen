import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentVisibility,
  NotificationType,
  OrgRole,
  Prisma,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  assistantAgentVisibleWhere,
  canManageAllCopilots,
  isVisibleTo,
  practiceAgentVisibleWhere,
} from './utils/agent-access.utils';
import {
  ShareAgentsDto,
  UpdateAgentAccessDto,
  UpdateStudentAccessDto,
} from './dto/agent-access.dto';
import {
  StudentAccess,
  StudentAccessItem,
} from './interfaces/agent-access.interface';

type Db = Prisma.TransactionClient | PrismaService;

export const AgentAccessErrorCodes = {
  NOT_A_MEMBER: 'ACCESS_USER_NOT_A_MEMBER',
  CANNOT_SHARE_PRIVATE: 'CANNOT_SHARE_PRIVATE_PROSPECT',
  NO_SHARED_COPILOT: 'NO_SHARED_COPILOT',
} as const;

// Who may see and use co-pilots and practice prospects (§10.1h). Used on every list, detail, call-start and
// dashboard path so no path is forgotten.
@Injectable()
export class AgentAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly planLimits: PlanLimitService,
  ) {}

  assistantAgentVisibleWhere(ctx: OrgContext) {
    return assistantAgentVisibleWhere(ctx);
  }

  practiceAgentVisibleWhere(ctx: OrgContext) {
    return practiceAgentVisibleWhere(ctx);
  }

  // Detail requests for something the viewer cannot see return 404, so existence is not leaked.
  async findVisibleAssistantAgent(ctx: OrgContext, id: string) {
    const agent = await this.prisma.assistantAgent.findFirst({
      where: {
        id,
        organisation_id: ctx.organisationId,
        ...assistantAgentVisibleWhere(ctx),
      },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Assistant agent not found',
        code: ErrorCodes.AssistantAgents.NOT_FOUND,
      });
    return agent;
  }

  async findVisiblePracticeAgent(ctx: OrgContext, id: string) {
    const agent = await this.prisma.practiceAgent.findFirst({
      where: {
        id,
        organisation_id: ctx.organisationId,
        ...practiceAgentVisibleWhere(ctx),
      },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Practice agent not found',
        code: ErrorCodes.PracticeAgents.NOT_FOUND,
      });
    return agent;
  }

  // A co-pilot for a call. Inside a practice session, the prospect's linked co-pilot is allowed even
  // without direct access (rule 7).
  async findUsableAssistantAgent(
    ctx: OrgContext,
    id: string,
    practice?: { linked_assistant_agent_id: string | null } | null,
  ) {
    const viaPractice = !!practice && practice.linked_assistant_agent_id === id;
    const agent = await this.prisma.assistantAgent.findFirst({
      where: {
        id,
        organisation_id: ctx.organisationId,
        archived_at: null,
        ...(viaPractice ? {} : assistantAgentVisibleWhere(ctx)),
      },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Assistant agent not found',
        code: ErrorCodes.AssistantAgents.NOT_FOUND,
      });
    return agent;
  }

  // The default co-pilot if visible, else the newest visible one (§14), or null.
  defaultUsableAssistantAgent(ctx: OrgContext) {
    return this.prisma.assistantAgent.findFirst({
      where: {
        organisation_id: ctx.organisationId,
        archived_at: null,
        ...assistantAgentVisibleWhere(ctx),
      },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
    });
  }

  // Ids of practice agents the viewer can access, from a candidate list.
  async accessiblePracticeAgentIds(ctx: OrgContext, ids: string[]) {
    if (!ids.length) return new Set<string>();
    const rows = await this.prisma.practiceAgent.findMany({
      where: {
        id: { in: ids },
        organisation_id: ctx.organisationId,
        ...practiceAgentVisibleWhere(ctx),
      },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }

  // Access lists are only shown to people who can manage them.
  async accessListsFor(
    kind: 'copilot' | 'prospect',
    ids: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!ids.length) return map;
    const rows =
      kind === 'copilot'
        ? (
            await this.prisma.assistantAgentAccess.findMany({
              where: { assistant_agent_id: { in: ids } },
              select: { assistant_agent_id: true, user_id: true },
            })
          ).map((r) => ({ id: r.assistant_agent_id, user_id: r.user_id }))
        : (
            await this.prisma.practiceAgentAccess.findMany({
              where: { practice_agent_id: { in: ids } },
              select: { practice_agent_id: true, user_id: true },
            })
          ).map((r) => ({ id: r.practice_agent_id, user_id: r.user_id }));
    for (const row of rows) map.set(row.id, [...(map.get(row.id) ?? []), row.user_id]);
    return map;
  }

  canManageCopilotAccess(ctx: OrgContext) {
    return canManageAllCopilots(ctx);
  }

  canManageProspectAccess(ctx: OrgContext, authorId: string | null) {
    return (
      can(ctx, Permissions.PROSPECTS_MANAGE_ALL) ||
      (authorId === ctx.userId && can(ctx, Permissions.PROSPECTS_MANAGE))
    );
  }

  // Rule 6: a student's own prospects start private (author + coach) when the plan has access control.
  async defaultPracticeVisibility(ctx: OrgContext): Promise<AgentVisibility> {
    if (ctx.role === OrgRole.OWNER || can(ctx, Permissions.PROSPECTS_MANAGE_ALL))
      return AgentVisibility.ORGANISATION;
    const enabled = await this.planLimits.hasFeature(
      ctx.organisationId,
      PlanFeatures.AGENT_ACCESS_CONTROL,
    );
    return enabled ? AgentVisibility.SELECTED : AgentVisibility.ORGANISATION;
  }

  async setAssistantAgentAccess(ctx: OrgContext, id: string, dto: UpdateAgentAccessDto) {
    const agent = await this.findVisibleAssistantAgent(ctx, id);
    const userIds = await this.assertMembers(ctx.organisationId, dto.user_ids);
    const added = await this.prisma.$transaction(async (tx) => {
      await tx.assistantAgent.update({
        where: { id: agent.id },
        data: { visibility: dto.visibility },
      });
      return this.replaceList(tx, 'copilot', agent.id, userIds, ctx.userId);
    });
    this.notifyShared(ctx.organisationId, dto.visibility === AgentVisibility.SELECTED ? added : [], {
      kind: 'copilot',
      id: agent.id,
    });
    return { id: agent.id, visibility: dto.visibility, access_user_ids: userIds };
  }

  async setPracticeAgentAccess(ctx: OrgContext, id: string, dto: UpdateAgentAccessDto) {
    const agent = await this.findVisiblePracticeAgent(ctx, id);
    const manageAll = can(ctx, Permissions.PROSPECTS_MANAGE_ALL);
    if (!this.canManageProspectAccess(ctx, agent.user_id))
      throw new ForbiddenException({
        message: 'You can only change who can use practice prospects you created',
        code: 'NOT_PROSPECT_AUTHOR',
      });
    const userIds = await this.assertMembers(ctx.organisationId, dto.user_ids);
    // Authors without manage_all keep their own prospects private: they cannot share them with others.
    if (!manageAll) {
      const others = userIds.filter((userId) => userId !== agent.user_id);
      if (others.length || dto.visibility === AgentVisibility.ORGANISATION)
        throw new ForbiddenException({
          message: 'Only your coach can share this prospect with other people',
          code: AgentAccessErrorCodes.CANNOT_SHARE_PRIVATE,
        });
    }
    const added = await this.prisma.$transaction(async (tx) => {
      await tx.practiceAgent.update({
        where: { id: agent.id },
        data: { visibility: dto.visibility },
      });
      return this.replaceList(tx, 'prospect', agent.id, userIds, ctx.userId);
    });
    this.notifyShared(ctx.organisationId, dto.visibility === AgentVisibility.SELECTED ? added : [], {
      kind: 'prospect',
      id: agent.id,
    });
    return { id: agent.id, visibility: dto.visibility, access_user_ids: userIds };
  }

  // Every co-pilot and prospect, with whether this student can use it (§10.1h, student page Access section).
  async studentAccess(ctx: OrgContext, studentId: string): Promise<StudentAccess> {
    await this.assertMembers(ctx.organisationId, [studentId]);
    const [copilots, prospects] = await Promise.all([
      this.prisma.assistantAgent.findMany({
        where: { organisation_id: ctx.organisationId },
        select: {
          id: true,
          name: true,
          visibility: true,
          user_id: true,
          archived_at: true,
          access_list: { select: { user_id: true } },
        },
        orderBy: [{ archived_at: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.practiceAgent.findMany({
        where: { organisation_id: ctx.organisationId },
        select: {
          id: true,
          name: true,
          visibility: true,
          user_id: true,
          archived_at: true,
          access_list: { select: { user_id: true } },
        },
        orderBy: [{ archived_at: 'asc' }, { name: 'asc' }],
      }),
    ]);
    const toItem = (item: (typeof copilots)[number]): StudentAccessItem => {
      const listed = item.access_list.map((row) => row.user_id);
      return {
        id: item.id,
        name: item.name,
        visibility: item.visibility,
        has_access: isVisibleTo(
          { visibility: item.visibility, user_id: item.user_id, access_user_ids: listed },
          studentId,
          false,
        ),
        is_private_to_student:
          item.visibility === AgentVisibility.SELECTED &&
          item.user_id === studentId &&
          listed.every((userId) => userId === studentId),
        author_id: item.user_id,
        archived: !!item.archived_at,
      };
    };
    return {
      user_id: studentId,
      copilots: copilots.map(toItem),
      prospects: prospects.map(toItem),
    };
  }

  // Sets which SELECTED items this student is on. ORGANISATION items are unaffected (everyone has them).
  async setStudentAccess(ctx: OrgContext, studentId: string, dto: UpdateStudentAccessDto) {
    await this.assertMembers(ctx.organisationId, [studentId]);
    const [copilots, prospects] = await Promise.all([
      this.prisma.assistantAgent.findMany({
        where: { organisation_id: ctx.organisationId, visibility: AgentVisibility.SELECTED },
        select: { id: true },
      }),
      this.prisma.practiceAgent.findMany({
        where: { organisation_id: ctx.organisationId, visibility: AgentVisibility.SELECTED },
        select: { id: true },
      }),
    ]);
    const copilotIds = new Set(copilots.map((c) => c.id));
    const prospectIds = new Set(prospects.map((p) => p.id));
    const wantCopilots = dto.assistant_agent_ids.filter((id) => copilotIds.has(id));
    const wantProspects = dto.practice_agent_ids.filter((id) => prospectIds.has(id));

    const [addedCopilots, addedProspects] = await this.prisma.$transaction(async (tx) => {
      const existingCopilots = await tx.assistantAgentAccess.findMany({
        where: { user_id: studentId, assistant_agent: { organisation_id: ctx.organisationId } },
        select: { assistant_agent_id: true },
      });
      const existingProspects = await tx.practiceAgentAccess.findMany({
        where: { user_id: studentId, practice_agent: { organisation_id: ctx.organisationId } },
        select: { practice_agent_id: true },
      });
      const hasCopilot = new Set(existingCopilots.map((r) => r.assistant_agent_id));
      const hasProspect = new Set(existingProspects.map((r) => r.practice_agent_id));

      await tx.assistantAgentAccess.deleteMany({
        where: {
          user_id: studentId,
          assistant_agent_id: { in: [...hasCopilot].filter((id) => !wantCopilots.includes(id)) },
        },
      });
      await tx.practiceAgentAccess.deleteMany({
        where: {
          user_id: studentId,
          practice_agent_id: { in: [...hasProspect].filter((id) => !wantProspects.includes(id)) },
        },
      });
      const newCopilots = wantCopilots.filter((id) => !hasCopilot.has(id));
      const newProspects = wantProspects.filter((id) => !hasProspect.has(id));
      if (newCopilots.length)
        await tx.assistantAgentAccess.createMany({
          data: newCopilots.map((id) => ({
            assistant_agent_id: id,
            user_id: studentId,
            granted_by_id: ctx.userId,
          })),
          skipDuplicates: true,
        });
      if (newProspects.length)
        await tx.practiceAgentAccess.createMany({
          data: newProspects.map((id) => ({
            practice_agent_id: id,
            user_id: studentId,
            granted_by_id: ctx.userId,
          })),
          skipDuplicates: true,
        });
      return [newCopilots, newProspects];
    });

    for (const id of addedCopilots)
      this.notifyShared(ctx.organisationId, [studentId], { kind: 'copilot', id });
    for (const id of addedProspects)
      this.notifyShared(ctx.organisationId, [studentId], { kind: 'prospect', id });
    return this.studentAccess(ctx, studentId);
  }

  // Bulk "Share with…": adds the members to each item and makes it SELECTED if it was not already.
  async share(ctx: OrgContext, dto: ShareAgentsDto) {
    const userIds = await this.assertMembers(ctx.organisationId, dto.user_ids);
    const copilotIds = dto.assistant_agent_ids ?? [];
    const prospectIds = dto.practice_agent_ids ?? [];
    if (copilotIds.length && !can(ctx, Permissions.AGENTS_MANAGE))
      throw new ForbiddenException({
        message: 'Your role does not allow this action',
        code: 'PERMISSION_DENIED',
        missing: [Permissions.AGENTS_MANAGE],
      });
    if (prospectIds.length && !can(ctx, Permissions.PROSPECTS_MANAGE_ALL))
      throw new ForbiddenException({
        message: 'Your role does not allow this action',
        code: 'PERMISSION_DENIED',
        missing: [Permissions.PROSPECTS_MANAGE_ALL],
      });

    const [copilots, prospects] = await Promise.all([
      this.prisma.assistantAgent.findMany({
        where: { id: { in: copilotIds }, organisation_id: ctx.organisationId },
        select: { id: true, visibility: true },
      }),
      this.prisma.practiceAgent.findMany({
        where: { id: { in: prospectIds }, organisation_id: ctx.organisationId },
        select: { id: true, visibility: true },
      }),
    ]);

    const shared: { kind: 'copilot' | 'prospect'; id: string; added: string[] }[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const copilot of copilots) {
        if (copilot.visibility === AgentVisibility.ORGANISATION) continue;
        shared.push({
          kind: 'copilot',
          id: copilot.id,
          added: await this.addToList(tx, 'copilot', copilot.id, userIds, ctx.userId),
        });
      }
      for (const prospect of prospects) {
        if (prospect.visibility === AgentVisibility.ORGANISATION) continue;
        shared.push({
          kind: 'prospect',
          id: prospect.id,
          added: await this.addToList(tx, 'prospect', prospect.id, userIds, ctx.userId),
        });
      }
    });
    for (const item of shared)
      this.notifyShared(ctx.organisationId, item.added, { kind: item.kind, id: item.id });
    return {
      shared: shared.map((item) => ({ kind: item.kind, id: item.id, added_user_ids: item.added })),
    };
  }

  // Adds members to a prospect's access list (assignments grant access, rule 4). Access is kept after the
  // assignment is archived or deleted. Only SELECTED prospects need rows; ORGANISATION ones are visible anyway.
  async grantPracticeAgentAccess(
    organisationId: string,
    practiceAgentId: string,
    userIds: string[],
    grantedById: string | null,
    db: Db = this.prisma,
  ): Promise<string[]> {
    const agent = await db.practiceAgent.findFirst({
      where: { id: practiceAgentId, organisation_id: organisationId },
      select: { id: true, visibility: true },
    });
    if (!agent || agent.visibility !== AgentVisibility.SELECTED || !userIds.length)
      return [];
    return this.addToList(db, 'prospect', practiceAgentId, userIds, grantedById);
  }

  notifyShared(
    organisationId: string,
    userIds: string[],
    item: { kind: 'copilot' | 'prospect'; id: string },
  ) {
    if (!userIds.length) return;
    this.notifications.notify({
      organisationId,
      userIds,
      type: NotificationType.AGENT_SHARED,
      params: { kind: item.kind, id: item.id },
      // Sharing many things at once is grouped per day.
      dedupeKey: `agent-shared:${new Date().toISOString().slice(0, 10)}`,
    });
  }

  private async addToList(
    db: Db,
    kind: 'copilot' | 'prospect',
    itemId: string,
    userIds: string[],
    grantedById: string | null,
  ): Promise<string[]> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return [];
    const existing =
      kind === 'copilot'
        ? (
            await db.assistantAgentAccess.findMany({
              where: { assistant_agent_id: itemId, user_id: { in: unique } },
              select: { user_id: true },
            })
          ).map((r) => r.user_id)
        : (
            await db.practiceAgentAccess.findMany({
              where: { practice_agent_id: itemId, user_id: { in: unique } },
              select: { user_id: true },
            })
          ).map((r) => r.user_id);
    const added = unique.filter((id) => !existing.includes(id));
    if (!added.length) return [];
    if (kind === 'copilot')
      await db.assistantAgentAccess.createMany({
        data: added.map((user_id) => ({
          assistant_agent_id: itemId,
          user_id,
          granted_by_id: grantedById,
        })),
        skipDuplicates: true,
      });
    else
      await db.practiceAgentAccess.createMany({
        data: added.map((user_id) => ({
          practice_agent_id: itemId,
          user_id,
          granted_by_id: grantedById,
        })),
        skipDuplicates: true,
      });
    return added;
  }

  // Replaces the whole list; returns the members who were newly added.
  private async replaceList(
    tx: Prisma.TransactionClient,
    kind: 'copilot' | 'prospect',
    itemId: string,
    userIds: string[],
    grantedById: string,
  ): Promise<string[]> {
    if (kind === 'copilot')
      await tx.assistantAgentAccess.deleteMany({
        where: { assistant_agent_id: itemId, user_id: { notIn: userIds } },
      });
    else
      await tx.practiceAgentAccess.deleteMany({
        where: { practice_agent_id: itemId, user_id: { notIn: userIds } },
      });
    return this.addToList(tx, kind, itemId, userIds, grantedById);
  }

  private async assertMembers(organisationId: string, userIds: string[]) {
    const unique = [...new Set(userIds)];
    if (!unique.length) return unique;
    const members = await this.prisma.membership.count({
      where: { organisation_id: organisationId, user_id: { in: unique } },
    });
    if (members !== unique.length)
      throw new BadRequestException({
        message: 'Everyone you share with must be a member of this organisation',
        code: AgentAccessErrorCodes.NOT_A_MEMBER,
      });
    return unique;
  }
}

