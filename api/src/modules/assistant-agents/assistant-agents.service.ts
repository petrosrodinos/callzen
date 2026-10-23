import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Prisma } from 'generated/prisma';
import { CreateAssistantAgentDto } from './dto/create-assistant-agent.dto';
import { UpdateAssistantAgentDto } from './dto/update-assistant-agent.dto';
import { AssistantAgentQueryType } from './dto/assistant-agent-query.schema';
import {
  isKnownAiModel,
  RECOMMENDED_ANALYSIS_MODEL,
  RECOMMENDED_REALTIME_MODEL,
} from '@/shared/config/ai-models/ai-models.config';
import { DEFAULT_ANALYSIS_CRITERIA } from '@/shared/config/templates/analysis-criteria.config';
import { findAssistantAgentTemplate } from '@/shared/config/templates/assistant-agent-templates.config';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  AssistantAgentStats,
  AssistantAgentWithStats,
} from './interfaces/assistant-agent.interface';
import { average } from '@/shared/utils/math/math.utils';
import { normalizeLanguages } from '@/shared/config/languages/languages.config';

@Injectable()
export class AssistantAgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: OrgContext, dto: CreateAssistantAgentDto) {
    this.assertModels(dto);
    const template = dto.template_key
      ? findAssistantAgentTemplate(dto.template_key)
      : undefined;
    const existingCount = await this.prisma.assistantAgent.count({
      where: { organisation_id: ctx.organisationId, archived_at: null },
    });
    const isDefault = dto.is_default || existingCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.assistantAgent.updateMany({
          where: { organisation_id: ctx.organisationId },
          data: { is_default: false },
        });
      }

      return tx.assistantAgent.create({
        data: {
          organisation_id: ctx.organisationId,
          user_id: ctx.userId,
          name: dto.name,
          description: dto.description ?? template?.description,
          call_goal: dto.call_goal ?? template?.call_goal,
          script: (dto.script ??
            template?.script ??
            []) as unknown as Prisma.InputJsonValue,
          instructions: dto.instructions ?? template?.instructions,
          knowledge: dto.knowledge ?? template?.knowledge,
          objection_library: (dto.objection_library ??
            template?.objection_library ??
            []) as unknown as Prisma.InputJsonValue,
          methodology: dto.methodology ?? template?.methodology,
          ...normalizeLanguages(dto.language, dto.languages),
          tone: dto.tone ?? template?.tone ?? 'PROFESSIONAL',
          suggestion_frequency:
            dto.suggestion_frequency ?? template?.suggestion_frequency,
          suggestion_length: dto.suggestion_length,
          alternatives_count: dto.alternatives_count ?? 1,
          realtime_model: dto.realtime_model ?? RECOMMENDED_REALTIME_MODEL,
          analysis_model: dto.analysis_model ?? RECOMMENDED_ANALYSIS_MODEL,
          analysis_criteria: (dto.analysis_criteria ??
            template?.analysis_criteria ??
            DEFAULT_ANALYSIS_CRITERIA) as unknown as Prisma.InputJsonValue,
          consent_line: dto.consent_line,
          suggest_consent_line: dto.suggest_consent_line ?? false,
          template_key: dto.template_key,
          is_default: isDefault,
        },
      });
    });
  }

  async findAll(
    ctx: OrgContext,
    query: AssistantAgentQueryType,
  ): Promise<AssistantAgentWithStats[]> {
    const where: Prisma.AssistantAgentWhereInput = {
      organisation_id: ctx.organisationId,
      ...(query.status === 'active' && { archived_at: null }),
      ...(query.status === 'archived' && { archived_at: { not: null } }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const agents = await this.prisma.assistantAgent.findMany({
      where,
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
    });

    const stats = await this.statsFor(
      ctx,
      agents.map((agent) => agent.id),
    );
    return agents.map((agent) => ({
      ...agent,
      stats: stats.get(agent.id) ?? this.emptyStats(),
    }));
  }

  async findOne(ctx: OrgContext, id: string): Promise<AssistantAgentWithStats> {
    const agent = await this.getOwned(ctx, id);
    const stats = await this.statsFor(ctx, [id]);
    return { ...agent, stats: stats.get(id) ?? this.emptyStats() };
  }

  async update(ctx: OrgContext, id: string, dto: UpdateAssistantAgentDto) {
    const existing = await this.getOwned(ctx, id);
    this.assertModels(dto);
    const languageUpdate =
      dto.languages || dto.language
        ? normalizeLanguages(
            dto.language ?? dto.languages?.[0],
            dto.languages ?? existing.languages,
          )
        : {};

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.assistantAgent.updateMany({
          where: { organisation_id: ctx.organisationId },
          data: { is_default: false },
        });
      }

      return tx.assistantAgent.update({
        where: { id },
        data: {
          ...dto,
          ...languageUpdate,
          script: dto.script as unknown as Prisma.InputJsonValue,
          objection_library:
            dto.objection_library as unknown as Prisma.InputJsonValue,
          analysis_criteria:
            dto.analysis_criteria as unknown as Prisma.InputJsonValue,
        },
      });
    });
  }

  async duplicate(ctx: OrgContext, id: string) {
    const agent = await this.getOwned(ctx, id);
    const {
      id: _id,
      created_at,
      updated_at,
      archived_at,
      is_default,
      ...rest
    } = agent;

    return this.prisma.assistantAgent.create({
      data: {
        ...rest,
        user_id: ctx.userId,
        name: `${agent.name} (copy)`,
        is_default: false,
        script: agent.script as Prisma.InputJsonValue,
        objection_library: agent.objection_library as Prisma.InputJsonValue,
        analysis_criteria: agent.analysis_criteria as Prisma.InputJsonValue,
      },
    });
  }

  async setDefault(ctx: OrgContext, id: string) {
    const agent = await this.getOwned(ctx, id);
    if (agent.archived_at)
      throw new BadRequestException('Archived agents cannot be the default');

    await this.prisma.$transaction([
      this.prisma.assistantAgent.updateMany({
        where: { organisation_id: ctx.organisationId },
        data: { is_default: false },
      }),
      this.prisma.assistantAgent.update({
        where: { id },
        data: { is_default: true },
      }),
    ]);
    return this.findOne(ctx, id);
  }

  async setArchived(ctx: OrgContext, id: string, archived: boolean) {
    await this.getOwned(ctx, id);
    return this.prisma.assistantAgent.update({
      where: { id },
      data: {
        archived_at: archived ? new Date() : null,
        ...(archived && { is_default: false }),
      },
    });
  }

  async remove(ctx: OrgContext, id: string) {
    await this.getOwned(ctx, id);
    await this.prisma.assistantAgent.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getOwned(ctx: OrgContext, id: string) {
    const agent = await this.prisma.assistantAgent.findFirst({
      where: { id, organisation_id: ctx.organisationId },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Assistant agent not found',
        code: ErrorCodes.AssistantAgents.NOT_FOUND,
      });
    return agent;
  }

  async getDefault(ctx: OrgContext) {
    return this.prisma.assistantAgent.findFirst({
      where: { organisation_id: ctx.organisationId, archived_at: null },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
    });
  }

  private assertModels(dto: UpdateAssistantAgentDto) {
    if (dto.realtime_model && !isKnownAiModel(dto.realtime_model)) {
      throw new BadRequestException(
        `Unknown real-time model: ${dto.realtime_model}`,
      );
    }
    if (dto.analysis_model && !isKnownAiModel(dto.analysis_model)) {
      throw new BadRequestException(
        `Unknown analysis model: ${dto.analysis_model}`,
      );
    }
  }

  private emptyStats(): AssistantAgentStats {
    return {
      calls_count: 0,
      live_calls_count: 0,
      practice_calls_count: 0,
      average_score: null,
      trend: null,
      last_used_at: null,
    };
  }

  private async statsFor(
    ctx: OrgContext,
    agentIds: string[],
  ): Promise<Map<string, AssistantAgentStats>> {
    const result = new Map<string, AssistantAgentStats>();
    if (!agentIds.length) return result;

    const calls = await this.prisma.call.findMany({
      where: {
        organisation_id: ctx.organisationId,
        assistant_agent_id: { in: agentIds },
        copilot_enabled: true,
      },
      select: {
        assistant_agent_id: true,
        kind: true,
        started_at: true,
        analysis: { select: { overall_score: true } },
      },
      orderBy: { started_at: 'asc' },
    });

    for (const agentId of agentIds) {
      const agentCalls = calls.filter(
        (call) => call.assistant_agent_id === agentId,
      );
      const scores = agentCalls
        .map((call) => call.analysis?.overall_score)
        .filter((score): score is number => score != null);
      const recent = scores.slice(-5);
      const previous = scores.slice(-10, -5);

      result.set(agentId, {
        calls_count: agentCalls.length,
        live_calls_count: agentCalls.filter((call) => call.kind === 'LIVE')
          .length,
        practice_calls_count: agentCalls.filter(
          (call) => call.kind === 'PRACTICE',
        ).length,
        average_score: scores.length ? Math.round(average(scores)) : null,
        trend:
          recent.length && previous.length
            ? Math.round(average(recent) - average(previous))
            : null,
        last_used_at: agentCalls.at(-1)?.started_at ?? null,
      });
    }

    return result;
  }
}
