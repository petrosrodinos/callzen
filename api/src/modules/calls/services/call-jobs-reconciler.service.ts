import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CallStatus, CallType } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CallAnalysisService } from './call-analysis.service';
import { CallTranscriptionService } from './call-transcription.service';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
// A call is only touched once it has sat in a state much longer than a healthy job would.
// Queueing uses jobId = callId, so re-queueing a call whose job still exists is a no-op.
const QUEUED_STALE_MS = 3 * 60 * 1000;
const TRANSCRIBING_STALE_MS = 90 * 60 * 1000;
const ANALYZING_STALE_MS = 20 * 60 * 1000;

// Jobs live in Redis, but the call row and the job are written separately: if the API dies or
// Redis is unreachable between the two, a call is left in QUEUED/TRANSCRIBING/ANALYZING with no
// job behind it. This sweep finds those calls and queues them again.
@Injectable()
export class CallJobsReconcilerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(CallJobsReconcilerService.name);
  private timer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptionService: CallTranscriptionService,
    private readonly analysisService: CallAnalysisService,
  ) {}

  onApplicationBootstrap() {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const now = Date.now();
      const before = (ms: number) => new Date(now - ms);

      const stuckTranscriptions = await this.prisma.call.findMany({
        where: {
          call_type: CallType.UPLOAD,
          OR: [
            {
              status: CallStatus.QUEUED,
              updated_at: { lt: before(QUEUED_STALE_MS) },
            },
            {
              status: CallStatus.TRANSCRIBING,
              updated_at: { lt: before(TRANSCRIBING_STALE_MS) },
            },
          ],
        },
        select: { id: true, status: true, recording_path: true },
      });
      for (const call of stuckTranscriptions) {
        if (!call.recording_path) {
          // The upload itself never finished, so there is nothing to transcribe.
          await this.prisma.call.update({
            where: { id: call.id },
            data: {
              status: CallStatus.TRANSCRIPTION_FAILED,
              transcription_error:
                'The upload did not finish, so the audio was never saved. Please upload the recording again.',
            },
          });
          continue;
        }
        this.logger.warn(`Re-queueing stuck transcription for call ${call.id}`);
        await this.transcriptionService.enqueue(call.id);
      }

      const stuckAnalyses = await this.prisma.call.findMany({
        where: {
          status: CallStatus.ANALYZING,
          updated_at: { lt: before(ANALYZING_STALE_MS) },
        },
        select: { id: true },
      });
      for (const call of stuckAnalyses) {
        this.logger.warn(`Re-queueing stuck analysis for call ${call.id}`);
        await this.analysisService.queue(call.id);
      }
    } catch (error) {
      this.logger.warn(`Job reconciliation failed: ${error?.message}`);
    } finally {
      this.sweeping = false;
    }
  }
}
