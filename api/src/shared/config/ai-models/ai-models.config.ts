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
  languages: string;
  // Fallback only: the models.dev `reasoning` flag wins when known (ModelPricingService.isReasoning).
  is_reasoning: boolean;
  realtime_suitable: boolean;
  description: string;
}

// Curated allowlist of the text models CallZen supports, with product metadata only. Prices are never
// hardcoded: they come from models.dev (ModelPricingService) or the pricing.model_overrides AppConfig key.

export const AI_MODEL_CATALOG: AiModelCatalogEntry[] = [
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    label: 'GPT-4.1 mini',
    speed: AiModelSpeeds.FAST,
    quality: 4,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'Quick, sharp suggestions at low cost. The best balance for live calls.',
  },
  {
    id: 'gpt-4.1-nano',
    provider: 'openai',
    label: 'GPT-4.1 nano',
    speed: AiModelSpeeds.FASTEST,
    quality: 2,
    languages: 'Major languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'Lowest delay and cost. Suggestions are simpler and more generic.',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o mini',
    speed: AiModelSpeeds.FAST,
    quality: 3,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description: 'Fast and inexpensive. Solid everyday suggestions.',
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    label: 'GPT-4.1',
    speed: AiModelSpeeds.BALANCED,
    quality: 5,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description:
      'High quality reasoning with reliable structure. Great for post-call analysis.',
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    label: 'GPT-4o',
    speed: AiModelSpeeds.BALANCED,
    quality: 4,
    languages: '50+ languages',
    is_reasoning: false,
    realtime_suitable: true,
    description: 'Strong all-rounder with natural phrasing.',
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    label: 'GPT-5 mini',
    speed: AiModelSpeeds.THOROUGH,
    quality: 5,
    languages: '50+ languages',
    is_reasoning: true,
    realtime_suitable: false,
    description:
      'Thinks before answering. Deep analysis, too slow for live suggestions.',
  },
  {
    id: 'gpt-5',
    provider: 'openai',
    label: 'GPT-5',
    speed: AiModelSpeeds.THOROUGH,
    quality: 5,
    languages: '50+ languages',
    is_reasoning: true,
    realtime_suitable: false,
    description:
      'The most thorough analysis available. Slowest and most expensive.',
  },
];

// Fallbacks only. The effective defaults are read from the "ai.default_models" AppConfig key
// (AppConfigService / resolveDefaultModels).
export const RECOMMENDED_REALTIME_MODEL = 'gpt-4.1-mini';
export const RECOMMENDED_ANALYSIS_MODEL = 'gpt-4.1';
export const UTILITY_MODEL = 'gpt-4.1-mini';
export const EMBEDDING_MODEL = 'text-embedding-3-small';

export const findAiModel = (
  id: string | null | undefined,
): AiModelCatalogEntry | undefined =>
  AI_MODEL_CATALOG.find((model) => model.id === id);

export const isKnownAiModel = (id: string | null | undefined): boolean =>
  !!findAiModel(id);

export const AudioModelUses = {
  VOICE: 'voice',
  TRANSCRIPTION: 'transcription',
  UPLOAD_TRANSCRIPTION: 'upload_transcription',
} as const;
export type AudioModelUse = (typeof AudioModelUses)[keyof typeof AudioModelUses];

export interface AudioModelCatalogEntry {
  id: string;
  label: string;
  uses: AudioModelUse[];
  // Upload transcription relies on speaker labels; models without diarization get speakers attributed by
  // the utility model instead.
  supports_diarization: boolean;
  // OpenAI's announced shutdown date, if any (§4.7a).
  shutdown_at: string | null;
}

export const AUDIO_MODEL_CATALOG: AudioModelCatalogEntry[] = [
  {
    id: 'gpt-realtime-2.1',
    label: 'GPT Realtime 2.1',
    uses: [AudioModelUses.VOICE],
    supports_diarization: false,
    shutdown_at: null,
  },
  {
    id: 'gpt-realtime',
    label: 'GPT Realtime',
    uses: [AudioModelUses.VOICE],
    supports_diarization: false,
    shutdown_at: '2027-01-20',
  },
  {
    id: 'gpt-live-transcribe',
    label: 'GPT Live Transcribe',
    uses: [AudioModelUses.TRANSCRIPTION],
    supports_diarization: false,
    shutdown_at: null,
  },
  {
    id: 'gpt-4o-transcribe',
    label: 'GPT-4o Transcribe',
    uses: [AudioModelUses.TRANSCRIPTION, AudioModelUses.UPLOAD_TRANSCRIPTION],
    supports_diarization: false,
    shutdown_at: '2027-02-26',
  },
  {
    id: 'gpt-transcribe',
    label: 'GPT Transcribe',
    uses: [AudioModelUses.UPLOAD_TRANSCRIPTION],
    // Unconfirmed by OpenAI at the time of writing; flip once verified.
    supports_diarization: false,
    shutdown_at: null,
  },
  {
    id: 'gpt-4o-transcribe-diarize',
    label: 'GPT-4o Transcribe Diarize',
    uses: [AudioModelUses.UPLOAD_TRANSCRIPTION],
    supports_diarization: true,
    shutdown_at: '2027-02-26',
  },
];

export const findAudioModel = (id: string | null | undefined) =>
  AUDIO_MODEL_CATALOG.find((model) => model.id === id);

export const isKnownAudioModel = (
  id: string | null | undefined,
  use?: AudioModelUse,
): boolean => {
  const model = findAudioModel(id);
  return !!model && (!use || model.uses.includes(use));
};

// Every model id CallZen may bill for, used by the pricing sync.
export const ALL_PRICED_MODEL_IDS: string[] = [
  ...AI_MODEL_CATALOG.map((model) => model.id),
  ...AUDIO_MODEL_CATALOG.map((model) => model.id),
  EMBEDDING_MODEL,
];
