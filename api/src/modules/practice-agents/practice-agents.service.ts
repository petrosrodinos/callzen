import { AppConfigService } from '@/modules/app-config/app-config.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  can,
  isPlatformAdmin,
  OrgContext,
} from '@/shared/interfaces/org-context.interface';
import {
  DEFAULT_OPENAI_VOICE,
  OPENAI_VOICE_IDS,
} from '@/shared/config/voices/voice-providers.config';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  CallKind,
  LeadTemperature,
  Prisma,
  UsageKind,
  VoiceProvider,
} from 'generated/prisma';
import { AiService } from '@/integrations/ai/services/ai.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { AgentAccessService } from '@/modules/agent-access/agent-access.service';
import { UsageService } from '@/modules/usage/usage.service';
import { CreatePracticeAgentDto } from './dto/create-practice-agent.dto';
import { UpdatePracticeAgentDto } from './dto/update-practice-agent.dto';
import {
  GeneratePracticeAgentDto,
  RandomizePracticeAgentDto,
} from './dto/generate-practice-agent.dto';
import { PracticeAgentQueryType } from './dto/practice-agent-query.schema';
import { findPracticeAgentTemplate } from '@/shared/config/templates/practice-agent-templates.config';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  buildProductContext,
  GeneratedPracticeAgent,
  GeneratedPracticeAgentSchema,
  PRACTICE_AGENT_GENERATION_SYSTEM,
} from './utils/practice-agent-generation.utils';
import {
  PracticeAgentStats,
  PracticeAgentWithStats,
} from './interfaces/practice-agent.interface';
import { formatTranscript } from '@/modules/calls/utils/transcript.utils';
import { normalizeLanguages } from '@/shared/config/languages/languages.config';

const RANDOM_INDUSTRIES = [
  'B2B SaaS',
  'Logistics',
  'Restaurants',
  'Dental clinics',
  'Real estate',
  'Manufacturing',
  'Retail',
  'Insurance',
  'Construction',
  'Fitness studios',
  'Accounting firms',
  'E-commerce',
  'Healthcare',
  'Education',
];

@Injectable()
export class PracticeAgentsService {
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

  async create(ctx: OrgContext, dto: CreatePracticeAgentDto) {
    await this.planLimits.assertCanCreatePracticeProspect(ctx);
    dto = this.withUserVoice(ctx, dto);
    if (dto.linked_assistant_agent_id)
      await this.assertAssistantAgent(ctx, dto.linked_assistant_agent_id);
    const template = dto.template_key
      ? findPracticeAgentTemplate(dto.template_key)
      : undefined;
    const {
      key: _key,
      description: _description,
      ...templateFields
    } = template ?? ({} as any);

    const merged = { ...templateFields, ...dto };
    return this.prisma.practiceAgent.create({
      data: {
        ...(this.toData(
          { ...merged, ...normalizeLanguages(merged.language, merged.languages) },
          ctx,
        ) as Prisma.PracticeAgentUncheckedCreateInput),
        // Students' own prospects start private to them and their coach (§10.1h rule 6).
        visibility: await this.agentAccess.defaultPracticeVisibility(ctx),
      },
    });
  }

  async findAll(
    ctx: OrgContext,
    query: PracticeAgentQueryType,
  ): Promise<PracticeAgentWithStats[]> {
    const agents = await this.prisma.practiceAgent.findMany({
      where: {
        organisation_id: ctx.organisationId,
        // Members only see what is shared with them (§10.1h); filtered in the DB.
        ...this.agentAccess.practiceAgentVisibleWhere(ctx),
        ...(query.status === 'active' && { archived_at: null }),
        ...(query.status === 'archived' && { archived_at: { not: null } }),
        ...(query.search && {
          name: { contains: query.search, mode: 'insensitive' },
        }),
        ...(query.lead_temperature && {
          lead_temperature: query.lead_temperature,
        }),
        ...(query.difficulty && { difficulty: query.difficulty }),
      },
      orderBy: { updated_at: 'desc' },
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

  async findOne(ctx: OrgContext, id: string): Promise<PracticeAgentWithStats> {
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

  // Access lists are only returned to people who can change any prospect's access (prospects.manage_all).
  private async accessListsFor(ctx: OrgContext, ids: string[]) {
    if (!can(ctx, Permissions.PROSPECTS_MANAGE_ALL)) return null;
    return this.agentAccess.accessListsFor('prospect', ids);
  }

  async update(ctx: OrgContext, id: string, dto: UpdatePracticeAgentDto) {
    const existing = await this.getManageable(ctx, id);
    dto = this.withUserVoice(ctx, dto);
    if (dto.linked_assistant_agent_id)
      await this.assertAssistantAgent(ctx, dto.linked_assistant_agent_id);

    return this.prisma.practiceAgent.update({
      where: { id },
      data: this.toData({
        ...dto,
        ...(dto.languages || dto.language
          ? normalizeLanguages(
              dto.language ?? dto.languages?.[0],
              dto.languages ?? existing.languages,
            )
          : {}),
      }) as Prisma.PracticeAgentUncheckedUpdateInput,
    });
  }

  async duplicate(ctx: OrgContext, id: string) {
    const agent = await this.getOwned(ctx, id);
    await this.planLimits.assertCanCreatePracticeProspect(ctx);
    const { id: _id, created_at, updated_at, archived_at, ...rest } = agent;

    return this.prisma.practiceAgent.create({
      data: {
        ...rest,
        user_id: ctx.userId,
        name: `${agent.name} (copy)`,
        // The copy belongs to whoever made it: a student's copy is private to them and their coach.
        visibility: await this.agentAccess.defaultPracticeVisibility(ctx),
        pain_points: agent.pain_points as Prisma.InputJsonValue,
        objections: agent.objections as Prisma.InputJsonValue,
        hidden_information: agent.hidden_information as Prisma.InputJsonValue,
        conversion_conditions:
          agent.conversion_conditions as Prisma.InputJsonValue,
      },
    });
  }

  async harder(ctx: OrgContext, id: string) {
    const agent = await this.getOwned(ctx, id);
    if (agent.difficulty >= 5)
      throw new BadRequestException(
        'This scenario is already at maximum difficulty',
      );
    const copy = await this.duplicate(ctx, id);

    return this.prisma.practiceAgent.update({
      where: { id: copy.id },
      data: {
        name: `${agent.name} (Level ${agent.difficulty + 1})`,
        difficulty: agent.difficulty + 1,
        patience: Math.max(1, agent.patience - 1),
      },
    });
  }

  async setArchived(ctx: OrgContext, id: string, archived: boolean) {
    const agent = await this.getManageable(ctx, id);
    if (!archived && agent.archived_at)
      await this.planLimits.assertCanCreatePracticeProspect(ctx);
    return this.prisma.practiceAgent.update({
      where: { id },
      data: { archived_at: archived ? new Date() : null },
    });
  }

  async remove(ctx: OrgContext, id: string) {
    await this.getManageable(ctx, id);
    await this.prisma.practiceAgent.delete({ where: { id } });
    return { id, deleted: true };
  }

  async generate(ctx: OrgContext, dto: GeneratePracticeAgentDto) {
    // Saving goes through create(); an unsaved draft still costs AI, so read-only orgs cannot generate.
    if (dto.save) await this.planLimits.assertCanCreatePracticeProspect(ctx);
    else await this.planLimits.assertWritable(ctx);
    const assistant = dto.assistant_agent_id
      ? await this.assertAssistantAgent(ctx, dto.assistant_agent_id)
      : null;
    const constraints = [
      dto.lead_temperature &&
        `Lead temperature must be ${dto.lead_temperature}.`,
      dto.difficulty && `Difficulty must be ${dto.difficulty}.`,
    ].filter(Boolean);

    const generated = await this.runGeneration(
      ctx,
      `Create a practice prospect from this description:\n"${dto.description}"\n\n${constraints.join('\n')}\n\n${buildProductContext(
        {
          product: assistant?.description ?? assistant?.call_goal,
          knowledge: assistant?.knowledge,
        },
      )}`,
    );

    return this.finalizeGenerated(ctx, generated, dto.save, assistant?.id, {
      lead_temperature: dto.lead_temperature,
      difficulty: dto.difficulty,
    });
  }

  async randomize(ctx: OrgContext, dto: RandomizePracticeAgentDto) {
    if (dto.save) await this.planLimits.assertCanCreatePracticeProspect(ctx);
    else await this.planLimits.assertWritable(ctx);
    const assistant = dto.assistant_agent_id
      ? await this.assertAssistantAgent(ctx, dto.assistant_agent_id)
      : null;
    const temperature =
      dto.lead_temperature ??
      (Math.random() < 0.6 ? LeadTemperature.COLD : LeadTemperature.WARM);
    const difficulty = dto.difficulty ?? 1 + Math.floor(Math.random() * 5);
    const industry =
      dto.industry ||
      RANDOM_INDUSTRIES[Math.floor(Math.random() * RANDOM_INDUSTRIES.length)];

    const generated = await this.runGeneration(
      ctx,
      `Invent a surprising but realistic random prospect so the salesperson cannot memorize scenarios.
Constraints: lead temperature ${temperature}, difficulty ${difficulty}, industry "${industry}"${dto.scenario_type ? `, scenario type ${dto.scenario_type}` : ''}.
Random seed: ${Math.random().toString(36).slice(2)}

${buildProductContext({ product: assistant?.description ?? assistant?.call_goal, knowledge: assistant?.knowledge })}`,
      1,
    );

    return this.finalizeGenerated(ctx, generated, dto.save, assistant?.id, {
      lead_temperature: temperature,
      difficulty,
    });
  }

  async fromCall(ctx: OrgContext, callId: string) {
    await this.planLimits.assertCanCreatePracticeProspect(ctx);
    const call = await this.prisma.call.findFirst({
      where: {
        id: callId,
        organisation_id: ctx.organisationId,
        ...(can(ctx, Permissions.CALLS_VIEW_ALL)
          ? {}
          : { user_id: ctx.userId }),
      },
      include: {
        segments: { orderBy: { start_ms: 'asc' } },
        analysis: true,
        assistant_agent: true,
      },
    });
    if (!call)
      throw new NotFoundException({
        message: 'Call not found',
        code: ErrorCodes.Calls.NOT_FOUND,
      });
    if (call.kind !== CallKind.LIVE)
      throw new BadRequestException(
        'Practice agents can only be created from live calls',
      );
    if (!call.segments.length)
      throw new BadRequestException({
        message: 'This call has no transcript',
        code: ErrorCodes.Calls.NO_TRANSCRIPT,
      });

    const insights = call.analysis?.prospect_insights
      ? JSON.stringify(call.analysis.prospect_insights)
      : 'Not available';
    const generated = await this.runGeneration(
      ctx,
      `Recreate the REAL prospect from this sales call as a practice persona so the salesperson can rehearse the follow-up call or replay the call that went badly.
Keep the same person, company, objections, tone and situation. Infer hidden pain points and conversion conditions from what was said.
Prospect: ${call.prospect_name ?? 'unknown'} | Company: ${call.prospect_company ?? 'unknown'} | Role: ${call.prospect_role ?? 'unknown'}
Call goal: ${call.goal ?? call.assistant_agent?.call_goal ?? 'unknown'}
Prospect insights from analysis: ${insights}

Transcript:
${formatTranscript(call.segments, { maxChars: 14000 })}`,
    );

    const agent = await this.finalizeGenerated(
      ctx,
      generated,
      true,
      call.assistant_agent_id,
      {},
    );
    return this.prisma.practiceAgent.update({
      where: { id: (agent as { id: string }).id },
      data: {
        source_call_id: call.id,
        name: `Replay – ${generated.prospect_name || generated.name}`,
      },
    });
  }

  // Editing, archiving and deleting: your own prospects with prospects.manage, anyone's with
  // prospects.manage_all (§10.1h rule 5). Students can never change the coach's prospects.
  async getManageable(ctx: OrgContext, id: string) {
    const agent = await this.getOwned(ctx, id);
    if (agent.user_id !== ctx.userId && !can(ctx, Permissions.PROSPECTS_MANAGE_ALL))
      throw new ForbiddenException({
        message: 'You can only change practice prospects you created',
        code: 'NOT_PROSPECT_AUTHOR',
      });
    return agent;
  }

  // Items the viewer cannot see return 404, so their existence is not leaked (§10.1h).
  async getOwned(ctx: OrgContext, id: string) {
    return this.agentAccess.findVisiblePracticeAgent(ctx, id);
  }

  private async runGeneration(
    ctx: OrgContext,
    prompt: string,
    temperature = 0.8,
  ): Promise<GeneratedPracticeAgent> {
    const result = await this.aiService.generateStructured({
      model: this.models.utility,
      system: PRACTICE_AGENT_GENERATION_SYSTEM,
      prompt,
      schema: GeneratedPracticeAgentSchema,
      schemaName: 'practice_prospect',
      temperature,
      timeoutMs: 60000,
    });

    this.usageService.record({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      kind: UsageKind.GENERATION,
      model: result.model,
      tokens: result.usage,
    });

    return result.output;
  }

  private async finalizeGenerated(
    ctx: OrgContext,
    generated: GeneratedPracticeAgent,
    save: boolean | undefined,
    assistantAgentId: string | null | undefined,
    overrides: { lead_temperature?: LeadTemperature; difficulty?: number },
  ) {
    const draft: CreatePracticeAgentDto = {
      ...generated,
      lead_temperature:
        overrides.lead_temperature ??
        (generated.lead_temperature as LeadTemperature),
      difficulty: overrides.difficulty ?? generated.difficulty,
      linked_assistant_agent_id: assistantAgentId ?? undefined,
      voice_provider: VoiceProvider.OPENAI_REALTIME,
      objections: generated.objections.map((o) => ({
        text: o.text,
        persistence: o.persistence,
      })),
    };

    if (!save) return draft;
    return this.create(ctx, draft);
  }

  // Browser voice stays available to platform admins only (§6.4); everyone else gets OpenAI Realtime with a
  // valid OpenAI voice.
  private withUserVoice<T extends UpdatePracticeAgentDto>(
    ctx: OrgContext,
    dto: T,
  ): T {
    if (isPlatformAdmin(ctx)) return dto;
    const touchesVoice = dto.voice_provider !== undefined || dto.voice !== undefined;
    if (!touchesVoice) return dto;
    return {
      ...dto,
      voice_provider: VoiceProvider.OPENAI_REALTIME,
      ...(dto.voice !== undefined && {
        voice: OPENAI_VOICE_IDS.includes(dto.voice) ? dto.voice : DEFAULT_OPENAI_VOICE,
      }),
    };
  }

  private toData(dto: Partial<CreatePracticeAgentDto>, ctx?: OrgContext) {
    const { template_key, ...rest } = dto;
    return {
      ...rest,
      ...(ctx && {
        organisation_id: ctx.organisationId,
        user_id: ctx.userId,
        template_key,
      }),
      pain_points: rest.pain_points as Prisma.InputJsonValue,
      objections: rest.objections as unknown as Prisma.InputJsonValue,
      hidden_information: rest.hidden_information as Prisma.InputJsonValue,
      conversion_conditions:
        rest.conversion_conditions as Prisma.InputJsonValue,
    };
  }

  // Linking or generating from a co-pilot requires being able to see it.
  private async assertAssistantAgent(ctx: OrgContext, id: string) {
    return this.agentAccess.findVisibleAssistantAgent(ctx, id);
  }

  private emptyStats(): PracticeAgentStats {
    return {
      sessions_count: 0,
      best_score: null,
      last_score: null,
      objective_rate: null,
      last_practiced_at: null,
    };
  }

  private async statsFor(
    ctx: OrgContext,
    agentIds: string[],
  ): Promise<Map<string, PracticeAgentStats>> {
    const result = new Map<string, PracticeAgentStats>();
    if (!agentIds.length) return result;

    const calls = await this.prisma.call.findMany({
      where: {
        organisation_id: ctx.organisationId,
        practice_agent_id: { in: agentIds },
      },
      select: {
        practice_agent_id: true,
        started_at: true,
        objective_achieved: true,
        analysis: { select: { overall_score: true } },
      },
      orderBy: { started_at: 'asc' },
    });

    for (const agentId of agentIds) {
      const sessions = calls.filter(
        (call) => call.practice_agent_id === agentId,
      );
      const scores = sessions
        .map((s) => s.analysis?.overall_score)
        .filter((s): s is number => s != null);
      const judged = sessions.filter((s) => s.objective_achieved != null);

      result.set(agentId, {
        sessions_count: sessions.length,
        best_score: scores.length ? Math.max(...scores) : null,
        last_score: scores.at(-1) ?? null,
        objective_rate: judged.length
          ? Math.round(
              (judged.filter((s) => s.objective_achieved).length /
                judged.length) *
                100,
            )
          : null,
        last_practiced_at: sessions.at(-1)?.started_at ?? null,
      });
    }

    return result;
  }
}
