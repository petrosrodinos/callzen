import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { MODEL_PRICING_SYNC_QUEUE } from '@/core/queues/queues.constants';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ModelPricingService } from '../services/model-pricing.service';

const SCHEDULER_ID = 'model-pricing-sync';

@Processor(MODEL_PRICING_SYNC_QUEUE, { concurrency: 1 })
export class ModelPricingSyncProcessor extends WorkerHost {
  constructor(private readonly pricing: ModelPricingService) {
    super();
  }

  async process(_job: Job) {
    await this.pricing.sync();
  }
}

// Keeps the repeatable job in line with pricing.sync (interval and on/off), including after admin edits.
@Injectable()
export class ModelPricingSyncScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ModelPricingSyncScheduler.name);
  private unsubscribe: (() => void) | null = null;

  constructor(
    @InjectQueue(MODEL_PRICING_SYNC_QUEUE) private readonly queue: Queue,
    private readonly appConfig: AppConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.apply();
    this.unsubscribe = this.appConfig.onChange((key) => {
      if (key === 'pricing.sync') void this.apply();
    });
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  private async apply() {
    const config = this.appConfig.get('pricing.sync');
    try {
      if (!config.enabled) {
        await this.queue.removeJobScheduler(SCHEDULER_ID);
        return;
      }
      await this.queue.upsertJobScheduler(
        SCHEDULER_ID,
        { every: config.interval_hours * 60 * 60 * 1000 },
        {
          name: 'sync',
          opts: { removeOnComplete: true, removeOnFail: 50, attempts: 2 },
        },
      );
    } catch (error) {
      this.logger.warn(`Could not schedule pricing sync: ${error?.message}`);
    }
  }
}
