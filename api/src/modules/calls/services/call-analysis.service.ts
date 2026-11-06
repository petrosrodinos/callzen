import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { AssignmentsService } from '@/modules/coaching/services/assignments.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CALL_ANALYSIS_QUEUE } from '@/core/queues/queues.constants';
import {
  isPlatformAdmin,
  OrgContext,
} from '@/shared/interfaces/org-context.interface';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { z } from 'zod';
import { AiService } from '@/integrations/ai/services/ai.service';
import { AUTO_LANGUAGE } from '@/shared/config/languages/languages.config';
import { UsageService } from '@/modules/usage/usage.service';
import {
  CallKind,
  CallPurpose,
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
} from '@/shared/config/ai-models/ai-models.config';
import {
  AnalysisCriterion,
  COLD_CALL_ANALYSIS_CRITERIA,
  DEFAULT_ANALYSIS_CRITERIA,
} from '@/shared/config/templates/analysis-criteria.config';
import { getTemplateTranslation } from '@/shared/config/templates/i18n';
import { localizeCriteria } from '@/shared/config/templates/i18n/template-translation';
import { RerunAnalysisDto } from '../dto/call-session.dto';
import { clamp } from '@/shared/utils/math/math.utils';

export interface AnalysisOptions {
  model?: string;
  useCurrentCriteria?: boolean;
}

export interface AnalysisJobData extends AnalysisOptions {
  callId: string;
}

export const ANALYSIS_JOB_ATTEMPTS = 2;

@Injectable()
export class CallAnalysisService {
  private readonly logger = new Logger(CallAnalysisService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
    @InjectQueue(CALL_ANALYSIS_QUEUE)
    private readonly analysisQueue: Queue<AnalysisJobData>,
    private readonly assignments: AssignmentsService,
  ) {}

  // Runtime model defaults (admin-configurable); a co-pilot's own model wins when set.
  private get models() {
    return this.appConfig.get('ai.default_models');
  }

  async rerun(ctx: OrgContext, callId: string, dto: RerunAnalysisDto) {
    const call = await findOwnedCall(
      this.prisma,
      ctx,
      callId,
      undefined,
      'manage',
    );
    if (call.status === CallStatus.IN_PROGRESS)
      throw new BadRequestException('End the call before analyzing it');
    // Model choice is an internal capability: users always get the co-pilot's or the default model.
    const model = isPlatformAdmin(ctx) ? dto.model : undefined;
    if (model && !isKnownAiModel(model))
      throw new BadRequestException(`Unknown model: ${model}`);

    const segments = await this.prisma.transcriptSegment.count({
      where: { call_id: callId },
    });
    if (!segments)
      throw new BadRequestException('This call has no transcript to analyze');

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ANALYZING, analysis_error: null },
    });
    await this.queue(callId, {
      model,
      useCurrentCriteria: dto.use_current_criteria,
    });
    return { id: callId, status: CallStatus.ANALYZING };
  }

  // The job id is the call id, so a call is never analyzed twice concurrently.
  // Jobs are removed when they finish (success or failure) so a re-run can be queued again.
  async queue(callId: string, options: AnalysisOptions = {}) {
    await this.analysisQueue.add(
      'analyze',
      { callId, ...options },
      {
        jobId: callId,
        attempts: ANALYSIS_JOB_ATTEMPTS,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  // Drops the pending job (waiting, delayed or awaiting a retry). A job a worker is running right
  // now cannot be removed; it finds the call gone and exits, so that case is safe to ignore.
  async cancel(callId: string) {
    const job = await this.analysisQueue.getJob(callId);
    if (!job) return;
    await job.remove().catch((error: Error) => {
      this.logger.warn(
        `Could not cancel analysis for call ${callId}: ${error.message}`,
      );
    });
  }

  async markFailed(callId: string, error: unknown) {
    const message = String((error as Error)?.message ?? 'Unknown error');
    this.logger.error(`Analysis failed for call ${callId}: ${message}`);
    await this.prisma.call
      .update({
        where: { id: callId },
        data: {
          status: CallStatus.ANALYSIS_FAILED,
          analysis_error: message.slice(0, 1000),
        },
      })
      .catch(() => undefined);
  }

  async analyze(callId: string, options: AnalysisOptions) {
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

    // Runs only when the user gave no title; never overwrites one.
    if (!call.title?.trim())
      await this.generateTitle(call, call.segments, call.user_id);

    const snapshot = call.agent_snapshot as unknown as AgentSnapshot | null;
    const agent =
      options.useCurrentCriteria && call.assistant_agent
        ? toAgentSnapshot(call.assistant_agent)
        : snapshot;
    const persona =
      call.kind === CallKind.PRACTICE
        ? (call.practice_snapshot as unknown as PracticeSnapshot)
        : null;
    // Cold calls are judged on cold-call criteria, not the agent's sales criteria.
    const isColdCall = call.purpose === CallPurpose.COLD_CALL;
    const criteria: AnalysisCriterion[] = isColdCall
      ? localizeCriteria(
          COLD_CALL_ANALYSIS_CRITERIA,
          getTemplateTranslation(call.user.interface_language),
        )
      : agent?.analysis_criteria?.length
        ? agent.analysis_criteria
        : DEFAULT_ANALYSIS_CRITERIA;
    const model =
      options.model ?? agent?.analysis_model ?? this.models.analysis;
    const coachingSuggestions = call.suggestions.filter(
      (s) => s.type !== SuggestionType.ANSWER,
    );
    const includeSuggestions =
      call.copilot_enabled && coachingSuggestions.length > 0;

    const conversationLanguage =
      call.language === AUTO_LANGUAGE
        ? await this.detectConversationLanguage(
            call.id,
            { userId: call.user_id, organisationId: call.organisation_id },
            call.segments,
            persona?.languages ?? agent?.languages ?? [],
          )
        : call.language;

    const baseMetrics = computeConversationMetrics(call.segments, {
      raised: 0,
      handled: 0,
    });
    const promptInput = {
      kind: call.kind,
      purpose: call.purpose,
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
        conversationLanguage,
        call.user.interface_language,
        persona?.languages ?? agent?.languages,
        'review',
      ),
    };

    const result = await this.aiService.generateStructured({
      model,
      fallbackModel: this.models.analysis,
      schema: buildAnalysisSchema(!!persona, includeSuggestions),
      schemaName: 'call_analysis',
      system: buildAnalysisSystem(promptInput),
      prompt: buildAnalysisPrompt(promptInput),
      temperature: 0.2,
      maxTokens: 9000,
      timeoutMs: 180000,
    });

    this.usageService.record({
      organisationId: call.organisation_id,
      userId: call.user_id,
      callId,
      kind: UsageKind.ANALYSIS,
      model: result.model,
      tokens: result.usage,
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

    // Assignment progress post-step (§10.1c); the analysis itself is unchanged and never fails because of it.
    if (call.assignment_id)
      await this.assignments
        .recordAttempt(callId)
        .catch((error) =>
          this.logger.warn(`Assignment progress for ${callId} failed: ${error?.message}`),
        );
  }

  // A short, specific title (like a chat name) from the opening of the conversation.
  private async generateTitle(
    call: Parameters<typeof buildCallContext>[0] & {
      id: string;
      organisation_id: string;
    },
    segments: TranscriptSegment[],
    userId: string,
  ): Promise<void> {
    try {
      const transcript = formatTranscript(segments, { maxChars: 6000 });
      const result = await this.aiService.generateStructured({
        model: this.models.utility,
        schema: z.object({ title: z.string() }),
        schemaName: 'call_title',
        system:
          'You name a recorded sales call so it is easy to find in a list. Write a concise, specific title of 3 to 7 words that captures who the call was with or what it was about (for example "Pricing review with Smile Dental"). Use only facts stated in the transcript or call context. No quotes, no trailing punctuation, no generic words like "Call" or "Conversation" on their own. Write the title in the language of the transcript.',
        prompt: `${buildCallContext(call)}

Transcript:
${transcript}`,
        temperature: 0.3,
        maxTokens: 40,
        timeoutMs: 20000,
      });
      this.usageService.record({
        organisationId: call.organisation_id,
        userId,
        callId: call.id,
        kind: UsageKind.ANALYSIS,
        model: result.model,
        tokens: result.usage,
      });
      const title = result.output.title
        .replace(/^["'“”]+|["'“”.]+$/g, '')
        .trim()
        .slice(0, 120);
      if (!title) return;
      // Only fill an empty title, so a rename made meanwhile is kept.
      await this.prisma.call.updateMany({
        where: { id: call.id, title: null },
        data: { title },
      });
    } catch (error) {
      this.logger.warn(
        `Title generation failed for call ${call.id}: ${error?.message}`,
      );
    }
  }

  // For auto-detect calls, find which of the configured languages was actually spoken and store it,
  // so the report (and the library) use that language explicitly.
  private async detectConversationLanguage(
    callId: string,
    owner: { userId: string; organisationId: string },
    segments: TranscriptSegment[],
    candidates: string[],
  ): Promise<string> {
    if (candidates.length < 2) return candidates[0] ?? AUTO_LANGUAGE;
    try {
      const sample = segments
        .slice(0, 30)
        .map((s) => s.text)
        .join('\n')
        .slice(0, 3000);
      const result = await this.aiService.generateStructured({
        model: this.models.utility,
        schema: z.object({
          language: z.enum(candidates as [string, ...string[]]),
        }),
        schemaName: 'conversation_language',
        system:
          'Identify the main language spoken in this sales conversation transcript.',
        prompt: `Allowed language codes: ${candidates.join(', ')}\n\nTranscript:\n${sample}`,
        temperature: 0,
        maxTokens: 20,
        timeoutMs: 15000,
      });
      this.usageService.record({
        organisationId: owner.organisationId,
        userId: owner.userId,
        callId,
        kind: UsageKind.ANALYSIS,
        model: result.model,
        tokens: result.usage,
      });
      await this.prisma.call.update({
        where: { id: callId },
        data: { language: result.output.language },
      });
      return result.output.language;
    } catch (error) {
      this.logger.warn(
        `Language detection failed for call ${callId}: ${error?.message}`,
      );
      return AUTO_LANGUAGE;
    }
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
