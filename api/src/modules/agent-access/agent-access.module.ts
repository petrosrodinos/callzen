import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AgentAccessService } from './agent-access.service';
import { AgentAccessController } from './agent-access.controller';

// Global: co-pilot, prospect, call, dashboard and coaching services all apply the same access rules.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AgentAccessController],
  providers: [AgentAccessService],
  exports: [AgentAccessService],
})
export class AgentAccessModule {}
