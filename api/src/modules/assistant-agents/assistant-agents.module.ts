import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { UsageModule } from '@/modules/usage/usage.module';
import { AssistantAgentsController } from './assistant-agents.controller';
import { AssistantAgentsService } from './assistant-agents.service';

@Module({
  imports: [PrismaModule, AiIntegrationModule, UsageModule],
  controllers: [AssistantAgentsController],
  providers: [AssistantAgentsService],
  exports: [AssistantAgentsService],
})
export class AssistantAgentsModule {}
