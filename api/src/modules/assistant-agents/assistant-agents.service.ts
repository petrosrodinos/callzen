import { AppConfigService } from '@/modules/app-config/app-config.service';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  isPlatformAdmin,
  OrgContext,
} from '@/shared/interfaces/org-context.interface';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { Prisma, UsageKind } from 'generated/prisma';
import { AiService } from '@/integrations/ai/services/ai.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { AgentAccessService } from '@/modules/agent-access/agent-access.service';
import { UsageService } from '@/modules/usage/usage.service';
import { CreateAssistantAgentDto } from './dto/create-assistant-agent.dto';
import { UpdateAssistantAgentDto } from './dto/update-assistant-agent.dto';
import { GenerateAssistantAgentDto } from './dto/generate-assistant-agent.dto';
import { AssistantAgentQueryType } from './dto/assistant-agent-query.schema';
import {
  buildAssistantAgentGenerationSystem,
  GeneratedAssistantAgentSchema,
} from './utils/assistant-agent-generation.utils';
import {
  isKnownAiModel,
} from '@/shared/config/ai-models/ai-models.config';
import { DEFAULT_ANALYSIS_CRITERIA } from '@/shared/config/templates/analysis-criteria.config';
import { getTemplateTranslation } from '@/shared/config/templates/i18n';
import { localizeCriteria } from '@/shared/config/templates/i18n/template-translation';
import { findAssistantAgentTemplate } from '@/shared/config/templates/assistant-agent-templates.config';
import {
  AssistantAgentStats,
  AssistantAgentWithStats,
} from './interfaces/assistant-agent.interface';
import { average } from '@/shared/utils/math/math.utils';
import { normalizeLanguages } from '@/shared/config/languages/languages.config';

@Injectable()
export class AssistantAgentsService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
    private readonly planLimits: PlanLimitService,
    private readonly agentAccess: AgentAccessService,
  ) {}

  // Runtime model defaults (admin-configurable); a co-pilot's own model wins when set.
  private get models() {
    return this.appConfig.get('ai.default_models');
  }

  async create(ctx: OrgContext, dto: CreateAssistantAgentDto) {
    await this.planLimits.assertCanCreateCopilot(ctx);
    dto = this.withoutUserModelChoice(ctx, dto);
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
          realtime_model: dto.realtime_model ?? this.models.realtime,
          analysis_model: dto.analysis_model ?? this.models.analysis,
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

  async generate(ctx: OrgContext, dto: GenerateAssistantAgentDto) {
    await this.planLimits.assertWritable(ctx);
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { preferred_language: true },
    });
    const accountLanguage = user?.preferred_language ?? 'en';
    const result = await this.aiService.generateStructured({
      model: this.models.analysis,
      fallbackModel: this.models.utility,
      system: buildAssistantAgentGenerationSystem(accountLanguage),
      prompt: `Create a co-pilot from this description:\n"""\n${dto.description}\n"""`,
      schema: GeneratedAssistantAgentSchema,
      schemaName: 'assistant_agent',
      temperature: 0.6,
      timeoutMs: 90000,
    });

    this.usageService.record({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      kind: UsageKind.GENERATION,
      model: result.model,
      tokens: result.usage,
    });

    const generated = result.output;
    const draft: CreateAssistantAgentDto = {
      name: generated.name,
      description: generated.description,
      call_goal: generated.call_goal,
      methodology: generated.methodology,
      tone: generated.tone,
      suggestion_frequency: generated.suggestion_frequency,
      instructions: generated.instructions,
      knowledge: generated.knowledge,
      script: generated.script.map((item, index) => ({
        id: `s${index + 1}`,
        ...item,
      })),
      objection_library: generated.objection_library.map((item, index) => ({
        id: `o${index + 1}`,
        ...item,
      })),
      analysis_criteria: localizeCriteria(
        DEFAULT_ANALYSIS_CRITERIA,
        getTemplateTranslation(accountLanguage),
      ),
      ...normalizeLanguages(generated.language, [generated.language]),
    };
    return draft;
  }

  async findAll(
    ctx: OrgContext,
    query: AssistantAgentQueryType,
  ): Promise<AssistantAgentWithStats[]> {
    const where: Prisma.AssistantAgentWhereInput = {
      organisation_id: ctx.organisationId,
      // Members only see what is shared with them (§10.1h); filtered in the DB.
      ...this.agentAccess.assistantAgentVisibleWhere(ctx),
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

    const ids = agents.map((agent) => agent.id);
    const [stats, accessLists] = await Promise.all([
      this.statsFor(ctx, ids),
      this.accessListsFor(ctx, ids),
    ]);
    return agents.map((agent) => ({
      ...agent,
      ...(accessLists && { access_user_ids: accessLists.get(agent.id) ?? [] }),
      stats: stats.get(agent.id) ?? this.emptyStats(),
    }));
  }

  async findOne(ctx: OrgContext, id: string): Promise<AssistantAgentWithStats> {
    const agent = await this.getOwned(ctx, id);
    const [stats, accessLists] = await Promise.all([
      this.statsFor(ctx, [id]),
      this.accessListsFor(ctx, [id]),
    ]);
    return {
      ...agent,
      ...(accessLists && { access_user_ids: accessLists.get(id) ?? [] }),
      stats: stats.get(id) ?? this.emptyStats(),
    };
  }

  // Access lists are only returned to people who can manage co-pilot access.
  private async accessListsFor(ctx: OrgContext, ids: string[]) {
    if (!this.agentAccess.canManageCopilotAccess(ctx)) return null;
    return this.agentAccess.accessListsFor('copilot', ids);
  }

  async update(ctx: OrgContext, id: string, dto: UpdateAssistantAgentDto) {
    const existing = await this.getOwned(ctx, id);
    dto = this.withoutUserModelChoice(ctx, dto);
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
    await this.planLimits.assertCanCreateCopilot(ctx);
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
    const agent = await this.getOwned(ctx, id);
    // Archived co-pilots do not count toward the maximum, so restoring one is like creating it (§8.2).
    if (!archived && agent.archived_at)
      await this.planLimits.assertCanCreateCopilot(ctx);
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

  // Items the viewer cannot see return 404, so their existence is not leaked (§10.1h).
  async getOwned(ctx: OrgContext, id: string) {
    return this.agentAccess.findVisibleAssistantAgent(ctx, id);
  }

  // The default co-pilot if the viewer can see it, otherwise the newest one they can see (§14).
  async getDefault(ctx: OrgContext) {
    return this.agentAccess.defaultUsableAssistantAgent(ctx);
  }

  // Model selection is kept as an internal capability for platform admins only (§6.3). Everyone else gets
  // the admin-configured defaults; existing co-pilots keep their stored model.
  private withoutUserModelChoice<T extends UpdateAssistantAgentDto>(
    ctx: OrgContext,
    dto: T,
  ): T {
    if (isPlatformAdmin(ctx)) return dto;
    const { realtime_model: _realtime, analysis_model: _analysis, ...rest } = dto;
    return rest as T;
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
