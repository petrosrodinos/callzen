import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { can, OrgContext } from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { UsageService } from '@/modules/usage/usage.service';
import {
  CallKind,
  CallStatus,
  CallType,
  Prisma,
  UsageKind,
  VoiceProvider,
} from 'generated/prisma';
import { CreateCallDto, CreatePracticeCallDto } from '../dto/create-call.dto';
import { UpdateCallDto } from '../dto/update-call.dto';
import {
  CreateBookmarkDto,
  EndCallDto,
  UpdateSegmentDto,
} from '../dto/call-session.dto';
import { CallQueryType } from '../dto/call-query.schema';
import { CallListItem } from '../interfaces/calls.interface';
import { PracticeSnapshot } from '../interfaces/call-snapshots.interface';
import {
  asJson,
  findOwnedCall,
  toAgentSnapshot,
  toPracticeSnapshot,
} from '../utils/snapshot.utils';
import { CopilotService } from './copilot.service';
import { CallAnalysisService } from './call-analysis.service';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  AUTO_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
} from '@/shared/config/languages/languages.config';
import {
  findVoiceProvider,
  TRANSCRIPTION_COST_PER_MINUTE_USD,
} from '@/shared/config/voices/voice-providers.config';

const BRIEFING_FIELDS: (keyof PracticeSnapshot)[] = [
  'id',
  'name',
  'prospect_name',
  'company',
  'job_title',
  'industry',
  'briefing',
  'scenario_type',
  'scenario_context',
  'lead_temperature',
  'difficulty',
  'user_objective',
  'selling_product',
  'voice_provider',
  'voice',
  'time_limit_minutes',
  'language',
];

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly usageService: UsageService,
    private readonly copilotService: CopilotService,
    private readonly analysisService: CallAnalysisService,
  ) {}

  async startLive(ctx: OrgContext, dto: CreateCallDto) {
    const [user, agent] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: ctx.userId } }),
      this.resolveAssistantAgent(ctx, dto.assistant_agent_id),
    ]);
    if (!agent)
      throw new BadRequestException(
        'Create an assistant agent before starting a call',
      );

    if (dto.prior_call_id)
      await findOwnedCall(
        this.prisma,
        ctx,
        dto.prior_call_id,
        undefined,
        'read',
      );

    const call = await this.prisma.call.create({
      data: {
        organisation_id: ctx.organisationId,
        user_id: ctx.userId,
        kind: CallKind.LIVE,
        call_type: dto.call_type,
        assistant_agent_id: agent.id,
        copilot_enabled: true,
        prospect_name: dto.prospect_name,
        prospect_company: dto.prospect_company,
        prospect_role: dto.prospect_role,
        context_notes: dto.context_notes,
        goal: dto.goal ?? agent.call_goal,
        prior_call_id: dto.prior_call_id,
        language: this.resolveCallLanguage(dto.language, agent),
        keep_recording: dto.keep_recording ?? user.keep_recordings,
        title:
          dto.prospect_name || dto.prospect_company
            ? `Call with ${[dto.prospect_name, dto.prospect_company].filter(Boolean).join(' · ')}`
            : null,
        agent_snapshot: asJson(toAgentSnapshot(agent)),
      },
    });

    await this.copilotService.createInitialSuggestions(
      call,
      toAgentSnapshot(agent),
      agent.consent_line ?? user.consent_line,
      agent.suggest_consent_line,
    );

    return this.findOne(ctx, call.id);
  }

  async startPractice(ctx: OrgContext, dto: CreatePracticeCallDto) {
    const practiceAgent = await this.prisma.practiceAgent.findFirst({
      where: { id: dto.practice_agent_id, organisation_id: ctx.organisationId },
      include: { linked_assistant_agent: true },
    });
    if (!practiceAgent)
      throw new NotFoundException({
        message: 'Practice agent not found',
        code: ErrorCodes.PracticeAgents.NOT_FOUND,
      });

    const copilotEnabled = dto.copilot_enabled ?? false;
    const assistant = copilotEnabled
      ? await this.resolveAssistantAgent(
          ctx,
          dto.assistant_agent_id ??
            practiceAgent.linked_assistant_agent_id ??
            undefined,
        )
      : null;
    if (copilotEnabled && !assistant)
      throw new BadRequestException(
        'Choose an assistant agent to practice with the co-pilot',
      );

    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
    });
    const snapshot = toPracticeSnapshot(
      practiceAgent,
      practiceAgent.linked_assistant_agent?.knowledge?.slice(0, 2000) ?? null,
    );
    if (dto.voice_provider) snapshot.voice_provider = dto.voice_provider;
    if (dto.voice) snapshot.voice = dto.voice;

    const call = await this.prisma.call.create({
      data: {
        organisation_id: ctx.organisationId,
        user_id: ctx.userId,
        kind: CallKind.PRACTICE,
        call_type: CallType.PRACTICE,
        practice_agent_id: practiceAgent.id,
        assistant_agent_id: assistant?.id,
        copilot_enabled: copilotEnabled,
        title: practiceAgent.name,
        prospect_name: practiceAgent.prospect_name,
        prospect_company: practiceAgent.company,
        prospect_role: practiceAgent.job_title,
        goal: practiceAgent.user_objective,
        language: practiceAgent.language,
        keep_recording: dto.keep_recording ?? user.keep_recordings,
        agent_snapshot: assistant
          ? asJson(toAgentSnapshot(assistant))
          : undefined,
        practice_snapshot: asJson(snapshot),
      },
    });

    if (assistant) {
      await this.copilotService.createInitialSuggestions(
        call,
        toAgentSnapshot(assistant),
        null,
        false,
      );
    }

    return this.findOne(ctx, call.id);
  }

  async findAll(ctx: OrgContext, query: CallQueryType) {
    const scoreFilter =
      query.min_score != null || query.max_score != null
        ? {
            analysis: {
              overall_score: {
                ...(query.min_score != null && { gte: query.min_score }),
                ...(query.max_score != null && { lte: query.max_score }),
              },
            },
          }
        : {};

    const where: Prisma.CallWhereInput = {
      organisation_id: ctx.organisationId,
      ...(can(ctx, Permissions.CALLS_VIEW_ALL) && !query.mine
        ? {}
        : { user_id: ctx.userId }),
      ...(query.kind && { kind: query.kind }),
      ...(query.call_type && { call_type: query.call_type }),
      ...(query.assistant_agent_id && {
        assistant_agent_id: query.assistant_agent_id,
      }),
      ...(query.practice_agent_id && {
        practice_agent_id: query.practice_agent_id,
      }),
      ...(query.status && { status: query.status }),
      ...(query.outcome && {
        outcome: query.outcome === 'NONE' ? null : query.outcome,
      }),
      ...((query.from || query.to) && {
        started_at: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { prospect_name: { contains: query.search, mode: 'insensitive' } },
          { prospect_company: { contains: query.search, mode: 'insensitive' } },
          { context_notes: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...scoreFilter,
    };

    const orderBy: Prisma.CallOrderByWithRelationInput =
      query.order_by === 'score'
        ? { analysis: { overall_score: query.order_direction } }
        : { [query.order_by]: query.order_direction };

    const [calls, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          analysis: { select: { overall_score: true } },
          assistant_agent: { select: { id: true, name: true } },
          practice_agent: {
            select: {
              id: true,
              name: true,
              difficulty: true,
              lead_temperature: true,
            },
          },
          user: { select: { id: true, full_name: true, email: true } },
        },
      }),
      this.prisma.call.count({ where }),
    ]);

    const data: CallListItem[] = calls.map((call) => ({
      id: call.id,
      kind: call.kind,
      call_type: call.call_type,
      status: call.status,
      title: call.title,
      prospect_name: call.prospect_name,
      prospect_company: call.prospect_company,
      started_at: call.started_at,
      duration_seconds: call.duration_seconds,
      outcome: call.outcome,
      custom_outcome: call.custom_outcome,
      copilot_enabled: call.copilot_enabled,
      objective_achieved: call.objective_achieved,
      has_recording: !!call.recording_path,
      score: call.analysis?.overall_score ?? null,
      assistant_agent: call.assistant_agent,
      practice_agent: call.practice_agent,
      owner: {
        id: call.user.id,
        name: call.user.full_name || call.user.email,
        is_you: call.user.id === ctx.userId,
      },
    }));

    const totalPages = Math.ceil(total / query.limit);
    return {
      data,
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
    const call = await findOwnedCall(
      this.prisma,
      ctx,
      id,
      {
        segments: { orderBy: { start_ms: 'asc' } },
        suggestions: { orderBy: { at_ms: 'asc' } },
        bookmarks: { orderBy: { at_ms: 'asc' } },
        analysis: true,
        assistant_agent: {
          select: { id: true, name: true, archived_at: true },
        },
        practice_agent: {
          select: { id: true, name: true, difficulty: true, archived_at: true },
        },
        user: { select: { id: true, full_name: true, email: true } },
      },
      'read',
    );

    const { recording_path, practice_snapshot, user, ...rest } = call;
    const persona = practice_snapshot as unknown as PracticeSnapshot | null;

    // Hidden persona details are only revealed once the session is over.
    const practice = persona
      ? call.status === CallStatus.IN_PROGRESS
        ? Object.fromEntries(
            BRIEFING_FIELDS.map((field) => [field, persona[field]]),
          )
        : persona
      : null;

    return {
      ...rest,
      has_recording: !!recording_path,
      practice,
      owner: {
        id: user.id,
        name: user.full_name || user.email,
        is_you: user.id === ctx.userId,
      },
    };
  }

  async update(ctx: OrgContext, id: string, dto: UpdateCallDto) {
    const call = await findOwnedCall(
      this.prisma,
      ctx,
      id,
      undefined,
      dto.assistant_agent_id ? 'live' : 'manage',
    );
    const { assistant_agent_id, ...rest } = dto;
    const data: Prisma.CallUncheckedUpdateInput = { ...rest };

    if (assistant_agent_id && assistant_agent_id !== call.assistant_agent_id) {
      if (call.status !== CallStatus.IN_PROGRESS)
        throw new BadRequestException(
          'The co-pilot can only be switched during a call',
        );
      const agent = await this.resolveAssistantAgent(ctx, assistant_agent_id);
      data.assistant_agent_id = agent.id;
      data.agent_snapshot = asJson(toAgentSnapshot(agent));
      data.script_progress = asJson([]);
      data.copilot_enabled = true;
    }

    await this.prisma.call.update({ where: { id }, data });
    return this.findOne(ctx, id);
  }

  async end(ctx: OrgContext, id: string, dto: EndCallDto) {
    const call = await findOwnedCall(this.prisma, ctx, id);
    if (call.status !== CallStatus.IN_PROGRESS) return this.findOne(ctx, id);

    const hasSegments =
      (await this.prisma.transcriptSegment.count({ where: { call_id: id } })) >
      0;
    await this.prisma.call.update({
      where: { id },
      data: {
        status: hasSegments ? CallStatus.ANALYZING : CallStatus.ENDED,
        ended_at: new Date(),
        ended_reason: dto.ended_reason,
        duration_seconds: dto.duration_seconds,
        outcome: dto.outcome,
        custom_outcome: dto.custom_outcome,
        analysis_error: hasSegments
          ? null
          : 'Nothing was transcribed during this call, so it cannot be analyzed.',
      },
    });

    this.recordAudioUsage(
      ctx,
      call.id,
      call.kind,
      call.practice_snapshot as unknown as PracticeSnapshot | null,
      dto.audio_seconds ?? dto.duration_seconds,
      call.call_type,
    );
    if (hasSegments) this.analysisService.queue(id);

    return this.findOne(ctx, id);
  }

  async remove(ctx: OrgContext, id: string) {
    const call = await findOwnedCall(this.prisma, ctx, id, undefined, 'manage');
    if (call.recording_path)
      await this.recordingStorage.remove(call.recording_path);
    await this.prisma.call.delete({ where: { id } });
    return { id, deleted: true };
  }

  async saveRecording(ctx: OrgContext, id: string, file: Express.Multer.File) {
    const call = await findOwnedCall(this.prisma, ctx, id);
    if (!file?.buffer?.length)
      throw new BadRequestException('Recording file is empty');
    if (!call.keep_recording)
      throw new BadRequestException('Recording is disabled for this call');

    if (call.recording_path)
      await this.recordingStorage
        .remove(call.recording_path)
        .catch(() => undefined);
    const mime = (file.mimetype || 'audio/webm').split(';')[0];
    const stored = await this.recordingStorage.save(
      ctx.userId,
      id,
      file.buffer,
      mime,
    );

    await this.prisma.call.update({
      where: { id },
      data: {
        recording_path: stored.path,
        recording_mime: stored.mime,
        recording_size: stored.size,
      },
    });
    return { id, has_recording: true, size: stored.size };
  }

  async openRecording(
    ctx: OrgContext,
    id: string,
  ): Promise<{ stream: Readable; mime: string; size: number | null }> {
    const call = await findOwnedCall(this.prisma, ctx, id, undefined, 'read');
    if (!call.recording_path)
      throw new NotFoundException({
        message: 'This call has no recording',
        code: ErrorCodes.Calls.NO_RECORDING,
      });
    return {
      stream: await this.recordingStorage.open(call.recording_path),
      mime: call.recording_mime ?? 'audio/webm',
      size: call.recording_size,
    };
  }

  async deleteRecording(ctx: OrgContext, id: string) {
    const call = await findOwnedCall(this.prisma, ctx, id, undefined, 'manage');
    if (call.recording_path)
      await this.recordingStorage.remove(call.recording_path);
    await this.prisma.call.update({
      where: { id },
      data: {
        recording_path: null,
        recording_mime: null,
        recording_size: null,
        keep_recording: false,
      },
    });
    return this.findOne(ctx, id);
  }

  async deleteTranscript(ctx: OrgContext, id: string) {
    const call = await findOwnedCall(this.prisma, ctx, id, undefined, 'manage');
    if (
      call.status === CallStatus.IN_PROGRESS ||
      call.status === CallStatus.ANALYZING
    ) {
      throw new BadRequestException(
        'Wait until the call is finished and analyzed',
      );
    }
    await this.prisma.transcriptSegment.deleteMany({ where: { call_id: id } });
    return this.findOne(ctx, id);
  }

  async updateSegment(
    ctx: OrgContext,
    id: string,
    segmentId: string,
    dto: UpdateSegmentDto,
  ) {
    await findOwnedCall(this.prisma, ctx, id, undefined, 'manage');
    const segment = await this.prisma.transcriptSegment.findFirst({
      where: { id: segmentId, call_id: id },
    });
    if (!segment) throw new NotFoundException('Transcript line not found');
    return this.prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: { speaker: dto.speaker },
    });
  }

  async addBookmark(ctx: OrgContext, id: string, dto: CreateBookmarkDto) {
    await findOwnedCall(this.prisma, ctx, id);
    return this.prisma.bookmark.create({
      data: { call_id: id, at_ms: dto.at_ms, label: dto.label },
    });
  }

  async removeBookmark(ctx: OrgContext, id: string, bookmarkId: string) {
    await findOwnedCall(this.prisma, ctx, id);
    await this.prisma.bookmark.deleteMany({
      where: { id: bookmarkId, call_id: id },
    });
    return { id: bookmarkId, deleted: true };
  }

  // Multi-language co-pilots default to auto-detection; an explicit choice must be a supported language.
  private resolveCallLanguage(
    requested: string | undefined,
    agent: { language: string; languages: string[] },
  ): string {
    const languages = agent.languages?.length
      ? agent.languages
      : [agent.language];
    if (requested === AUTO_LANGUAGE)
      return languages.length > 1 ? AUTO_LANGUAGE : languages[0];
    if (requested && SUPPORTED_LANGUAGE_CODES.includes(requested))
      return requested;
    return languages.length > 1 ? AUTO_LANGUAGE : languages[0];
  }

  private async resolveAssistantAgent(ctx: OrgContext, id?: string) {
    if (id) {
      const agent = await this.prisma.assistantAgent.findFirst({
        where: { id, organisation_id: ctx.organisationId, archived_at: null },
      });
      if (!agent)
        throw new NotFoundException({
          message: 'Assistant agent not found',
          code: ErrorCodes.AssistantAgents.NOT_FOUND,
        });
      return agent;
    }
    return this.prisma.assistantAgent.findFirst({
      where: { organisation_id: ctx.organisationId, archived_at: null },
      orderBy: [{ is_default: 'desc' }, { updated_at: 'desc' }],
    });
  }

  private recordAudioUsage(
    ctx: OrgContext,
    callId: string,
    kind: CallKind,
    persona: PracticeSnapshot | null,
    seconds: number,
    callType: CallType,
  ) {
    if (!seconds) return;
    const minutes = seconds / 60;

    if (kind === CallKind.PRACTICE && persona) {
      const provider = findVoiceProvider(
        persona.voice_provider as VoiceProvider,
      );
      this.usageService.record({
        organisationId: ctx.organisationId,
        userId: ctx.userId,
        callId,
        kind: UsageKind.PRACTICE_VOICE,
        model: persona.voice_provider,
        audioSeconds: seconds,
        costUsd: minutes * (provider?.cost_per_minute_usd ?? 0),
      });
      return;
    }

    const channels = callType === CallType.ONLINE_MEETING ? 2 : 1;
    this.usageService.record({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      callId,
      kind: UsageKind.TRANSCRIPTION,
      model: 'gpt-4o-transcribe',
      audioSeconds: seconds * channels,
      costUsd: minutes * channels * TRANSCRIPTION_COST_PER_MINUTE_USD,
    });
  }
}
