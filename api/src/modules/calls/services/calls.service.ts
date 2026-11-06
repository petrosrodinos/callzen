import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
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
import { CallTranscriptionService } from './call-transcription.service';
import { UploadCallDto } from '../dto/upload-call.dto';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  AUTO_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
} from '@/shared/config/languages/languages.config';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { CreditsService } from '@/modules/billing/services/credits.service';
import { AnalysisVisibilityService } from '@/modules/billing/services/analysis-visibility.service';
import { AssignmentsService } from '@/modules/coaching/services/assignments.service';
import {
  AgentAccessErrorCodes,
  AgentAccessService,
} from '@/modules/agent-access/agent-access.service';

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
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly usageService: UsageService,
    private readonly copilotService: CopilotService,
    private readonly analysisService: CallAnalysisService,
    private readonly transcriptionService: CallTranscriptionService,
    private readonly planLimits: PlanLimitService,
    private readonly credits: CreditsService,
    private readonly analysisVisibility: AnalysisVisibilityService,
    private readonly agentAccess: AgentAccessService,
    private readonly assignments: AssignmentsService,
  ) {}

  async startLive(ctx: OrgContext, dto: CreateCallDto) {
    const allowance = await this.planLimits.assertCanStartCall(ctx, CallKind.LIVE);
    const copilotEnabled = dto.copilot_enabled ?? true;
    const [user, agent] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: ctx.userId } }),
      copilotEnabled ? this.resolveAssistantAgent(ctx, dto.assistant_agent_id) : null,
    ]);
    if (copilotEnabled && !agent)
      throw new BadRequestException({
        message:
          'There is no co-pilot you can use yet. Create one, or ask your coach to share one.',
        code: AgentAccessErrorCodes.NO_SHARED_COPILOT,
      });

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
        purpose: dto.purpose,
        assistant_agent_id: agent?.id,
        copilot_enabled: copilotEnabled,
        prospect_name: dto.prospect_name,
        prospect_company: dto.prospect_company,
        prospect_role: dto.prospect_role,
        context_notes: dto.context_notes,
        goal: dto.goal ?? agent?.call_goal,
        prior_call_id: dto.prior_call_id,
        language: this.resolveCallLanguage(dto.language, agent),
        keep_recording: dto.keep_recording ?? user.keep_recordings,
        // Left empty when not given: a title is generated from the transcript later.
        title: dto.title?.trim() || null,
        agent_snapshot: agent ? asJson(toAgentSnapshot(agent)) : undefined,
        max_duration_seconds: allowance.max_duration_seconds,
      },
    });

    if (agent)
      await this.copilotService.createInitialSuggestions(
        call,
        toAgentSnapshot(agent),
        agent.consent_line ?? user.consent_line,
        agent.suggest_consent_line,
      );

    return this.findOne(ctx, call.id);
  }

  // Import an existing recording: the file is stored, then a background job transcribes and
  // analyzes it (QUEUED -> TRANSCRIBING -> ANALYZING -> ANALYZED).
  async startUpload(
    ctx: OrgContext,
    dto: UploadCallDto,
    file: Express.Multer.File,
  ) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Recording file is empty');
    // The duration is checked against the remaining minutes after the probe, before transcription (§14).
    await this.planLimits.assertCanUpload(ctx);

    const useAgent = dto.copilot_enabled ?? true;
    const [user, agent] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: ctx.userId } }),
      useAgent ? this.resolveAssistantAgent(ctx, dto.assistant_agent_id) : null,
    ]);
    if (useAgent && !agent)
      throw new BadRequestException({
        message:
          'There is no co-pilot you can use yet. Create one, or ask your coach to share one.',
        code: AgentAccessErrorCodes.NO_SHARED_COPILOT,
      });
    if (dto.prior_call_id)
      await findOwnedCall(
        this.prisma,
        ctx,
        dto.prior_call_id,
        undefined,
        'read',
      );

    const filename = (file.originalname || 'recording').slice(0, 200);
    const call = await this.prisma.call.create({
      data: {
        organisation_id: ctx.organisationId,
        user_id: ctx.userId,
        kind: CallKind.LIVE,
        call_type: CallType.UPLOAD,
        purpose: dto.purpose,
        status: CallStatus.QUEUED,
        assistant_agent_id: agent?.id,
        copilot_enabled: false,
        prospect_name: dto.prospect_name,
        prospect_company: dto.prospect_company,
        prospect_role: dto.prospect_role,
        context_notes: dto.context_notes,
        goal: dto.goal ?? agent?.call_goal,
        prior_call_id: dto.prior_call_id,
        language: this.resolveCallLanguage(dto.language, agent),
        keep_recording: dto.keep_recording ?? user.keep_recordings,
        source_filename: filename,
        clean_transcript: dto.clean_transcript ?? false,
        title: dto.title?.trim() || null,
        agent_snapshot: agent ? asJson(toAgentSnapshot(agent)) : undefined,
      },
    });

    try {
      const mime = (file.mimetype || 'audio/mpeg').split(';')[0];
      const stored = await this.recordingStorage.save(
        ctx.userId,
        call.id,
        file.buffer,
        mime,
      );
      await this.prisma.call.update({
        where: { id: call.id },
        data: {
          recording_path: stored.path,
          recording_mime: stored.mime,
          recording_size: stored.size,
        },
      });
      await this.transcriptionService.enqueue(call.id);
    } catch (error) {
      this.logger.error(`Upload failed for call ${call.id}: ${error?.message}`);
      await this.remove(ctx, call.id).catch(() => undefined);
      throw error;
    }

    return this.findOne(ctx, call.id);
  }

  async startPractice(ctx: OrgContext, dto: CreatePracticeCallDto) {
    // Only prospects the caller can access (§10.1h); others are 404.
    const practiceAgent = await this.prisma.practiceAgent.findFirst({
      where: {
        id: dto.practice_agent_id,
        organisation_id: ctx.organisationId,
        ...this.agentAccess.practiceAgentVisibleWhere(ctx),
      },
      include: { linked_assistant_agent: true },
    });
    if (!practiceAgent)
      throw new NotFoundException({
        message: 'Practice agent not found',
        code: ErrorCodes.PracticeAgents.NOT_FOUND,
      });
    // Started from a coach's assignment: the caller must be one of its students (§10.1c).
    const assignment = dto.assignment_id
      ? await this.assignments.assertStartable(ctx, dto.assignment_id, practiceAgent.id)
      : null;
    const allowance = await this.planLimits.assertCanStartCall(
      ctx,
      CallKind.PRACTICE,
      practiceAgent.time_limit_minutes,
    );

    const copilotEnabled = dto.copilot_enabled ?? false;
    const assistant = copilotEnabled
      ? await this.resolveAssistantAgent(
          ctx,
          dto.assistant_agent_id ??
            practiceAgent.linked_assistant_agent_id ??
            undefined,
          practiceAgent,
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
    if (isPlatformAdmin(ctx)) {
      if (dto.voice_provider) snapshot.voice_provider = dto.voice_provider;
      if (dto.voice) snapshot.voice = dto.voice;
    } else {
      // Browser voice is admin-only; legacy prospects are upgraded on the fly.
      snapshot.voice_provider = VoiceProvider.OPENAI_REALTIME;
      const voice = dto.voice ?? snapshot.voice;
      snapshot.voice = OPENAI_VOICE_IDS.includes(voice) ? voice : DEFAULT_OPENAI_VOICE;
    }

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
        max_duration_seconds: allowance.max_duration_seconds,
        assignment_id: assignment?.id ?? null,
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
      ...(query.purpose && { purpose: query.purpose }),
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
      purpose: call.purpose,
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

    const admin = isPlatformAdmin(ctx);
    // Analysis visibility follows the plan of the organisation that owns the call (§9.3).
    const visible = rest.analysis
      ? await this.analysisVisibility.visibleFeaturesFor(call.organisation_id)
      : null;
    return {
      ...rest,
      // Model names are internal; only platform admins see them (§6.3).
      suggestions: admin
        ? rest.suggestions
        : rest.suggestions.map(({ model: _model, ...suggestion }) => suggestion),
      analysis: rest.analysis
        ? this.analysisVisibility.filter(
            admin
              ? rest.analysis
              : (({ model: _model, ...analysis }) => analysis)(rest.analysis),
            visible,
            { bypass: admin },
          )
        : null,
      has_recording: !!recording_path,
      practice,
      owner: {
        id: user.id,
        name: user.full_name || user.email,
        is_you: user.id === ctx.userId,
      },
      // AI cost of this session (charged and base): platform admins only (§6.2).
      ...(admin && { session_cost: await this.usageService.sessionCost(id) }),
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
    if (rest.title !== undefined) {
      const title = rest.title.trim();
      if (!title) throw new BadRequestException('The title cannot be empty');
      data.title = title;
    }

    if (assistant_agent_id && assistant_agent_id !== call.assistant_agent_id) {
      if (call.status !== CallStatus.IN_PROGRESS)
        throw new BadRequestException(
          'The co-pilot can only be switched during a call',
        );
      const agent = await this.resolveAssistantAgent(
        ctx,
        assistant_agent_id,
        call.practice_agent_id
          ? await this.prisma.practiceAgent.findUnique({
              where: { id: call.practice_agent_id },
              select: { linked_assistant_agent_id: true },
            })
          : null,
      );
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

    void this.recordAudioUsage(
      ctx,
      call.id,
      call.kind,
      call.practice_snapshot as unknown as PracticeSnapshot | null,
      dto.audio_seconds ?? dto.duration_seconds,
      call.call_type,
    ).catch((error) =>
      this.logger.warn(`Audio usage for ${call.id} failed: ${error?.message}`),
    );
    // Minutes are settled now so the next call start sees them (§3.5). Never blocks ending the call.
    await this.credits
      .settleCall(id)
      .catch((error) =>
        this.logger.error(`Settling minutes for call ${id} failed: ${error?.message}`),
      );
    if (hasSegments) await this.analysisService.queue(id);

    return this.findOne(ctx, id);
  }

  async remove(ctx: OrgContext, id: string) {
    const call = await findOwnedCall(this.prisma, ctx, id, undefined, 'manage');
    if (call.recording_path)
      await this.recordingStorage.remove(call.recording_path);
    await this.prisma.call.delete({ where: { id } });
    // Pending jobs would otherwise run against a call that no longer exists.
    await Promise.all([
      this.analysisService.cancel(id),
      this.transcriptionService.cancel(id),
    ]).catch(() => undefined);
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
    agent: { language: string; languages: string[] } | null,
  ): string {
    // Without an agent there is no language list to constrain the choice.
    if (!agent)
      return requested && SUPPORTED_LANGUAGE_CODES.includes(requested)
        ? requested
        : AUTO_LANGUAGE;
    const languages = agent.languages?.length
      ? agent.languages
      : [agent.language];
    if (requested === AUTO_LANGUAGE)
      return languages.length > 1 ? AUTO_LANGUAGE : languages[0];
    if (requested && SUPPORTED_LANGUAGE_CODES.includes(requested))
      return requested;
    return languages.length > 1 ? AUTO_LANGUAGE : languages[0];
  }

  // Only co-pilots the caller can use (§10.1h). Inside a practice session the prospect's linked co-pilot
  // is allowed even without direct access (rule 7). Without an id: the default if visible, else the newest
  // visible one.
  private async resolveAssistantAgent(
    ctx: OrgContext,
    id?: string,
    practice?: { linked_assistant_agent_id: string | null } | null,
  ) {
    if (id) return this.agentAccess.findUsableAssistantAgent(ctx, id, practice);
    return this.agentAccess.defaultUsableAssistantAgent(ctx);
  }

  // Audio is billed from durations (the browser talks to OpenAI directly over WebRTC, so the server never
  // sees audio token counts). Prices come from models.dev via UsageService.
  private async recordAudioUsage(
    ctx: OrgContext,
    callId: string,
    kind: CallKind,
    persona: PracticeSnapshot | null,
    seconds: number,
    callType: CallType,
  ) {
    if (!seconds) return;
    const models = this.appConfig.get('ai.default_models');
    const base = {
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      callId,
    };

    if (kind === CallKind.PRACTICE && persona) {
      // Browser voice costs are the PRACTICE_TURN text events recorded during the session.
      if (persona.voice_provider !== VoiceProvider.OPENAI_REALTIME) return;
      const { userSeconds, prospectSeconds } = await this.speechSplit(
        callId,
        seconds,
      );
      this.usageService.record({
        ...base,
        kind: UsageKind.PRACTICE_VOICE,
        model: models.voice,
        audio: { inputSeconds: userSeconds, outputSeconds: prospectSeconds },
      });
      // The voice session also transcribes what the salesperson says.
      this.usageService.record({
        ...base,
        kind: UsageKind.TRANSCRIPTION,
        model: models.transcription,
        audio: { inputSeconds: userSeconds },
      });
      return;
    }

    const channels = callType === CallType.ONLINE_MEETING ? 2 : 1;
    this.usageService.record({
      ...base,
      kind: UsageKind.TRANSCRIPTION,
      model: models.transcription,
      audio: { inputSeconds: seconds * channels },
    });
  }

  // How long each side spoke, from the transcript timings. Falls back to an even split of the call.
  private async speechSplit(callId: string, seconds: number) {
    const segments = await this.prisma.transcriptSegment.findMany({
      where: { call_id: callId },
      select: { speaker: true, start_ms: true, end_ms: true },
    });
    let userMs = 0;
    let prospectMs = 0;
    for (const segment of segments) {
      const ms = Math.max(0, segment.end_ms - segment.start_ms);
      if (segment.speaker === 'USER') userMs += ms;
      else if (segment.speaker === 'PROSPECT') prospectMs += ms;
    }
    if (!userMs && !prospectMs)
      return { userSeconds: seconds / 2, prospectSeconds: seconds / 2 };
    return {
      userSeconds: Math.min(seconds, userMs / 1000),
      prospectSeconds: Math.min(seconds, prospectMs / 1000),
    };
  }
}
