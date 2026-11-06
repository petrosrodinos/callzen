import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { COACHING_QUEUE } from '@/core/queues/queues.constants';
import { AssignmentsService } from '../services/assignments.service';
import { CoachReportsService } from '../services/coach-reports.service';

const SCHEDULER_ID = 'coaching-hourly';

// Hourly tick: assignment due-soon reminders, and the weekly coach report when its configured hour comes.
@Processor(COACHING_QUEUE, { concurrency: 1 })
export class CoachingProcessor extends WorkerHost {
  private readonly logger = new Logger(CoachingProcessor.name);

  constructor(
    private readonly assignments: AssignmentsService,
    private readonly reports: CoachReportsService,
  ) {
    super();
  }

  async process(job: Job) {
    const now = job.timestamp ? new Date(job.timestamp) : new Date();
    const reminded = await this.assignments.sendDueSoonReminders();
    const reportsCreated = await this.reports.runIfDue(now);
    if (reminded || reportsCreated)
      this.logger.log(
        `Coaching tick: ${reminded} due-soon assignment(s), ${reportsCreated} report(s)`,
      );
  }
}

@Injectable()
export class CoachingScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CoachingScheduler.name);

  constructor(@InjectQueue(COACHING_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap() {
    try {
      await this.queue.upsertJobScheduler(
        SCHEDULER_ID,
        // Once an hour (at :05 UTC), so the weekly report hour is matched exactly once.
        { pattern: '5 * * * *' },
        { name: 'tick', opts: { removeOnComplete: true, removeOnFail: 50 } },
      );
    } catch (error) {
      this.logger.warn(`Could not schedule coaching jobs: ${error?.message}`);
    }
  }
}
