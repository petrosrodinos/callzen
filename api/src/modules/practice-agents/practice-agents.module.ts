import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { UsageModule } from '@/modules/usage/usage.module';
import { PracticeAgentsController } from './practice-agents.controller';
import { PracticeAgentsService } from './practice-agents.service';

@Module({
  imports: [PrismaModule, AiIntegrationModule, UsageModule],
  controllers: [PracticeAgentsController],
  providers: [PracticeAgentsService],
  exports: [PracticeAgentsService],
})
export class PracticeAgentsModule {}
