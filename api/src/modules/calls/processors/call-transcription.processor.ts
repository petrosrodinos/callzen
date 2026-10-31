import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CALL_TRANSCRIPTION_QUEUE } from '@/core/queues/queues.constants';
import {
  CallTranscriptionService,
  TRANSCRIPTION_JOB_ATTEMPTS,
  TranscriptionJobData,
} from '../services/call-transcription.service';

@Processor(CALL_TRANSCRIPTION_QUEUE, { concurrency: 2 })
export class CallTranscriptionProcessor extends WorkerHost {
  constructor(private readonly transcriptionService: CallTranscriptionService) {
    super();
  }

  async process(job: Job<TranscriptionJobData>) {
    await this.transcriptionService.transcribe(job.data.callId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TranscriptionJobData> | undefined, error: Error) {
    if (!job) return;
    const attempts = job.opts.attempts ?? TRANSCRIPTION_JOB_ATTEMPTS;
    if (job.attemptsMade >= attempts)
      await this.transcriptionService.markFailed(job.data.callId, error);
  }
}
