import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  CALL_ANALYSIS_QUEUE,
  CALL_TRANSCRIPTION_QUEUE,
} from '@/core/queues/queues.constants';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { RecordingStorageModule } from '@/integrations/storage/recordings/recording-storage.module';
import { UsageModule } from '@/modules/usage/usage.module';
import { CallsController } from './calls.controller';
import { CallsService } from './services/calls.service';
import { CopilotService } from './services/copilot.service';
import { CallAnalysisService } from './services/call-analysis.service';
import { PracticeSessionService } from './services/practice-session.service';
import { CallTranscriptionService } from './services/call-transcription.service';
import { CallAnalysisProcessor } from './processors/call-analysis.processor';
import { CallTranscriptionProcessor } from './processors/call-transcription.processor';

@Module({
  imports: [
    PrismaModule,
    AiIntegrationModule,
    RecordingStorageModule,
    UsageModule,
    BullModule.registerQueue(
      { name: CALL_ANALYSIS_QUEUE },
      { name: CALL_TRANSCRIPTION_QUEUE },
    ),
  ],
  controllers: [CallsController],
  providers: [
    CallsService,
    CopilotService,
    CallAnalysisService,
    CallTranscriptionService,
    CallAnalysisProcessor,
    CallTranscriptionProcessor,
    PracticeSessionService,
  ],
  exports: [CallsService],
})
export class CallsModule {}
