import { z } from 'zod';

export const AiProviders = {
  openai: 'openai',
} as const;

export type AiProvider = (typeof AiProviders)[keyof typeof AiProviders];

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
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
