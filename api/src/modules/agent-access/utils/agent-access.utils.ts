import { AgentVisibility, Prisma } from 'generated/prisma';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';

// Rules from §10.1h. A member sees and can use an item when it is ORGANISATION, they authored it, or they are on
// its access list. Managers (agents.manage for co-pilots, calls.view_all for prospects) see everything.

export interface AccessCheckItem {
  visibility: AgentVisibility;
  user_id: string | null;
  access_user_ids: string[];
}

export const canManageAllCopilots = (ctx: Pick<OrgContext, 'permissions'>) =>
  can(ctx as OrgContext, Permissions.AGENTS_MANAGE);

export const canSeeAllProspects = (ctx: Pick<OrgContext, 'permissions'>) =>
  can(ctx as OrgContext, Permissions.CALLS_VIEW_ALL);

// Pure rule, used by tests and in-memory checks.
export const isVisibleTo = (
  item: AccessCheckItem,
  userId: string,
  hasFullVisibility: boolean,
): boolean =>
  hasFullVisibility ||
  item.visibility === AgentVisibility.ORGANISATION ||
  item.user_id === userId ||
  item.access_user_ids.includes(userId);

// Rule 7: a prospect's linked co-pilot can be used inside that prospect's practice session.
export const canUseCopilotInPractice = (
  copilot: AccessCheckItem & { id: string },
  prospect: { linked_assistant_agent_id: string | null } | null,
  userId: string,
  hasFullVisibility: boolean,
): boolean =>
  isVisibleTo(copilot, userId, hasFullVisibility) ||
  (!!prospect && prospect.linked_assistant_agent_id === copilot.id);

// DB-level filters, so pagination and counts stay correct (§14).
export const assistantAgentVisibleWhere = (
  ctx: Pick<OrgContext, 'userId' | 'permissions'>,
): Prisma.AssistantAgentWhereInput =>
  canManageAllCopilots(ctx)
    ? {}
    : {
        OR: [
          { visibility: AgentVisibility.ORGANISATION },
          { user_id: ctx.userId },
          { access_list: { some: { user_id: ctx.userId } } },
        ],
      };

export const practiceAgentVisibleWhere = (
  ctx: Pick<OrgContext, 'userId' | 'permissions'>,
): Prisma.PracticeAgentWhereInput =>
  canSeeAllProspects(ctx)
    ? {}
    : {
        OR: [
          { visibility: AgentVisibility.ORGANISATION },
          { user_id: ctx.userId },
          { access_list: { some: { user_id: ctx.userId } } },
        ],
      };
