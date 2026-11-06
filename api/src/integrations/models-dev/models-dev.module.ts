import { Module } from '@nestjs/common';
import { ModelsDevService } from './services/models-dev.service';

@Module({
  providers: [ModelsDevService],
  exports: [ModelsDevService],
})
export class ModelsDevModule {}
