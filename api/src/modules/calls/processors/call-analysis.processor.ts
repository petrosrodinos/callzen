import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CALL_ANALYSIS_QUEUE } from '@/core/queues/queues.constants';
import {
  ANALYSIS_JOB_ATTEMPTS,
  AnalysisJobData,
  CallAnalysisService,
} from '../services/call-analysis.service';

@Processor(CALL_ANALYSIS_QUEUE, { concurrency: 3 })
export class CallAnalysisProcessor extends WorkerHost {
  constructor(private readonly analysisService: CallAnalysisService) {
    super();
  }

  async process(job: Job<AnalysisJobData>) {
    const { callId, ...options } = job.data;
    await this.analysisService.analyze(callId, options);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<AnalysisJobData> | undefined, error: Error) {
    if (!job) return;
    const attempts = job.opts.attempts ?? ANALYSIS_JOB_ATTEMPTS;
    if (job.attemptsMade >= attempts)
      await this.analysisService.markFailed(job.data.callId, error);
  }
}
