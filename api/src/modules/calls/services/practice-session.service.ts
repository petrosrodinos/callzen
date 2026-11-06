import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '@/modules/app-config/app-config.service';
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
import { ErrorCodes } from '@/shared/config/error-codes';
import { assertWithinTimeLimit } from '../utils/call-time-limit.utils';
import {
  AUTO_LANGUAGE,
  languageNames,
} from '@/shared/config/languages/languages.config';

@Injectable()
export class PracticeSessionService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly realtimeService: OpenAiRealtimeService,
    private readonly usageService: UsageService,
  ) {}

  // Runtime model defaults (admin-configurable); a co-pilot's own model wins when set.
  private get models() {
    return this.appConfig.get('ai.default_models');
  }

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
    // Short-lived realtime secrets are never re-issued past the call's minutes.
    assertWithinTimeLimit(call);

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
        model: this.models.voice,
        transcriptionModel: this.models.transcription,
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
      model: this.models.voice,
      voice: persona.voice,
      instructions: buildRealtimeProspectInstructions(persona),
      language: persona.languages?.length > 1 ? undefined : persona.language,
      transcriptionModel: this.models.transcription,
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

    assertWithinTimeLimit(call);
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
      model: this.models.utility,
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
      tokens: result.usage,
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
