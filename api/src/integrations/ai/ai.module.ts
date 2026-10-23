import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './services/ai.service';
import { AiConfig } from './utils/ai.config';
import { OpenAiRealtimeService } from './services/openai-realtime.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, AiConfig, OpenAiRealtimeService],
  exports: [AiService, OpenAiRealtimeService],
})
export class AiIntegrationModule {}
