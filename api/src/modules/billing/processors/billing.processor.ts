import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { BILLING_QUEUE } from '@/core/queues/queues.constants';
import { BillingMaintenanceService } from '../services/billing-maintenance.service';

export const BillingJobs = {
  MAINTENANCE: 'billing-maintenance',
  RECONCILE: 'billing-reconcile',
} as const;

@Processor(BILLING_QUEUE, { concurrency: 1 })
export class BillingProcessor extends WorkerHost {
  constructor(private readonly maintenance: BillingMaintenanceService) {
    super();
  }

  async process(job: Job) {
    if (job.name === BillingJobs.MAINTENANCE) return this.maintenance.runDaily();
    if (job.name === BillingJobs.RECONCILE) return this.maintenance.reconcile();
  }
}

@Injectable()
export class BillingJobsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(BillingJobsScheduler.name);

  constructor(@InjectQueue(BILLING_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap() {
    const opts = { removeOnComplete: true, removeOnFail: 50, attempts: 2 };
    try {
      // Daily at 06:00 UTC; reconcile nightly at 03:30 UTC.
      await this.queue.upsertJobScheduler(
        BillingJobs.MAINTENANCE,
        { pattern: '0 6 * * *', tz: 'UTC' },
        { name: BillingJobs.MAINTENANCE, opts },
      );
      await this.queue.upsertJobScheduler(
        BillingJobs.RECONCILE,
        { pattern: '30 3 * * *', tz: 'UTC' },
        { name: BillingJobs.RECONCILE, opts },
      );
    } catch (error) {
      this.logger.warn(`Could not schedule billing jobs: ${error?.message}`);
    }
  }
}
