import { Module } from '@nestjs/common';
import { AiIntegrationModule } from '@/integrations/ai/ai.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [AiIntegrationModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
