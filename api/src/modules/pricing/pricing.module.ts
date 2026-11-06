import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { MODEL_PRICING_SYNC_QUEUE } from '@/core/queues/queues.constants';
import { ModelsDevModule } from '@/integrations/models-dev/models-dev.module';
import { ModelPricingService } from './services/model-pricing.service';
import { PricingAdminService } from './services/pricing-admin.service';
import { PricingAdminController } from './pricing-admin.controller';
import {
  ModelPricingSyncProcessor,
  ModelPricingSyncScheduler,
} from './processors/model-pricing-sync.processor';

// Global: AiService, UsageService and the call services all price usage through ModelPricingService.
@Global()
@Module({
  imports: [
    PrismaModule,
    ModelsDevModule,
    BullModule.registerQueue({ name: MODEL_PRICING_SYNC_QUEUE }),
  ],
  controllers: [PricingAdminController],
  providers: [
    ModelPricingService,
    PricingAdminService,
    ModelPricingSyncProcessor,
    ModelPricingSyncScheduler,
  ],
  exports: [ModelPricingService],
})
export class PricingModule {}
