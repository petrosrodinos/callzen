import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  CallKind,
  LeadTemperature,
  Prisma,
  UsageKind,
  VoiceProvider,
} from 'generated/prisma';
import { AiService } from '@/integrations/ai/services/ai.service';
import { UsageService } from '@/modules/usage/usage.service';
import { CreatePracticeAgentDto } from './dto/create-practice-agent.dto';
import { UpdatePracticeAgentDto } from './dto/update-practice-agent.dto';
import {
  GeneratePracticeAgentDto,
  RandomizePracticeAgentDto,
} from './dto/generate-practice-agent.dto';
import { PracticeAgentQueryType } from './dto/practice-agent-query.schema';
import { findPracticeAgentTemplate } from '@/shared/config/templates/practice-agent-templates.config';
import { UTILITY_MODEL } from '@/shared/config/ai-models/ai-models.config';
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
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
  ) {}

  async create(userId: string, dto: CreatePracticeAgentDto) {
    if (dto.linked_assistant_agent_id)
      await this.assertAssistantAgent(userId, dto.linked_assistant_agent_id);
    const template = dto.template_key
      ? findPracticeAgentTemplate(dto.template_key)
      : undefined;
    const {
      key: _key,
      description: _description,
      ...templateFields
    } = template ?? ({} as any);

    return this.prisma.practiceAgent.create({
      data: this.toData(
        { ...templateFields, ...dto },
        userId,
      ) as Prisma.PracticeAgentUncheckedCreateInput,
    });
  }

  async findAll(
    userId: string,
    query: PracticeAgentQueryType,
  ): Promise<PracticeAgentWithStats[]> {
    const agents = await this.prisma.practiceAgent.findMany({
      where: {
        user_id: userId,
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

    const stats = await this.statsFor(
      userId,
      agents.map((agent) => agent.id),
    );
    return agents.map((agent) => ({
      ...agent,
      stats: stats.get(agent.id) ?? this.emptyStats(),
    }));
  }

  async findOne(userId: string, id: string): Promise<PracticeAgentWithStats> {
    const agent = await this.getOwned(userId, id);
    const stats = await this.statsFor(userId, [id]);
    return { ...agent, stats: stats.get(id) ?? this.emptyStats() };
  }

  async update(userId: string, id: string, dto: UpdatePracticeAgentDto) {
    await this.getOwned(userId, id);
    if (dto.linked_assistant_agent_id)
      await this.assertAssistantAgent(userId, dto.linked_assistant_agent_id);

    return this.prisma.practiceAgent.update({
      where: { id },
      data: this.toData(dto) as Prisma.PracticeAgentUncheckedUpdateInput,
    });
  }

  async duplicate(userId: string, id: string) {
    const agent = await this.getOwned(userId, id);
    const { id: _id, created_at, updated_at, archived_at, ...rest } = agent;

    return this.prisma.practiceAgent.create({
      data: {
        ...rest,
        name: `${agent.name} (copy)`,
        pain_points: agent.pain_points as Prisma.InputJsonValue,
        objections: agent.objections as Prisma.InputJsonValue,
        hidden_information: agent.hidden_information as Prisma.InputJsonValue,
        conversion_conditions:
          agent.conversion_conditions as Prisma.InputJsonValue,
      },
    });
  }

  async harder(userId: string, id: string) {
    const agent = await this.getOwned(userId, id);
    if (agent.difficulty >= 5)
      throw new BadRequestException(
        'This scenario is already at maximum difficulty',
      );
    const copy = await this.duplicate(userId, id);

    return this.prisma.practiceAgent.update({
      where: { id: copy.id },
      data: {
        name: `${agent.name} (Level ${agent.difficulty + 1})`,
        difficulty: agent.difficulty + 1,
        patience: Math.max(1, agent.patience - 1),
      },
    });
  }

  async setArchived(userId: string, id: string, archived: boolean) {
    await this.getOwned(userId, id);
    return this.prisma.practiceAgent.update({
      where: { id },
      data: { archived_at: archived ? new Date() : null },
    });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.practiceAgent.delete({ where: { id } });
    return { id, deleted: true };
  }

  async generate(userId: string, dto: GeneratePracticeAgentDto) {
    const assistant = dto.assistant_agent_id
      ? await this.assertAssistantAgent(userId, dto.assistant_agent_id)
      : null;
    const constraints = [
      dto.lead_temperature &&
        `Lead temperature must be ${dto.lead_temperature}.`,
      dto.difficulty && `Difficulty must be ${dto.difficulty}.`,
    ].filter(Boolean);

    const generated = await this.runGeneration(
      userId,
      `Create a practice prospect from this description:\n"${dto.description}"\n\n${constraints.join('\n')}\n\n${buildProductContext(
        {
          product: assistant?.description ?? assistant?.call_goal,
          knowledge: assistant?.knowledge,
        },
      )}`,
    );

    return this.finalizeGenerated(userId, generated, dto.save, assistant?.id, {
      lead_temperature: dto.lead_temperature,
      difficulty: dto.difficulty,
    });
  }

  async randomize(userId: string, dto: RandomizePracticeAgentDto) {
    const assistant = dto.assistant_agent_id
      ? await this.assertAssistantAgent(userId, dto.assistant_agent_id)
      : null;
    const temperature =
      dto.lead_temperature ??
      (Math.random() < 0.6 ? LeadTemperature.COLD : LeadTemperature.WARM);
    const difficulty = dto.difficulty ?? 1 + Math.floor(Math.random() * 5);
    const industry =
      dto.industry ||
      RANDOM_INDUSTRIES[Math.floor(Math.random() * RANDOM_INDUSTRIES.length)];

    const generated = await this.runGeneration(
      userId,
      `Invent a surprising but realistic random prospect so the salesperson cannot memorize scenarios.
Constraints: lead temperature ${temperature}, difficulty ${difficulty}, industry "${industry}"${dto.scenario_type ? `, scenario type ${dto.scenario_type}` : ''}.
Random seed: ${Math.random().toString(36).slice(2)}

${buildProductContext({ product: assistant?.description ?? assistant?.call_goal, knowledge: assistant?.knowledge })}`,
      1,
    );

    return this.finalizeGenerated(userId, generated, dto.save, assistant?.id, {
      lead_temperature: temperature,
      difficulty,
    });
  }

  async fromCall(userId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where: { id: callId, user_id: userId },
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
      userId,
      `Recreate the REAL prospect from this sales call as a practice persona so the salesperson can rehearse the follow-up call or replay the call that went badly.
Keep the same person, company, objections, tone and situation. Infer hidden pain points and conversion conditions from what was said.
Prospect: ${call.prospect_name ?? 'unknown'} | Company: ${call.prospect_company ?? 'unknown'} | Role: ${call.prospect_role ?? 'unknown'}
Call goal: ${call.goal ?? call.assistant_agent?.call_goal ?? 'unknown'}
Prospect insights from analysis: ${insights}

Transcript:
${formatTranscript(call.segments, { maxChars: 14000 })}`,
    );

    const agent = await this.finalizeGenerated(
      userId,
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

  async getOwned(userId: string, id: string) {
    const agent = await this.prisma.practiceAgent.findFirst({
      where: { id, user_id: userId },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Practice agent not found',
        code: ErrorCodes.PracticeAgents.NOT_FOUND,
      });
    return agent;
  }

  private async runGeneration(
    userId: string,
    prompt: string,
    temperature = 0.8,
  ): Promise<GeneratedPracticeAgent> {
    const result = await this.aiService.generateStructured({
      model: UTILITY_MODEL,
      system: PRACTICE_AGENT_GENERATION_SYSTEM,
      prompt,
      schema: GeneratedPracticeAgentSchema,
      schemaName: 'practice_prospect',
      temperature,
      timeoutMs: 60000,
    });

    this.usageService.record({
      userId,
      kind: UsageKind.GENERATION,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
    });

    return result.output;
  }

  private async finalizeGenerated(
    userId: string,
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
    return this.create(userId, draft);
  }

  private toData(dto: Partial<CreatePracticeAgentDto>, userId?: string) {
    const { template_key, ...rest } = dto;
    return {
      ...rest,
      ...(userId && { user_id: userId, template_key }),
      pain_points: rest.pain_points as Prisma.InputJsonValue,
      objections: rest.objections as unknown as Prisma.InputJsonValue,
      hidden_information: rest.hidden_information as Prisma.InputJsonValue,
      conversion_conditions:
        rest.conversion_conditions as Prisma.InputJsonValue,
    };
  }

  private async assertAssistantAgent(userId: string, id: string) {
    const agent = await this.prisma.assistantAgent.findFirst({
      where: { id, user_id: userId },
    });
    if (!agent)
      throw new NotFoundException({
        message: 'Assistant agent not found',
        code: ErrorCodes.AssistantAgents.NOT_FOUND,
      });
    return agent;
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
    userId: string,
    agentIds: string[],
  ): Promise<Map<string, PracticeAgentStats>> {
    const result = new Map<string, PracticeAgentStats>();
    if (!agentIds.length) return result;

    const calls = await this.prisma.call.findMany({
      where: { user_id: userId, practice_agent_id: { in: agentIds } },
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
