import { NotFoundException } from '@nestjs/common';
import { AssistantAgent, PracticeAgent, Prisma } from 'generated/prisma';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  AgentSnapshot,
  PracticeSnapshot,
} from '../interfaces/call-snapshots.interface';
import { DEFAULT_ANALYSIS_CRITERIA } from '@/shared/config/templates/analysis-criteria.config';
import { ErrorCodes } from '@/shared/config/error-codes';

export const toAgentSnapshot = (agent: AssistantAgent): AgentSnapshot => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  call_goal: agent.call_goal,
  script: (agent.script as unknown as AgentSnapshot['script']) ?? [],
  instructions: agent.instructions,
  knowledge: agent.knowledge,
  objection_library:
    (agent.objection_library as unknown as AgentSnapshot['objection_library']) ??
    [],
  methodology: agent.methodology,
  language: agent.language,
  languages: agent.languages?.length ? agent.languages : [agent.language],
  tone: agent.tone,
  suggestion_frequency: agent.suggestion_frequency,
  suggestion_length: agent.suggestion_length,
  alternatives_count: agent.alternatives_count,
  realtime_model: agent.realtime_model,
  analysis_model: agent.analysis_model,
  analysis_criteria: (
    (agent.analysis_criteria as unknown as AgentSnapshot['analysis_criteria']) ??
    []
  ).length
    ? (agent.analysis_criteria as unknown as AgentSnapshot['analysis_criteria'])
    : DEFAULT_ANALYSIS_CRITERIA,
});

export const toPracticeSnapshot = (
  agent: PracticeAgent,
  productKnowledge: string | null,
): PracticeSnapshot => ({
  id: agent.id,
  name: agent.name,
  prospect_name: agent.prospect_name,
  role_prompt: agent.role_prompt,
  scenario_context: agent.scenario_context,
  scenario_type: agent.scenario_type,
  selling_product: agent.selling_product,
  user_objective: agent.user_objective,
  lead_temperature: agent.lead_temperature,
  difficulty: agent.difficulty,
  personality: agent.personality,
  mood: agent.mood,
  communication_style: agent.communication_style,
  decision_authority: agent.decision_authority,
  budget: agent.budget,
  timeline: agent.timeline,
  current_solution: agent.current_solution,
  pain_points: (agent.pain_points as string[]) ?? [],
  objections:
    (agent.objections as unknown as PracticeSnapshot['objections']) ?? [],
  hidden_information: (agent.hidden_information as string[]) ?? [],
  conversion_conditions: (agent.conversion_conditions as string[]) ?? [],
  patience: agent.patience,
  language: agent.language,
  languages: agent.languages?.length ? agent.languages : [agent.language],
  accent: agent.accent,
  industry: agent.industry,
  company: agent.company,
  job_title: agent.job_title,
  age_range: agent.age_range,
  background_story: agent.background_story,
  briefing: agent.briefing,
  voice_provider: agent.voice_provider,
  voice: agent.voice,
  time_limit_minutes: agent.time_limit_minutes,
  product_knowledge: productKnowledge,
});

export const asJson = (value: unknown) => value as Prisma.InputJsonValue;

export type CallAccess = 'live' | 'read' | 'manage';

// Looks a call up inside the active organisation and enforces who may touch it:
//  - live:   only the member who is running the call
//  - read:   its owner, or anyone with calls.view_all
//  - manage: its owner, or anyone with calls.manage_all
export const findOwnedCall = async <T extends Prisma.CallInclude>(
  prisma: PrismaService,
  ctx: OrgContext,
  callId: string,
  include?: T,
  access: CallAccess = 'live',
) => {
  const call = await prisma.call.findFirst({
    where: { id: callId, organisation_id: ctx.organisationId },
    include,
  });
  const isOwner = call?.user_id === ctx.userId;
  const allowed =
    !!call &&
    (isOwner ||
      (access === 'read' && can(ctx, Permissions.CALLS_VIEW_ALL)) ||
      (access === 'manage' && can(ctx, Permissions.CALLS_MANAGE_ALL)));
  if (!call || !allowed)
    throw new NotFoundException({
      message: 'Call not found',
      code: ErrorCodes.Calls.NOT_FOUND,
    });
  return call as Prisma.CallGetPayload<{ include: T }>;
};

export const buildCallContext = (call: {
  prospect_name: string | null;
  prospect_company: string | null;
  prospect_role: string | null;
  goal: string | null;
  context_notes: string | null;
  call_type: string;
  kind: string;
}): string =>
  [
    `Call type: ${call.kind === 'PRACTICE' ? 'practice session (AI prospect)' : call.call_type === 'MICROPHONE' ? 'phone call captured by microphone' : 'online meeting'}`,
    `Prospect: ${call.prospect_name || 'unknown'}${call.prospect_role ? `, ${call.prospect_role}` : ''}${call.prospect_company ? ` at ${call.prospect_company}` : ''}`,
    call.goal && `Goal of this call: ${call.goal}`,
    call.context_notes && `Notes: ${call.context_notes}`,
  ]
    .filter(Boolean)
    .join('\n');
