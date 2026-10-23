import { Module } from '@nestjs/common';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [AiIntegrationModule, PrismaModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
