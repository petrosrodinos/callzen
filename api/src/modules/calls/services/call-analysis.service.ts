import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { UsageService } from '@/modules/usage/usage.service';
import {
  CallKind,
  CallStatus,
  SuggestionType,
  TranscriptSegment,
  UsageKind,
} from 'generated/prisma';
import {
  AgentSnapshot,
  PracticeSnapshot,
} from '../interfaces/call-snapshots.interface';
import {
  buildAnalysisPrompt,
  buildAnalysisSchema,
  buildAnalysisSystem,
  CallAnalysisOutput,
} from '../utils/analysis.prompts';
import { computeConversationMetrics } from '../utils/call-metrics.utils';
import { formatTimestamp, formatTranscript } from '../utils/transcript.utils';
import {
  asJson,
  buildCallContext,
  findOwnedCall,
  toAgentSnapshot,
} from '../utils/snapshot.utils';
import { resolveOutputLanguage } from '../utils/copilot.prompts';
import {
  isKnownAiModel,
  RECOMMENDED_ANALYSIS_MODEL,
} from '@/shared/config/ai-models/ai-models.config';
import {
  AnalysisCriterion,
  DEFAULT_ANALYSIS_CRITERIA,
} from '@/shared/config/templates/analysis-criteria.config';
import { RerunAnalysisDto } from '../dto/call-session.dto';
import { clamp } from '@/shared/utils/math/math.utils';

interface AnalysisOptions {
  model?: string;
  useCurrentCriteria?: boolean;
}

@Injectable()
export class CallAnalysisService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CallAnalysisService.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
  ) {}

  // Resume analyses interrupted by a restart so no call stays stuck in ANALYZING.
  async onApplicationBootstrap() {
    try {
      const stuck = await this.prisma.call.findMany({
        where: { status: CallStatus.ANALYZING },
        select: { id: true },
      });
      stuck.forEach((call) => this.queue(call.id));
    } catch (error) {
      this.logger.warn(`Could not resume pending analyses: ${error?.message}`);
    }
  }

  async rerun(userId: string, callId: string, dto: RerunAnalysisDto) {
    const call = await findOwnedCall(this.prisma, userId, callId);
    if (call.status === CallStatus.IN_PROGRESS)
      throw new BadRequestException('End the call before analyzing it');
    if (dto.model && !isKnownAiModel(dto.model))
      throw new BadRequestException(`Unknown model: ${dto.model}`);

    const segments = await this.prisma.transcriptSegment.count({
      where: { call_id: callId },
    });
    if (!segments)
      throw new BadRequestException('This call has no transcript to analyze');

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ANALYZING, analysis_error: null },
    });
    this.queue(callId, {
      model: dto.model,
      useCurrentCriteria: dto.use_current_criteria,
    });
    return { id: callId, status: CallStatus.ANALYZING };
  }

  queue(callId: string, options: AnalysisOptions = {}) {
    if (this.running.has(callId)) return;
    this.running.add(callId);

    setImmediate(async () => {
      try {
        await this.analyze(callId, options);
      } catch (error) {
        this.logger.error(
          `Analysis failed for call ${callId}: ${error?.message}`,
        );
        await this.prisma.call
          .update({
            where: { id: callId },
            data: {
              status: CallStatus.ANALYSIS_FAILED,
              analysis_error: String(error?.message ?? 'Unknown error').slice(
                0,
                1000,
              ),
            },
          })
          .catch(() => undefined);
      } finally {
        this.running.delete(callId);
      }
    });
  }

  private async analyze(callId: string, options: AnalysisOptions) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: {
        user: true,
        assistant_agent: true,
        segments: { orderBy: { start_ms: 'asc' } },
        suggestions: { orderBy: { at_ms: 'asc' } },
        bookmarks: { orderBy: { at_ms: 'asc' } },
      },
    });
    if (!call) return;

    if (!call.segments.length) {
      await this.prisma.call.update({
        where: { id: callId },
        data: {
          status: CallStatus.ENDED,
          analysis_error:
            'Nothing was transcribed during this call, so it cannot be analyzed.',
        },
      });
      return;
    }

    const snapshot = call.agent_snapshot as unknown as AgentSnapshot | null;
    const agent =
      options.useCurrentCriteria && call.assistant_agent
        ? toAgentSnapshot(call.assistant_agent)
        : snapshot;
    const persona =
      call.kind === CallKind.PRACTICE
        ? (call.practice_snapshot as unknown as PracticeSnapshot)
        : null;
    const criteria: AnalysisCriterion[] = agent?.analysis_criteria?.length
      ? agent.analysis_criteria
      : DEFAULT_ANALYSIS_CRITERIA;
    const model =
      options.model ?? agent?.analysis_model ?? RECOMMENDED_ANALYSIS_MODEL;
    const coachingSuggestions = call.suggestions.filter(
      (s) => s.type !== SuggestionType.ANSWER,
    );
    const includeSuggestions =
      call.copilot_enabled && coachingSuggestions.length > 0;

    const baseMetrics = computeConversationMetrics(call.segments, {
      raised: 0,
      handled: 0,
    });
    const promptInput = {
      kind: call.kind,
      agent,
      persona,
      criteria,
      callContext: `${buildCallContext(call)}\nDuration: ${formatTimestamp(call.duration_seconds * 1000)}\nEnded because: ${call.ended_reason ?? 'unknown'}`,
      transcript: formatTranscript(call.segments, { maxChars: 60000 }),
      suggestions: coachingSuggestions
        .map(
          (s, index) =>
            `S${index} [${formatTimestamp(s.at_ms)}] ${s.type}: ${s.text}${s.status === 'DISMISSED' ? ' (dismissed)' : ''}`,
        )
        .join('\n'),
      bookmarks: call.bookmarks
        .map((b) => `[${formatTimestamp(b.at_ms)}] ${b.label ?? 'Bookmark'}`)
        .join('\n'),
      metrics: JSON.stringify({
        ...baseMetrics,
        objections_raised: undefined,
        objections_handled: undefined,
      }),
      outcome: call.outcome
        ? `${call.outcome}${call.custom_outcome ? ` (${call.custom_outcome})` : ''}`
        : 'not recorded',
      outputLanguage: resolveOutputLanguage(
        call.user.output_language_mode,
        call.language,
        call.user.interface_language,
      ),
    };

    const result = await this.aiService.generateStructured({
      model,
      fallbackModel: RECOMMENDED_ANALYSIS_MODEL,
      schema: buildAnalysisSchema(!!persona, includeSuggestions),
      schemaName: 'call_analysis',
      system: buildAnalysisSystem(promptInput),
      prompt: buildAnalysisPrompt(promptInput),
      temperature: 0.2,
      maxTokens: 9000,
      timeoutMs: 180000,
    });

    this.usageService.record({
      userId: call.user_id,
      callId,
      kind: UsageKind.ANALYSIS,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: result.usage.costUsd,
    });

    const output = result.output as CallAnalysisOutput;
    const at = (ref: number | null | undefined) =>
      this.resolveRef(call.segments, ref);

    const categoryScores = criteria.map((criterion) => {
      const scored = output.category_scores.find(
        (c) => c.key === criterion.key,
      );
      return {
        key: criterion.key,
        label: criterion.label,
        weight: criterion.weight,
        score: scored ? clamp(scored.score, 0, 100) : null,
        comment: scored?.comment ?? '',
      };
    });
    const weighted = categoryScores.filter(
      (c) => c.score != null && c.weight > 0,
    );
    const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
    const overallScore = totalWeight
      ? Math.round(
          weighted.reduce((sum, c) => sum + c.score * c.weight, 0) /
            totalWeight,
        )
      : 0;

    const metrics = computeConversationMetrics(call.segments, {
      raised: output.objections.length,
      handled: output.objections.filter((o) => o.handled).length,
    });

    const suggestionUsage = output.suggestion_usage
      ? {
          ...output.suggestion_usage,
          items: output.suggestion_usage.items
            .filter((item) => coachingSuggestions[item.suggestion_ref])
            .map((item) => ({
              ...item,
              suggestion_id: coachingSuggestions[item.suggestion_ref].id,
              text: coachingSuggestions[item.suggestion_ref].text,
              type: coachingSuggestions[item.suggestion_ref].type,
              at_ms: coachingSuggestions[item.suggestion_ref].at_ms,
            })),
          followed: output.suggestion_usage.items.filter(
            (i) => i.usage === 'FOLLOWED',
          ).length,
          adapted: output.suggestion_usage.items.filter(
            (i) => i.usage === 'ADAPTED',
          ).length,
          ignored: output.suggestion_usage.items.filter(
            (i) => i.usage === 'IGNORED',
          ).length,
        }
      : null;

    const practiceResult = output.practice_result
      ? {
          ...output.practice_result,
          lost_attention: at(output.practice_result.lost_attention_ref),
        }
      : null;

    const data = {
      model: result.model,
      overall_score: overallScore,
      verdict: output.verdict,
      category_scores: asJson(categoryScores),
      mistakes: asJson(output.mistakes.map((m) => ({ ...m, ...at(m.ref) }))),
      strengths: asJson(output.strengths.map((s) => ({ ...s, ...at(s.ref) }))),
      improvements: asJson(output.improvements.slice(0, 3)),
      metrics: asJson({
        ...metrics,
        objections: output.objections.map((o) => ({ ...o, ...at(o.ref) })),
        buying_signals: output.buying_signals.map((b) => ({
          ...b,
          ...at(b.ref),
        })),
      }),
      prospect_insights: asJson(output.prospect_insights),
      summary: output.summary,
      next_steps: asJson(output.next_steps),
      follow_up_draft: output.follow_up_draft || null,
      suggested_practice: asJson(output.suggested_practice),
      practice_result: practiceResult ? asJson(practiceResult) : null,
      suggestion_usage: suggestionUsage ? asJson(suggestionUsage) : null,
      error: result.fallbackUsed
        ? `The selected model was unavailable; ${result.model} was used instead.`
        : null,
    };

    await this.prisma.$transaction([
      this.prisma.callAnalysis.upsert({
        where: { call_id: callId },
        create: { call_id: callId, ...data },
        update: data,
      }),
      this.prisma.call.update({
        where: { id: callId },
        data: {
          status: CallStatus.ANALYZED,
          analysis_error: null,
          ...(practiceResult && {
            objective_achieved: practiceResult.objective_achieved,
          }),
        },
      }),
    ]);
  }

  private resolveRef(
    segments: TranscriptSegment[],
    ref: number | null | undefined,
  ) {
    const segment = ref != null ? segments[ref] : undefined;
    return segment
      ? { at_ms: segment.start_ms, segment_id: segment.id }
      : { at_ms: null, segment_id: null };
  }
}
