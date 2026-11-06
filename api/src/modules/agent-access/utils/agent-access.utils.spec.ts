import { AgentVisibility } from 'generated/prisma';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { NotFoundException } from '@nestjs/common';
import {
  assistantAgentVisibleWhere,
  canUseCopilotInPractice,
  isVisibleTo,
  practiceAgentVisibleWhere,
} from './agent-access.utils';
import { AgentAccessService } from '../agent-access.service';

const COACH = 'coach';
const STUDENT = 'student';
const OTHER = 'other-student';

const item = (overrides: Partial<Parameters<typeof isVisibleTo>[0]> = {}) => ({
  visibility: AgentVisibility.SELECTED,
  user_id: COACH,
  access_user_ids: [] as string[],
  ...overrides,
});

describe('isVisibleTo (§10.1h rules)', () => {
  it('hides an unshared SELECTED item from a student', () => {
    expect(isVisibleTo(item(), STUDENT, false)).toBe(false);
  });

  it('shows ORGANISATION items to everyone', () => {
    expect(isVisibleTo(item({ visibility: AgentVisibility.ORGANISATION }), STUDENT, false)).toBe(true);
  });

  it('shows items on the access list', () => {
    expect(isVisibleTo(item({ access_user_ids: [STUDENT] }), STUDENT, false)).toBe(true);
    expect(isVisibleTo(item({ access_user_ids: [STUDENT] }), OTHER, false)).toBe(false);
  });

  it('lets authors see their own private prospects', () => {
    expect(isVisibleTo(item({ user_id: STUDENT }), STUDENT, false)).toBe(true);
    expect(isVisibleTo(item({ user_id: STUDENT }), OTHER, false)).toBe(false);
  });

  it('gives managers full visibility', () => {
    expect(isVisibleTo(item({ user_id: STUDENT }), COACH, true)).toBe(true);
  });

  it('keeps restrictions after a downgrade (visibility is data, not a plan check)', () => {
    // Nothing in the rule depends on the plan: a SELECTED item stays hidden whatever the plan.
    expect(isVisibleTo(item(), STUDENT, false)).toBe(false);
  });
});

describe('canUseCopilotInPractice (rule 7)', () => {
  const copilot = { ...item(), id: 'copilot-1' };

  it('allows the linked co-pilot inside its prospect session', () => {
    expect(
      canUseCopilotInPractice(copilot, { linked_assistant_agent_id: 'copilot-1' }, STUDENT, false),
    ).toBe(true);
  });

  it('does not allow it for another prospect or outside practice', () => {
    expect(
      canUseCopilotInPractice(copilot, { linked_assistant_agent_id: 'copilot-2' }, STUDENT, false),
    ).toBe(false);
    expect(canUseCopilotInPractice(copilot, null, STUDENT, false)).toBe(false);
  });
});

describe('visible-where builders', () => {
  const student = { userId: STUDENT, permissions: [] };

  it('filters members in the database', () => {
    expect(assistantAgentVisibleWhere(student)).toEqual({
      OR: [
        { visibility: AgentVisibility.ORGANISATION },
        { user_id: STUDENT },
        { access_list: { some: { user_id: STUDENT } } },
      ],
    });
  });

  it('does not filter managers', () => {
    expect(
      assistantAgentVisibleWhere({ userId: COACH, permissions: [Permissions.AGENTS_MANAGE] }),
    ).toEqual({});
    expect(
      practiceAgentVisibleWhere({ userId: COACH, permissions: [Permissions.CALLS_VIEW_ALL] }),
    ).toEqual({});
  });

  it('uses calls.view_all, not agents.manage, for prospects', () => {
    expect(
      practiceAgentVisibleWhere({ userId: COACH, permissions: [Permissions.AGENTS_MANAGE] }),
    ).not.toEqual({});
  });
});

describe('AgentAccessService detail lookups', () => {
  const ctx = {
    userId: STUDENT,
    organisationId: 'org',
    role: 'MEMBER',
    permissions: [],
  } as never;
  const prisma = {
    assistantAgent: { findFirst: jest.fn().mockResolvedValue(null) },
    practiceAgent: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const service = new AgentAccessService(prisma as never, {} as never, {} as never);

  it('returns 404 (not 403) for an invisible co-pilot', async () => {
    await expect(service.findVisibleAssistantAgent(ctx, 'id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findVisibleAssistantAgent(ctx, 'id')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('returns 404 for an invisible prospect, filtering with the visibility rule', async () => {
    await expect(service.findVisiblePracticeAgent(ctx, 'id')).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.practiceAgent.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'id',
      organisation_id: 'org',
      OR: expect.any(Array),
    });
  });

  it('skips the visibility filter for a prospect\'s linked co-pilot', async () => {
    prisma.assistantAgent.findFirst.mockResolvedValueOnce({ id: 'c1' });
    await service.findUsableAssistantAgent(ctx, 'c1', { linked_assistant_agent_id: 'c1' });
    const where = prisma.assistantAgent.findFirst.mock.calls.at(-1)[0].where;
    expect(where.OR).toBeUndefined();
  });
});
