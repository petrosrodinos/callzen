import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GcsConfig } from '../gcs/config/gcs.config';
import { RecordingStorageService } from './recording-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [GcsConfig, RecordingStorageService],
  exports: [RecordingStorageService],
})
export class RecordingStorageModule {}
