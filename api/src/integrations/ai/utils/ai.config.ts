import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { AiProvider, AiProviders } from '../interfaces/ai.interface';

@Injectable()
export class AiConfig {
  private openaiProvider: OpenAIProvider | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return !!this.configService.get<string>('OPENAI_API_KEY');
  }

  getApiKey(): string | undefined {
    return this.configService.get<string>('OPENAI_API_KEY');
  }

  private getOpenAi(): OpenAIProvider {
    if (!this.openaiProvider) {
      this.openaiProvider = createOpenAI({ apiKey: this.getApiKey() });
    }
    return this.openaiProvider;
  }

  getEmbeddingModel(model: string) {
    return this.getOpenAi().embedding(model);
  }

  getModelAdapter(provider: AiProvider = AiProviders.openai, model: string) {
    switch (provider) {
      case AiProviders.openai:
        return this.getOpenAi()(model);
      default:
        throw new Error(`AI provider ${provider} is not supported`);
    }
  }
}
