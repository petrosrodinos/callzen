import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { embed, generateObject, generateText } from 'ai';
import { z } from 'zod';
import { AiConfig } from '../utils/ai.config';
import {
  AiGenerateBaseOptions,
  AiGenerateResult,
  AiGenerateStructuredOptions,
  AiProviders,
} from '../interfaces/ai.interface';
import {
  estimateTokenCost,
  findAiModel,
} from '@/shared/config/ai-models/ai-models.config';

const MODEL_UNAVAILABLE_PATTERN =
  /model.*(not.*(found|exist|access)|does not exist|unsupported)|no such model|model_not_found|404/i;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly aiConfig: AiConfig) {}

  isConfigured(): boolean {
    return this.aiConfig.isConfigured();
  }

  getApiKey(): string | undefined {
    return this.aiConfig.getApiKey();
  }

  async generateStructured<T extends z.ZodType>(
    options: AiGenerateStructuredOptions<T>,
  ): Promise<AiGenerateResult<z.infer<T>>> {
    this.assertConfigured();

    return this.withModelFallback(options, async (model) => {
      const result = await generateObject({
        model: this.aiConfig.getModelAdapter(AiProviders.openai, model),
        schema: options.schema as any,
        schemaName: options.schemaName,
        system: options.system,
        prompt: options.prompt,
        temperature: this.temperatureFor(model, options.temperature),
        maxOutputTokens: options.maxTokens,
        providerOptions: this.providerOptionsFor(model),
        abortSignal: options.timeoutMs
          ? AbortSignal.timeout(options.timeoutMs)
          : undefined,
        maxRetries: 1,
      });

      return {
        output: result.object as z.infer<T>,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };
    });
  }

  async generatePlainText(
    options: AiGenerateBaseOptions,
  ): Promise<AiGenerateResult<string>> {
    this.assertConfigured();

    return this.withModelFallback(options, async (model) => {
      const result = await generateText({
        model: this.aiConfig.getModelAdapter(AiProviders.openai, model),
        system: options.system,
        prompt: options.prompt,
        temperature: this.temperatureFor(model, options.temperature),
        maxOutputTokens: options.maxTokens,
        providerOptions: this.providerOptionsFor(model),
        abortSignal: options.timeoutMs
          ? AbortSignal.timeout(options.timeoutMs)
          : undefined,
        maxRetries: 1,
      });

      return {
        output: result.text,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };
    });
  }

  async embedText(text: string): Promise<number[]> {
    this.assertConfigured();
    const { embedding } = await embed({
      model: this.aiConfig.getEmbeddingModel('text-embedding-3-small'),
      value: text,
    });
    return embedding;
  }

  private async withModelFallback<T>(
    options: AiGenerateBaseOptions,
    run: (
      model: string,
    ) => Promise<{ output: T; inputTokens: number; outputTokens: number }>,
  ): Promise<AiGenerateResult<T>> {
    const startedAt = Date.now();
    const requestedModel = findAiModel(options.model)
      ? options.model
      : (options.fallbackModel ?? options.model);
    let fallbackUsed = requestedModel !== options.model;

    try {
      const result = await run(requestedModel);
      return this.toResult(result, requestedModel, fallbackUsed, startedAt);
    } catch (error) {
      const canFallback =
        options.fallbackModel &&
        options.fallbackModel !== requestedModel &&
        MODEL_UNAVAILABLE_PATTERN.test(String(error?.message ?? ''));

      if (!canFallback) {
        this.logger.error(
          `AI call failed on ${requestedModel}: ${error?.message}`,
        );
        throw error;
      }

      this.logger.warn(
        `Model ${requestedModel} unavailable, falling back to ${options.fallbackModel}`,
      );
      fallbackUsed = true;
      const result = await run(options.fallbackModel);
      return this.toResult(
        result,
        options.fallbackModel,
        fallbackUsed,
        startedAt,
      );
    }
  }

  private toResult<T>(
    result: { output: T; inputTokens: number; outputTokens: number },
    model: string,
    fallbackUsed: boolean,
    startedAt: number,
  ): AiGenerateResult<T> {
    return {
      output: result.output,
      model,
      fallbackUsed,
      latencyMs: Date.now() - startedAt,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: estimateTokenCost(
          model,
          result.inputTokens,
          result.outputTokens,
        ),
      },
    };
  }

  private temperatureFor(
    model: string,
    temperature?: number,
  ): number | undefined {
    // Reasoning models reject custom temperatures.
    return findAiModel(model)?.is_reasoning ? undefined : temperature;
  }

  private providerOptionsFor(model: string) {
    if (findAiModel(model)?.is_reasoning) {
      return { openai: { reasoningEffort: 'low' } };
    }
    return undefined;
  }

  private assertConfigured() {
    if (!this.aiConfig.isConfigured()) {
      throw new ServiceUnavailableException({
        message: 'AI is not configured. Set OPENAI_API_KEY on the server.',
        code: 'AI_NOT_CONFIGURED',
      });
    }
  }
}
