import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { RecordingStorageModule } from '@/integrations/storage/recordings/recording-storage.module';
import { UsageModule } from '@/modules/usage/usage.module';
import { CallsController } from './calls.controller';
import { CallsService } from './services/calls.service';
import { CopilotService } from './services/copilot.service';
import { CallAnalysisService } from './services/call-analysis.service';
import { PracticeSessionService } from './services/practice-session.service';

@Module({
  imports: [
    PrismaModule,
    AiIntegrationModule,
    RecordingStorageModule,
    UsageModule,
  ],
  controllers: [CallsController],
  providers: [
    CallsService,
    CopilotService,
    CallAnalysisService,
    PracticeSessionService,
  ],
  exports: [CallsService],
})
export class CallsModule {}
