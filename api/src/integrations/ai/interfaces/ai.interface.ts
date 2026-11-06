import { z } from 'zod';

export const AiProviders = {
  openai: 'openai',
} as const;

export type AiProvider = (typeof AiProviders)[keyof typeof AiProviders];

// Raw token counts. Costs are computed when the usage is recorded (UsageService), from models.dev prices.
export interface AiUsage {
  inputTokens: number;
  cachedInputTokens: number;
  // Already included in outputTokens (AI SDK 7 / OpenAI).
  outputTokens: number;
  reasoningTokens: number;
}

export interface AiGenerateBaseOptions {
  model: string;
  fallbackModel?: string;
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AiGenerateStructuredOptions<
  T extends z.ZodType,
> extends AiGenerateBaseOptions {
  schema: T;
  schemaName?: string;
}

export interface AiGenerateResult<T> {
  output: T;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  usage: AiUsage;
}
