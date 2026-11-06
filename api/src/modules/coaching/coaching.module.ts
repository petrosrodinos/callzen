import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { COACHING_QUEUE } from '@/core/queues/queues.constants';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { CohortController } from './controllers/cohort.controller';
import {
  AssignmentsController,
  MyAssignmentsController,
} from './controllers/assignments.controller';
import { CommentsController } from './controllers/comments.controller';
import {
  CoachingExportController,
  ReportsController,
} from './controllers/reports.controller';
import { CoachingMembersService } from './services/coaching-members.service';
import { CoachingStatsService } from './services/coaching-stats.service';
import { CohortService } from './services/cohort.service';
import { StudentsService } from './services/students.service';
import { AssignmentsService } from './services/assignments.service';
import { CommentsService } from './services/comments.service';
import { CoachReportsService } from './services/coach-reports.service';
import { CoachingExportService } from './services/coaching-export.service';
import { CoachingProcessor, CoachingScheduler } from './processors/coaching.processor';

// Coach tools (§10.1a–g). Global because calls (assignment start and completion) and invitations (members
// joining "everyone" assignments) call AssignmentsService.
@Global()
@Module({
  imports: [
    PrismaModule,
    DashboardModule,
    BullModule.registerQueue({ name: COACHING_QUEUE }),
  ],
  controllers: [
    CohortController,
    AssignmentsController,
    MyAssignmentsController,
    CommentsController,
    ReportsController,
    CoachingExportController,
  ],
  providers: [
    CoachingMembersService,
    CoachingStatsService,
    CohortService,
    StudentsService,
    AssignmentsService,
    CommentsService,
    CoachReportsService,
    CoachingExportService,
    CoachingProcessor,
    CoachingScheduler,
  ],
  exports: [AssignmentsService],
})
export class CoachingModule {}
