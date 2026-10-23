import { Injectable } from '@nestjs/common';
import { CreateAiDto } from './dto/create-ai.dto';
import { AiService } from '@/integrations/ai/services/ai.service';
import { UTILITY_MODEL } from '@/shared/config/ai-models/ai-models.config';

@Injectable()
export class InternalAiService {
  constructor(private readonly aiService: AiService) {}

  create(createAiDto: CreateAiDto) {
    return this.aiService.generatePlainText({
      model: createAiDto.model || UTILITY_MODEL,
      system: createAiDto.system || 'You are a helpful assistant.',
      prompt: createAiDto.prompt,
      temperature: createAiDto.temperature,
      maxTokens: createAiDto.maxTokens,
    });
  }
}
