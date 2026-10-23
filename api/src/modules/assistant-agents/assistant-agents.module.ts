import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AssistantAgentsController } from './assistant-agents.controller';
import { AssistantAgentsService } from './assistant-agents.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantAgentsController],
  providers: [AssistantAgentsService],
  exports: [AssistantAgentsService],
})
export class AssistantAgentsModule {}
