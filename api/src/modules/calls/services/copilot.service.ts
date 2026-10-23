import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { UsageService } from '@/modules/usage/usage.service';
import {
  Call,
  CallStatus,
  Speaker,
  Suggestion,
  SuggestionFrequency,
  SuggestionType,
  TranscriptSegment,
  UsageKind,
} from 'generated/prisma';
import {
  AddSegmentsDto,
  AskCopilotDto,
  GenerateSuggestionDto,
  UpdateSuggestionDto,
} from '../dto/call-session.dto';
import { AgentSnapshot } from '../interfaces/call-snapshots.interface';
import {
  AddSegmentsResponse,
  AskCopilotResponse,
  SuggestionResult,
} from '../interfaces/calls.interface';
import {
  buildCopilotPrompt,
  buildCopilotSystem,
  CopilotAnswerSchema,
  CopilotSuggestionSchema,
  resolveOutputLanguage,
  buildAgentBrief,
} from '../utils/copilot.prompts';
import { formatTimestamp, formatTranscript } from '../utils/transcript.utils';
import {
  asJson,
  buildCallContext,
  findOwnedCall,
} from '../utils/snapshot.utils';
import { RECOMMENDED_REALTIME_MODEL } from '@/shared/config/ai-models/ai-models.config';
import { DEFAULT_CONSENT_LINE } from '@/shared/config/templates/analysis-criteria.config';
import { ErrorCodes } from '@/shared/config/error-codes';

const TRANSCRIPT_WINDOW = 40;
const BALANCED_USER_NUDGE_MS = 25000;

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
  ) {}

  // Seeds the panel with instant, no-LLM suggestions: the consent line and the script opener.
  async createInitialSuggestions(
    call: Call,
    agent: AgentSnapshot | null,
    consentLine: string | null,
    suggestConsent: boolean,
  ) {
    if (!agent) return;
    const data: {
      call_id: string;
      type: SuggestionType;
      text: string;
      reason: string;
      at_ms: number;
    }[] = [];

    if (suggestConsent) {
      data.push({
        call_id: call.id,
        type: SuggestionType.CONSENT,
        text: consentLine || DEFAULT_CONSENT_LINE,
        reason: 'Recording consent disclosure',
        at_ms: 0,
      });
    }

    const opener =
      agent.script?.find((stage) => stage.stage === 'OPENER') ??
      agent.script?.[0];
    if (opener && call.kind === 'LIVE') {
      data.push({
        call_id: call.id,
        type: SuggestionType.OPENER,
        text: opener.content,
        reason: opener.title,
        at_ms: 1,
      });
    }

    if (data.length) await this.prisma.suggestion.createMany({ data });
  }

  async addSegments(
    userId: string,
    callId: string,
    dto: AddSegmentsDto,
  ): Promise<AddSegmentsResponse> {
    const call = await findOwnedCall(this.prisma, userId, callId);

    const saved = await this.prisma.$transaction(
      dto.segments.map((segment) =>
        this.prisma.transcriptSegment.upsert({
          where: {
            call_id_client_id: {
              call_id: callId,
              client_id: segment.client_id,
            },
          },
          create: {
            call_id: callId,
            client_id: segment.client_id,
            speaker: segment.speaker,
            text: segment.text.trim(),
            start_ms: segment.start_ms,
            end_ms: Math.max(segment.end_ms, segment.start_ms),
          },
          update: {},
        }),
      ),
    );

    const response: AddSegmentsResponse = {
      segments: saved,
      suggestion: null,
      speaker_updates: [],
    };
    if (
      call.status !== CallStatus.IN_PROGRESS ||
      !call.copilot_enabled ||
      dto.request_suggestion === false
    )
      return response;

    const agent = call.agent_snapshot as unknown as AgentSnapshot | null;
    if (!agent) return response;

    const frequency = dto.frequency ?? agent.suggestion_frequency;
    if (!(await this.shouldSuggest(call, saved, frequency))) return response;

    const result = await this.generate(
      userId,
      call,
      agent,
      frequency,
      dto.elapsed_ms ?? saved.at(-1).end_ms,
    );
    return { ...response, ...result };
  }

  async generateNow(
    userId: string,
    callId: string,
    dto: GenerateSuggestionDto,
  ): Promise<SuggestionResult> {
    const call = await findOwnedCall(this.prisma, userId, callId);
    const agent = call.agent_snapshot as unknown as AgentSnapshot | null;
    if (!agent || !call.copilot_enabled)
      throw new BadRequestException('The co-pilot is not active on this call');
    if (call.status !== CallStatus.IN_PROGRESS)
      throw new BadRequestException({
        message: 'Call is not in progress',
        code: ErrorCodes.Calls.NOT_IN_PROGRESS,
      });

    const lastSegment = await this.prisma.transcriptSegment.findFirst({
      where: { call_id: callId },
      orderBy: { start_ms: 'desc' },
    });
    return this.generate(
      userId,
      call,
      agent,
      dto.frequency ?? agent.suggestion_frequency,
      dto.elapsed_ms ?? lastSegment?.end_ms ?? 0,
    );
  }

  async ask(
    userId: string,
    callId: string,
    dto: AskCopilotDto,
  ): Promise<AskCopilotResponse> {
    const call = await findOwnedCall(this.prisma, userId, callId);
    const agent = call.agent_snapshot as unknown as AgentSnapshot | null;
    if (!agent)
      throw new BadRequestException('This call has no co-pilot agent');

    const [user, segments] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.recentSegments(callId),
    ]);

    const result = await this.aiService.generateStructured({
      model: agent.realtime_model,
      fallbackModel: RECOMMENDED_REALTIME_MODEL,
      schema: CopilotAnswerSchema,
      schemaName: 'copilot_answer',
      system: `You are CallZen, a sales co-pilot. The salesperson is on a live call and typed a quick question. Answer instantly in 1-3 short sentences they can use right away. Use the knowledge base; if the answer is not there, say so briefly and suggest how to handle it. Answer in ${resolveOutputLanguage(user.output_language_mode, call.language, user.interface_language)}.\n\n${buildAgentBrief(agent)}`,
      prompt: `CALL CONTEXT:\n${buildCallContext(call)}\n\nRECENT TRANSCRIPT:\n${formatTranscript(segments, { maxChars: 4000 })}\n\nQUESTION: ${dto.question}`,
      temperature: 0.2,
      maxTokens: 300,
      timeoutMs: 20000,
    });

    this.recordUsage(userId, callId, UsageKind.ASK, result);

    const suggestion = await this.prisma.suggestion.create({
      data: {
        call_id: callId,
        type: SuggestionType.ANSWER,
        text: result.output.answer,
        reason: dto.question.slice(0, 200),
        at_ms: dto.elapsed_ms ?? 0,
        status: 'PINNED',
        model: result.model,
        latency_ms: result.latencyMs,
      },
    });

    return {
      suggestion,
      found_in_knowledge: result.output.found_in_knowledge,
      fallback_model: result.fallbackUsed ? result.model : null,
    };
  }

  async updateSuggestion(
    userId: string,
    callId: string,
    suggestionId: string,
    dto: UpdateSuggestionDto,
  ): Promise<Suggestion> {
    await findOwnedCall(this.prisma, userId, callId);
    const suggestion = await this.prisma.suggestion.findFirst({
      where: { id: suggestionId, call_id: callId },
    });
    if (!suggestion) throw new BadRequestException('Suggestion not found');
    return this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: dto,
    });
  }

  private async shouldSuggest(
    call: Call,
    saved: TranscriptSegment[],
    frequency: SuggestionFrequency,
  ): Promise<boolean> {
    const hasProspectLine = saved.some(
      (segment) => segment.speaker !== Speaker.USER,
    );
    if (frequency === SuggestionFrequency.CONSTANT) return true;
    if (hasProspectLine) return true;
    if (frequency === SuggestionFrequency.OBJECTIONS_ONLY) return false;

    // Balanced mode: nudge the salesperson if they have been talking without fresh guidance.
    const last = await this.prisma.suggestion.findFirst({
      where: {
        call_id: call.id,
        type: { notIn: [SuggestionType.ANSWER, SuggestionType.CONSENT] },
      },
      orderBy: { at_ms: 'desc' },
    });
    return !last || saved.at(-1).end_ms - last.at_ms > BALANCED_USER_NUDGE_MS;
  }

  private async generate(
    userId: string,
    call: Call,
    agent: AgentSnapshot,
    frequency: SuggestionFrequency,
    elapsedMs: number,
  ): Promise<SuggestionResult> {
    const [user, segments, recent] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.recentSegments(call.id),
      this.prisma.suggestion.findMany({
        where: { call_id: call.id, type: { not: SuggestionType.ANSWER } },
        orderBy: { at_ms: 'desc' },
        take: 5,
      }),
    ]);

    const hasUnlabeled = segments.some(
      (segment) => segment.speaker === Speaker.UNKNOWN,
    );
    const completedStageIds = (call.script_progress as string[]) ?? [];
    const promptInput = {
      agent,
      callContext: buildCallContext(call),
      transcript: formatTranscript(segments, { maxChars: 9000 }),
      recentSuggestions: recent.reverse().map((s) => `[${s.type}] ${s.text}`),
      completedStageIds,
      outputLanguage: resolveOutputLanguage(
        user.output_language_mode,
        call.language,
        user.interface_language,
      ),
      frequency,
      hasUnlabeled,
      elapsedLabel: formatTimestamp(elapsedMs),
    };

    try {
      const result = await this.aiService.generateStructured({
        model: agent.realtime_model,
        fallbackModel: RECOMMENDED_REALTIME_MODEL,
        schema: CopilotSuggestionSchema,
        schemaName: 'copilot_suggestion',
        system: buildCopilotSystem(promptInput),
        prompt: buildCopilotPrompt(promptInput),
        temperature: 0.3,
        maxTokens: 500,
        timeoutMs: 12000,
      });

      this.recordUsage(userId, call.id, UsageKind.SUGGESTION, result);
      const output = result.output;

      const speakerUpdates = await this.applySpeakerLabels(
        segments,
        output.speaker_labels,
      );
      const progress = [
        ...new Set([...completedStageIds, ...output.completed_stage_ids]),
      ].filter((id) => agent.script.some((stage) => stage.id === id));
      if (progress.length !== completedStageIds.length) {
        await this.prisma.call.update({
          where: { id: call.id },
          data: { script_progress: asJson(progress) },
        });
      }

      const suggestion =
        output.show && output.text.trim()
          ? await this.prisma.suggestion.create({
              data: {
                call_id: call.id,
                type: output.type,
                text: output.text.trim(),
                alternatives: asJson(
                  output.alternatives.slice(0, agent.alternatives_count),
                ),
                reason: output.reason,
                info_card: output.info_card
                  ? asJson(output.info_card)
                  : undefined,
                at_ms: elapsedMs,
                model: result.model,
                latency_ms: result.latencyMs,
              },
            })
          : null;

      return {
        suggestion,
        speaker_updates: speakerUpdates,
        script_progress: progress,
        fallback_model: result.fallbackUsed ? result.model : null,
      };
    } catch (error) {
      // Suggestions are best-effort: the call and its transcript must keep going.
      this.logger.warn(
        `Suggestion generation failed for call ${call.id}: ${error?.message}`,
      );
      return {
        suggestion: null,
        speaker_updates: [],
        suggestions_unavailable: true,
      };
    }
  }

  private async applySpeakerLabels(
    segments: TranscriptSegment[],
    labels: { ref: number; speaker: 'USER' | 'PROSPECT' }[],
  ): Promise<{ id: string; speaker: Speaker }[]> {
    const updates = labels
      .map((label) => ({
        segment: segments[label.ref],
        speaker: label.speaker as Speaker,
      }))
      .filter(({ segment }) => segment && segment.speaker === Speaker.UNKNOWN);

    if (!updates.length) return [];
    await this.prisma.$transaction(
      updates.map(({ segment, speaker }) =>
        this.prisma.transcriptSegment.update({
          where: { id: segment.id },
          data: { speaker },
        }),
      ),
    );
    return updates.map(({ segment, speaker }) => ({ id: segment.id, speaker }));
  }

  private async recentSegments(callId: string) {
    const latest = await this.prisma.transcriptSegment.findMany({
      where: { call_id: callId },
      orderBy: { start_ms: 'desc' },
      take: TRANSCRIPT_WINDOW,
    });
    return latest.reverse();
  }

  private recordUsage(
    userId: string,
    callId: string,
    kind: UsageKind,
    result: {
      model: string;
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
    },
  ) {
    this.usageService.record({
      userId,
      callId,
      kind,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
    });
  }
}
