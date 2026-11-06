import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import * as os from 'os';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import { z } from 'zod';
import {
  CallEndReason,
  CallStatus,
  Speaker,
  UsageKind,
} from 'generated/prisma';
import { CALL_TRANSCRIPTION_QUEUE } from '@/core/queues/queues.constants';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { UsageService } from '@/modules/usage/usage.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { AUTO_LANGUAGE } from '@/shared/config/languages/languages.config';
import { findAudioModel } from '@/shared/config/ai-models/ai-models.config';
import { PlanLimitService } from '@/modules/billing/services/plan-limit.service';
import { CreditsService } from '@/modules/billing/services/credits.service';
import { PlanErrorCodes } from '@/shared/config/plans/plans.config';
import { AgentSnapshot } from '../interfaces/call-snapshots.interface';
import { buildCallContext, findOwnedCall } from '../utils/snapshot.utils';
import { CallAnalysisService } from './call-analysis.service';

// Speaker labels used when the transcription model cannot diarize and the utility model attributes speakers.
const SELLER_LABEL = 'SELLER';
const PROSPECT_LABEL = 'PROSPECT';
export const TRANSCRIPTION_JOB_ATTEMPTS = 2;

const CHUNK_SECONDS = 600;
const CHUNK_CONCURRENCY = 2;
const MERGE_GAP_MS = 1500;
const OPENAI_TRANSCRIPTIONS_URL =
  'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionJobData {
  callId: string;
}

interface DiarizedSegment {
  speaker: string;
  text: string;
  start_ms: number;
  end_ms: number;
}

interface ChunkResult {
  index: number;
  segments: DiarizedSegment[];
}

interface ContextPatch {
  prospect_name?: string;
  prospect_company?: string;
  prospect_role?: string;
  context_notes?: string;
}

interface TranscriptLineRow {
  speaker: Speaker;
  text: string;
  start_ms: number;
  end_ms: number;
}

// ffmpeg-static is a CommonJS module that exports the binary path itself.
const ffmpegPath = ffmpegStatic as unknown as string | null;
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

@Injectable()
export class CallTranscriptionService {
  private readonly logger = new Logger(CallTranscriptionService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
    private readonly analysisService: CallAnalysisService,
    private readonly planLimits: PlanLimitService,
    private readonly credits: CreditsService,
    @InjectQueue(CALL_TRANSCRIPTION_QUEUE)
    private readonly transcriptionQueue: Queue<TranscriptionJobData>,
  ) {}

  // Runtime model defaults (admin-configurable); a co-pilot's own model wins when set.
  private get models() {
    return this.appConfig.get('ai.default_models');
  }

  async enqueue(callId: string) {
    await this.transcriptionQueue.add(
      'transcribe',
      { callId },
      {
        jobId: callId,
        attempts: TRANSCRIPTION_JOB_ATTEMPTS,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  // Drops the pending job; a job already running finds the call gone and exits.
  async cancel(callId: string) {
    const job = await this.transcriptionQueue.getJob(callId);
    if (!job) return;
    await job.remove().catch(() => undefined);
  }

  async retry(ctx: OrgContext, callId: string) {
    const call = await findOwnedCall(
      this.prisma,
      ctx,
      callId,
      undefined,
      'manage',
    );
    if (call.status !== CallStatus.TRANSCRIPTION_FAILED)
      throw new BadRequestException('This call has no failed transcription');
    if (!call.recording_path)
      throw new BadRequestException(
        'The uploaded audio is no longer available',
      );

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.QUEUED, transcription_error: null },
    });
    await this.enqueue(callId);
    return { id: callId, status: CallStatus.QUEUED };
  }

  async markFailed(callId: string, error: unknown) {
    const message = String((error as Error)?.message ?? 'Unknown error');
    this.logger.error(`Transcription failed for call ${callId}: ${message}`);
    await this.prisma.call
      .update({
        where: { id: callId },
        data: {
          status: CallStatus.TRANSCRIPTION_FAILED,
          transcription_error: message.slice(0, 1000),
        },
      })
      .catch(() => undefined);
  }

  async transcribe(callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { assistant_agent: true },
    });
    if (!call || !call.recording_path) return;
    if (!this.aiService.isConfigured())
      throw new Error('AI is not configured. Set OPENAI_API_KEY on the server.');

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.TRANSCRIBING, transcription_error: null },
    });

    const workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `callzen-${callId}-`),
    );
    try {
      const source = path.join(workDir, 'source');
      await pipeline(
        await this.recordingStorage.open(call.recording_path),
        createWriteStream(source),
      );

      const { chunks, totalSeconds } = await this.splitAudio(source, workDir);
      // Reject recordings longer than the remaining minutes before any transcription cost is incurred (§14).
      const fit = await this.planLimits.uploadFitsRemainingMinutes(
        call.organisation_id,
        call.user_id,
        Math.round(totalSeconds),
      );
      if (!fit.fits) {
        await this.rejectForMinutes(call, Math.round(totalSeconds), fit.available_seconds);
        return;
      }
      const transcriptionModel = this.models.upload_transcription;
      const diarize =
        findAudioModel(transcriptionModel)?.supports_diarization ?? false;
      const language =
        call.language && call.language !== AUTO_LANGUAGE
          ? call.language
          : undefined;
      const results = await this.mapWithConcurrency(
        chunks,
        CHUNK_CONCURRENCY,
        (file, index) =>
          this.transcribeChunk(file, index, language, transcriptionModel, diarize),
      );

      const agent = call.agent_snapshot as unknown as AgentSnapshot | null;
      const lines: TranscriptLineRow[] = [];
      for (const chunk of results) {
        // Diarized output has anonymous labels to map; otherwise the utility model labels each line.
        const roles = diarize
          ? await this.guessRoles(
              call,
              agent,
              chunk.segments,
              call.user_id,
              call.organisation_id,
            )
          : await this.attributeSpeakers(call, agent, chunk);
        const offsetMs = chunk.index * CHUNK_SECONDS * 1000;
        for (const segment of chunk.segments) {
          lines.push({
            speaker: roles.get(segment.speaker) ?? Speaker.UNKNOWN,
            text: segment.text,
            start_ms: segment.start_ms + offsetMs,
            end_ms: segment.end_ms + offsetMs,
          });
        }
      }
      const mergedRaw = this.mergeLines(lines);
      // Optional, user-enabled pass for poor audio; never blocks the upload if it fails.
      const merged = call.clean_transcript
        ? await this.cleanTranscript(call, mergedRaw)
        : mergedRaw;

      const lastEndMs = merged.length ? merged[merged.length - 1].end_ms : 0;
      const durationSeconds = Math.max(
        Math.round(totalSeconds),
        Math.round(lastEndMs / 1000),
      );
      const keepAudio = call.keep_recording;

      if (durationSeconds > 0)
        this.usageService.record({
          organisationId: call.organisation_id,
          userId: call.user_id,
          callId,
          kind: UsageKind.TRANSCRIPTION,
          model: transcriptionModel,
          audio: { inputSeconds: durationSeconds },
        });

      const callEnd = {
        ended_at: new Date(),
        ended_reason: CallEndReason.USER,
        duration_seconds: durationSeconds,
        ...(!keepAudio && {
          recording_path: null,
          recording_mime: null,
          recording_size: null,
        }),
      };

      if (!merged.length) {
        await this.prisma.call.update({
          where: { id: callId },
          data: {
            ...callEnd,
            status: CallStatus.ENDED,
            transcription_error:
              'No speech was detected in this recording, so it cannot be analyzed.',
          },
        });
      } else {
        const contextPatch = await this.extractCallContext(call, merged);
        await this.prisma.$transaction([
          this.prisma.transcriptSegment.deleteMany({
            where: { call_id: callId },
          }),
          this.prisma.transcriptSegment.createMany({
            data: merged.map((line, index) => ({
              call_id: callId,
              client_id: `upload-${index}`,
              ...line,
            })),
          }),
          this.prisma.call.update({
            where: { id: callId },
            data: {
              ...callEnd,
              ...contextPatch,
              status: CallStatus.ANALYZING,
            },
          }),
        ]);
        await this.analysisService.queue(callId);
      }
      await this.credits
        .settleCall(callId)
        .catch((error) =>
          this.logger.error(`Settling minutes for upload ${callId} failed: ${error?.message}`),
        );

      if (!keepAudio)
        await this.recordingStorage
          .remove(call.recording_path)
          .catch(() => undefined);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {
        // Temp cleanup is best-effort.
      });
    }
  }

  private async rejectForMinutes(
    call: { id: string; recording_path: string | null },
    durationSeconds: number,
    availableSeconds: number,
  ) {
    await this.prisma.call.update({
      where: { id: call.id },
      data: {
        status: CallStatus.TRANSCRIPTION_FAILED,
        duration_seconds: durationSeconds,
        ended_at: new Date(),
        transcription_error: `${PlanErrorCodes.PLAN_LIMIT_REACHED}: this recording is ${Math.ceil(durationSeconds / 60)} min long but only ${Math.floor(availableSeconds / 60)} min are left in this period.`,
      },
    });
  }

  // Re-encode to small mono mp3 and cut it into fixed-length pieces: keeps every request well
  // under the API's size and duration limits, whatever the source format or bitrate.
  private splitAudio(
    source: string,
    workDir: string,
  ): Promise<{ chunks: string[]; totalSeconds: number }> {
    return new Promise((resolve, reject) => {
      let totalSeconds = 0;
      ffmpeg(source)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate('32k')
        .format('segment')
        .outputOptions([
          `-segment_time ${CHUNK_SECONDS}`,
          '-reset_timestamps 1',
          '-segment_format mp3',
        ])
        .output(path.join(workDir, 'chunk_%04d.mp3'))
        .on('codecData', (data) => {
          const [h, m, s] = String(data.duration ?? '0:0:0')
            .split(':')
            .map(Number);
          totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
        })
        .on('error', (error) =>
          reject(new Error(`Could not read this audio file: ${error.message}`)),
        )
        .on('end', async () => {
          const files = (await fs.readdir(workDir))
            .filter((name) => name.startsWith('chunk_'))
            .sort()
            .map((name) => path.join(workDir, name));
          if (!files.length)
            return reject(new Error('The audio file contains no audio'));
          resolve({ chunks: files, totalSeconds });
        })
        .run();
    });
  }

  private async transcribeChunk(
    file: string,
    index: number,
    language: string | undefined,
    model: string,
    diarize: boolean,
  ): Promise<ChunkResult> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([await fs.readFile(file)], { type: 'audio/mpeg' }),
      path.basename(file),
    );
    form.append('model', model);
    if (diarize) {
      form.append('response_format', 'diarized_json');
      form.append('chunking_strategy', 'auto');
    } else {
      form.append('response_format', 'verbose_json');
      form.append('timestamp_granularities[]', 'segment');
    }
    if (language) form.append('language', language);

    const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.aiService.getApiKey()}` },
      body: form,
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Transcription request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = (await response.json()) as {
      text?: string;
      duration?: number;
      segments?: {
        speaker?: string;
        text?: string;
        start: number;
        end: number;
      }[];
    };
    // Models without segment timestamps return plain text: keep it as one line spanning the chunk.
    const rawSegments = data.segments?.length
      ? data.segments
      : data.text?.trim()
        ? [{ text: data.text, start: 0, end: data.duration ?? CHUNK_SECONDS }]
        : [];
    const segments = rawSegments
      .filter((segment) => segment.text?.trim())
      .map((segment) => ({
        speaker: String(segment.speaker ?? 'A'),
        text: String(segment.text).trim(),
        start_ms: Math.round(segment.start * 1000),
        end_ms: Math.round(segment.end * 1000),
      }));
    return { index, segments };
  }

  // For transcription models without diarization: the utility model labels every line as seller or prospect.
  // The chunk's segments are relabelled in place (SELLER / PROSPECT); lines it cannot place stay UNKNOWN.
  private async attributeSpeakers(
    call: Parameters<typeof buildCallContext>[0] & {
      user_id: string;
      organisation_id: string;
    },
    agent: AgentSnapshot | null,
    chunk: ChunkResult,
  ): Promise<Map<string, Speaker>> {
    const roles = new Map<string, Speaker>([
      [SELLER_LABEL, Speaker.USER],
      [PROSPECT_LABEL, Speaker.PROSPECT],
    ]);
    if (!chunk.segments.length) return roles;
    try {
      const lines = chunk.segments
        .map((segment, i) => `${i}: ${segment.text}`)
        .join('\n')
        .slice(0, 14000);
      const result = await this.aiService.generateStructured({
        model: this.models.utility,
        schema: z.object({
          lines: z.array(
            z.object({
              index: z.number().int(),
              speaker: z.enum([SELLER_LABEL, PROSPECT_LABEL]),
            }),
          ),
        }),
        schemaName: 'speaker_attribution',
        system:
          'You attribute each numbered line of a sales call transcript to its speaker. SELLER is the salesperson who runs the call, asks discovery questions, presents the product and proposes next steps; PROSPECT is the potential customer. Return every line index you can place with confidence.',
        prompt: `${agent ? `Seller context: ${agent.name}${agent.description ? ` - ${agent.description}` : ''}\n` : ''}${buildCallContext(call)}\n\nLines:\n${lines}`,
        temperature: 0,
        timeoutMs: 60000,
      });
      this.usageService.record({
        organisationId: call.organisation_id,
        userId: call.user_id,
        kind: UsageKind.ANALYSIS,
        model: result.model,
        tokens: result.usage,
      });
      const bySegment = new Map(
        result.output.lines.map((line) => [line.index, line.speaker]),
      );
      chunk.segments.forEach((segment, i) => {
        segment.speaker = bySegment.get(i) ?? `unknown-${i}`;
      });
    } catch (error) {
      this.logger.warn(`Speaker attribution failed: ${error?.message}`);
    }
    return roles;
  }

  // Diarization only gives anonymous labels ("A", "B"); ask a small model which one is the
  // salesperson. Anything it cannot place stays UNKNOWN.
  private async guessRoles(
    call: Parameters<typeof buildCallContext>[0],
    agent: AgentSnapshot | null,
    segments: DiarizedSegment[],
    userId: string,
    organisationId: string,
  ): Promise<Map<string, Speaker>> {
    const labels = [...new Set(segments.map((s) => s.speaker))];
    const roles = new Map<string, Speaker>();
    if (!labels.length) return roles;

    try {
      const transcript = segments
        .map((s) => `Speaker ${s.speaker}: ${s.text}`)
        .join('\n')
        .slice(0, 12000);
      const result = await this.aiService.generateStructured({
        model: this.models.utility,
        schema: z.object({ salesperson: z.string().nullable() }),
        schemaName: 'salesperson_speaker',
        system:
          'You label speakers in a diarized sales call transcript. Decide which speaker is the salesperson (the seller who runs the call, asks discovery questions, presents the product and proposes next steps). The other speakers are prospects. Answer with the speaker label exactly as written (for example "A"), or null if you cannot tell.',
        prompt: `${agent ? `Seller context: ${agent.name}${agent.description ? ` - ${agent.description}` : ''}\n` : ''}${buildCallContext(call)}\nSpeaker labels: ${labels.join(', ')}\n\nTranscript:\n${transcript}`,
        temperature: 0,
        maxTokens: 30,
        timeoutMs: 30000,
      });
      this.usageService.record({
        organisationId,
        userId,
        kind: UsageKind.ANALYSIS,
        model: result.model,
        tokens: result.usage,
      });

      const seller = labels.find((l) => l === result.output.salesperson);
      if (seller)
        labels.forEach((label) =>
          roles.set(label, label === seller ? Speaker.USER : Speaker.PROSPECT),
        );
    } catch (error) {
      this.logger.warn(`Speaker role guess failed: ${error?.message}`);
    }
    return roles;
  }

  // Poor audio makes speech-to-text produce gibberish or hallucinated lines. Let a model fix
  // clear misrecognitions and drop lines that are not intelligible speech. It only returns the
  // lines it changes, so the rest of the transcript is untouched.
  private async cleanTranscript(
    call: {
      id: string;
      user_id: string;
      organisation_id: string;
      language: string | null;
    },
    lines: TranscriptLineRow[],
  ): Promise<TranscriptLineRow[]> {
    if (!lines.length) return lines;
    const BATCH_LINES = 120;
    const BATCH_CHARS = 10000;
    const batches: { start: number; end: number }[] = [];
    let start = 0;
    let chars = 0;
    for (let i = 0; i < lines.length; i++) {
      chars += lines[i].text.length;
      if (i + 1 - start >= BATCH_LINES || chars >= BATCH_CHARS) {
        batches.push({ start, end: i + 1 });
        start = i + 1;
        chars = 0;
      }
    }
    if (start < lines.length) batches.push({ start, end: lines.length });

    const replacements = new Map<number, string | null>();
    try {
      for (const batch of batches) {
        const label = (speaker: Speaker) =>
          speaker === Speaker.USER
            ? 'Seller'
            : speaker === Speaker.PROSPECT
              ? 'Prospect'
              : 'Speaker';
        const numbered = lines
          .slice(batch.start, batch.end)
          .map((l, i) => `${batch.start + i} | ${label(l.speaker)}: ${l.text}`)
          .join('\n');
        const result = await this.aiService.generateStructured({
          model: this.models.analysis,
          schema: z.object({
            edits: z.array(
              z.object({
                index: z.number().int(),
                text: z.string().nullable(),
              }),
            ),
          }),
          schemaName: 'transcript_cleanup',
          system:
            'You clean up an automatic transcript of a sales call recorded with poor audio. Be conservative: the original meaning must be preserved. For each line decide: (1) keep it unchanged, (2) fix it, only when it is clearly a misrecognized word or phrase and the surrounding conversation makes the intended wording obvious, or (3) remove it, only when it is incoherent, unintelligible noise, a repeated hallucinated phrase, or clearly unrelated to the conversation and you cannot confidently tell what was said. Never paraphrase, summarize, translate, add information, or change who said something. Keep the transcript language. Return ONLY the lines you change: {index, text} with the corrected text, or text null to remove the line. Return an empty list if nothing needs changing.',
          prompt: `Language: ${call.language && call.language !== AUTO_LANGUAGE ? call.language : 'auto-detected'}

Transcript lines ("index | speaker: text"):
${numbered}`,
          temperature: 0,
          maxTokens: 6000,
          timeoutMs: 120000,
        });
        this.usageService.record({
          organisationId: call.organisation_id,
          userId: call.user_id,
          callId: call.id,
          kind: UsageKind.ANALYSIS,
          model: result.model,
          tokens: result.usage,
        });
        for (const edit of result.output.edits) {
          if (edit.index < batch.start || edit.index >= batch.end) continue;
          const text = edit.text?.trim();
          replacements.set(edit.index, text ? text : null);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Transcript cleanup failed for ${call.id}, keeping the original: ${error?.message}`,
      );
      return lines;
    }

    const cleaned = lines.flatMap((line, index) => {
      if (!replacements.has(index)) return [line];
      const text = replacements.get(index);
      return text ? [{ ...line, text }] : [];
    });
    // If the model wiped out everything, it is more likely wrong than the audio being empty.
    if (!cleaned.length) return lines;
    this.logger.log(
      `Transcript cleanup for ${call.id}: ${replacements.size} of ${lines.length} lines changed`,
    );
    return this.mergeLines(cleaned);
  }

  // The user may skip the "Call context" form when uploading. Fill only the fields they left
  // empty from what is said in the call; never overwrite anything they typed.
  private async extractCallContext(
    call: {
      id: string;
      user_id: string;
      organisation_id: string;
      prospect_name: string | null;
      prospect_company: string | null;
      prospect_role: string | null;
      context_notes: string | null;
    },
    lines: TranscriptLineRow[],
  ): Promise<ContextPatch> {
    const blank = (value: string | null) => !value?.trim();
    const missing = {
      prospect_name: blank(call.prospect_name),
      prospect_company: blank(call.prospect_company),
      prospect_role: blank(call.prospect_role),
      context_notes: blank(call.context_notes),
    };
    if (!Object.values(missing).some(Boolean)) return {};

    try {
      const label = (speaker: Speaker) =>
        speaker === Speaker.USER
          ? 'Seller'
          : speaker === Speaker.PROSPECT
            ? 'Prospect'
            : 'Speaker';
      const full = lines.map((l) => `${label(l.speaker)}: ${l.text}`).join('\n');
      const transcript =
        full.length > 16000
          ? `${full.slice(0, 12000)}\n[...]\n${full.slice(-4000)}`
          : full;

      const text = z.string().nullable();
      const result = await this.aiService.generateStructured({
        model: this.models.utility,
        schema: z.object({
          prospect_name: text,
          prospect_company: text,
          prospect_role: text,
          context_notes: text,
        }),
        schemaName: 'call_context',
        system:
          'You extract background context from a sales call transcript so the call can be analyzed. Use only facts explicitly stated in the transcript; never guess or invent. Return null for anything not clearly stated. prospect_name: the prospect\'s own name (not the seller\'s). prospect_company: the prospect\'s company. prospect_role: the prospect\'s job title. context_notes: 1-3 short sentences about the prospect\'s situation, needs, pains, timeline or constraints that matter for judging the call. Write the values in the language of the transcript.',
        prompt: `Transcript:\n${transcript}`,
        temperature: 0,
        maxTokens: 400,
        timeoutMs: 45000,
      });
      this.usageService.record({
        organisationId: call.organisation_id,
        userId: call.user_id,
        callId: call.id,
        kind: UsageKind.ANALYSIS,
        model: result.model,
        tokens: result.usage,
      });

      const clean = (value: string | null | undefined, max: number) =>
        value?.trim() ? value.trim().slice(0, max) : undefined;
      const found = {
        prospect_name: clean(result.output.prospect_name, 120),
        prospect_company: clean(result.output.prospect_company, 160),
        prospect_role: clean(result.output.prospect_role, 160),
        context_notes: clean(result.output.context_notes, 1000),
      };

      const patch: ContextPatch = {};
      for (const key of Object.keys(found) as (keyof typeof found)[])
        if (missing[key] && found[key]) patch[key] = found[key];

      return patch;
    } catch (error) {
      this.logger.warn(
        `Call context extraction failed for ${call.id}: ${error?.message}`,
      );
      return {};
    }
  }

  // Join consecutive lines of the same speaker so the transcript reads like a conversation.
  private mergeLines(lines: TranscriptLineRow[]): TranscriptLineRow[] {
    const merged: TranscriptLineRow[] = [];
    for (const line of [...lines].sort((a, b) => a.start_ms - b.start_ms)) {
      const previous = merged[merged.length - 1];
      if (
        previous &&
        previous.speaker === line.speaker &&
        line.start_ms - previous.end_ms <= MERGE_GAP_MS &&
        previous.text.length + line.text.length < 1200
      ) {
        previous.text = `${previous.text} ${line.text}`;
        previous.end_ms = Math.max(previous.end_ms, line.end_ms);
      } else merged.push({ ...line });
    }
    return merged;
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    run: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await run(items[index], index);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(limit, items.length) }, worker),
    );
    return results;
  }
}
