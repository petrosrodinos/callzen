export const AiModelSpeeds = {
  FASTEST: 'FASTEST',
  FAST: 'FAST',
  BALANCED: 'BALANCED',
  THOROUGH: 'THOROUGH',
} as const;

export type AiModelSpeed = (typeof AiModelSpeeds)[keyof typeof AiModelSpeeds];

export interface AiModelCatalogEntry {
  id: string;
  provider: 'openai';
  label: string;
  speed: AiModelSpeed;
  quality: 1 | 2 | 3 | 4 | 5;
  relative_cost: 1 | 2 | 3 | 4;
  languages: string;
  is_reasoning: boolean;
  realtime_suitable: boolean;
  description: string;
  // USD per 1M tokens
  input_per_million: number;
  output_per_million: number;
}

export const AI_MODEL_CATALOG: AiModelCatalogEntry[] = [
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    label: 'GPT-4.1 mini',
    speed: AiModelSpeeds.FAST,
    quality: 4,
    relative_cost: 1,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'Quick, sharp suggestions at low cost. The best balance for live calls.',
    input_per_million: 0.4,
    output_per_million: 1.6,
  },
  {
    id: 'gpt-4.1-nano',
    provider: 'openai',
    label: 'GPT-4.1 nano',
    speed: AiModelSpeeds.FASTEST,
    quality: 2,
    relative_cost: 1,
    languages: 'Major languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'Lowest delay and cost. Suggestions are simpler and more generic.',
    input_per_million: 0.1,
    output_per_million: 0.4,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o mini',
    speed: AiModelSpeeds.FAST,
    quality: 3,
    relative_cost: 1,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description: 'Fast and inexpensive. Solid everyday suggestions.',
    input_per_million: 0.15,
    output_per_million: 0.6,
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    label: 'GPT-4.1',
    speed: AiModelSpeeds.BALANCED,
    quality: 5,
    relative_cost: 3,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'High quality reasoning with reliable structure. Great for post-call analysis.',
    input_per_million: 2,
    output_per_million: 8,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    label: 'GPT-4o',
    speed: AiModelSpeeds.BALANCED,
    quality: 4,
    relative_cost: 3,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description: 'Strong all-rounder with natural phrasing.',
    input_per_million: 2.5,
    output_per_million: 10,
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    label: 'GPT-5 mini',
    speed: AiModelSpeeds.THOROUGH,
    quality: 5,
    relative_cost: 2,
    languages: '50+ languages',
    is_reasoning: true,
    realtime_suitable: false,
    description:
      'Thinks before answering. Deep analysis, too slow for live suggestions.',
    input_per_million: 0.25,
    output_per_million: 2,
  },
  {
    id: 'gpt-5',
    provider: 'openai',
    label: 'GPT-5',
    speed: AiModelSpeeds.THOROUGH,
    quality: 5,
    relative_cost: 4,
    languages: '50+ languages',
    is_reasoning: true,
    realtime_suitable: false,
    description:
      'The most thorough analysis available. Slowest and most expensive.',
    input_per_million: 1.25,
    output_per_million: 10,
  },
];

export const RECOMMENDED_REALTIME_MODEL = 'gpt-4.1-mini';
export const RECOMMENDED_ANALYSIS_MODEL = 'gpt-4.1';
export const UTILITY_MODEL = 'gpt-4.1-mini';

export const findAiModel = (
  id: string | null | undefined,
): AiModelCatalogEntry | undefined =>
  AI_MODEL_CATALOG.find((model) => model.id === id);

export const isKnownAiModel = (id: string | null | undefined): boolean =>
  !!findAiModel(id);

export const estimateTokenCost = (
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number => {
  const model = findAiModel(modelId);
  if (!model) return 0;
  return (
    (inputTokens * model.input_per_million +
      outputTokens * model.output_per_million) /
    1_000_000
  );
};
