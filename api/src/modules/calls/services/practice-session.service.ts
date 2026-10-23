import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { OpenAiRealtimeService } from '@/integrations/ai/services/openai-realtime.service';
import { UsageService } from '@/modules/usage/usage.service';
import {
  CallKind,
  CallStatus,
  Speaker,
  UsageKind,
  VoiceProvider,
} from 'generated/prisma';
import { PracticeTurnDto, RealtimeSessionDto } from '../dto/call-session.dto';
import {
  AgentSnapshot,
  PracticeSnapshot,
} from '../interfaces/call-snapshots.interface';
import {
  PracticeTurnResponse,
  RealtimeSessionResponse,
} from '../interfaces/calls.interface';
import {
  buildProspectInstructions,
  buildRealtimeProspectInstructions,
  END_CALL_TOOL_NAME,
  ProspectTurnSchema,
  REALTIME_END_CALL_TOOL,
} from '../utils/prospect.prompts';
import { formatTranscript } from '../utils/transcript.utils';
import { findOwnedCall } from '../utils/snapshot.utils';
import { UTILITY_MODEL } from '@/shared/config/ai-models/ai-models.config';
import {
  REALTIME_TRANSCRIPTION_MODEL,
  REALTIME_VOICE_MODEL,
} from '@/shared/config/voices/voice-providers.config';
import { ErrorCodes } from '@/shared/config/error-codes';
import {
  AUTO_LANGUAGE,
  languageNames,
} from '@/shared/config/languages/languages.config';

@Injectable()
export class PracticeSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly realtimeService: OpenAiRealtimeService,
    private readonly usageService: UsageService,
  ) {}

  async createRealtimeSession(
    ctx: OrgContext,
    callId: string,
    dto: RealtimeSessionDto,
  ): Promise<RealtimeSessionResponse> {
    const call = await findOwnedCall(this.prisma, ctx, callId);
    if (call.status !== CallStatus.IN_PROGRESS) {
      throw new BadRequestException({
        message: 'Call is not in progress',
        code: ErrorCodes.Calls.NOT_IN_PROGRESS,
      });
    }

    if (dto.purpose === 'TRANSCRIPTION') {
      const agent = call.agent_snapshot as unknown as AgentSnapshot | null;
      const spoken =
        agent?.languages?.length > 1
          ? `Languages that may be spoken: ${languageNames(agent.languages)}. `
          : '';
      const vocabulary = [
        call.prospect_name,
        call.prospect_company,
        agent?.name,
      ]
        .filter(Boolean)
        .join(', ');
      return this.realtimeService.createTranscriptionSession({
        model: REALTIME_VOICE_MODEL,
        transcriptionModel: REALTIME_TRANSCRIPTION_MODEL,
        language: call.language === AUTO_LANGUAGE ? undefined : call.language,
        prompt: `Sales call. ${spoken}${vocabulary ? `Names that may appear: ${vocabulary}.` : ''}`,
      });
    }

    if (call.kind !== CallKind.PRACTICE)
      throw new BadRequestException(
        'Voice sessions are only available for practice calls',
      );
    const persona = call.practice_snapshot as unknown as PracticeSnapshot;
    if (persona.voice_provider !== VoiceProvider.OPENAI_REALTIME) {
      throw new BadRequestException(
        'This practice session uses the browser voice provider',
      );
    }

    const session = await this.realtimeService.createVoiceSession({
      model: REALTIME_VOICE_MODEL,
      voice: persona.voice,
      instructions: buildRealtimeProspectInstructions(persona),
      language: persona.languages?.length > 1 ? undefined : persona.language,
      transcriptionModel: REALTIME_TRANSCRIPTION_MODEL,
      tools: [REALTIME_END_CALL_TOOL],
    });

    return {
      ...session,
      voice: persona.voice,
      end_call_tool: END_CALL_TOOL_NAME,
    };
  }

  async practiceTurn(
    ctx: OrgContext,
    callId: string,
    dto: PracticeTurnDto,
  ): Promise<PracticeTurnResponse> {
    const call = await findOwnedCall(this.prisma, ctx, callId);
    if (call.kind !== CallKind.PRACTICE)
      throw new BadRequestException('Not a practice session');
    if (call.status !== CallStatus.IN_PROGRESS) {
      throw new BadRequestException({
        message: 'Call is not in progress',
        code: ErrorCodes.Calls.NOT_IN_PROGRESS,
      });
    }

    const persona = call.practice_snapshot as unknown as PracticeSnapshot;
    const userText = dto.user_text?.trim();

    const userSegment = userText
      ? await this.prisma.transcriptSegment.upsert({
          where: {
            call_id_client_id: {
              call_id: callId,
              client_id: dto.client_id ?? `turn-${dto.start_ms}`,
            },
          },
          create: {
            call_id: callId,
            client_id: dto.client_id ?? `turn-${dto.start_ms}`,
            speaker: Speaker.USER,
            text: userText,
            start_ms: dto.start_ms,
            end_ms: Math.max(dto.end_ms, dto.start_ms),
          },
          update: {},
        })
      : null;

    const history = await this.prisma.transcriptSegment.findMany({
      where: { call_id: callId },
      orderBy: { start_ms: 'asc' },
    });
    if (!userText && history.length)
      throw new BadRequestException('Say something to the prospect first');

    const result = await this.aiService.generateStructured({
      model: UTILITY_MODEL,
      schema: ProspectTurnSchema,
      schemaName: 'prospect_turn',
      system: `${buildProspectInstructions(persona)}\n\n# OUTPUT\nReturn your next spoken turn as "reply". Set end_call=true only if you hang up after this reply. Set objective_agreed=true only at the moment you agree to the salesperson's objective.`,
      prompt: history.length
        ? `The call so far ("YOU" is you, the prospect):\n${formatTranscript(history, { maxChars: 12000, speakerNames: { USER: 'SALESPERSON', PROSPECT: 'YOU' } })}\n\nYour next turn:`
        : 'The phone connects. Say your opening line.',
      temperature: 0.8,
      maxTokens: 300,
      timeoutMs: 20000,
    });

    this.usageService.record({
      organisationId: ctx.organisationId,
      userId: ctx.userId,
      callId,
      kind: UsageKind.PRACTICE_TURN,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
    });

    const startMs = Math.max(dto.end_ms + 400, history.at(-1)?.end_ms ?? 0);
    const words = result.output.reply.split(/\s+/).length;
    const prospectSegment = await this.prisma.transcriptSegment.create({
      data: {
        call_id: callId,
        client_id: `prospect-${startMs}-${Math.random().toString(36).slice(2, 8)}`,
        speaker: Speaker.PROSPECT,
        text: result.output.reply,
        start_ms: startMs,
        end_ms: startMs + words * 380,
      },
    });

    return {
      user_segment: userSegment,
      prospect_segment: prospectSegment,
      end_call: result.output.end_call,
      objective_agreed: result.output.objective_agreed,
    };
  }
}
