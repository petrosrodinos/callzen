import { z } from 'zod';
import {
  AppConfigCategories,
  defineConfig,
} from './app-config.types';

const usdPerMillion = z.number().min(0).max(100_000);

export const ModelPriceOverrideSchema = z
  .object({
    // USD per 1M tokens.
    input: usdPerMillion.optional(),
    output: usdPerMillion.optional(),
    cache_read: usdPerMillion.optional(),
    input_audio: usdPerMillion.optional(),
    output_audio: usdPerMillion.optional(),
    // USD per audio minute, for models billed by duration.
    per_minute: z.number().min(0).max(100).optional(),
  })
  .strict();
export type ModelPriceOverride = z.infer<typeof ModelPriceOverrideSchema>;

export const PRICING_KEYS = {
  'pricing.markup_percent': defineConfig({
    schema: z.number().min(0).max(1000),
    default: 0,
    category: AppConfigCategories.PRICING,
    description:
      'Markup applied on top of provider cost for every new usage event (charged = base × (1 + markup / 100)).',
    public: false,
  }),
  'pricing.model_overrides': defineConfig({
    schema: z.record(z.string().min(1).max(200), ModelPriceOverrideSchema),
    // Unverified third-party quotes (§4.7a): confirm on OpenAI's pricing page and correct here if needed.
    default: {
      'gpt-live-transcribe': { per_minute: 0.017 },
      'gpt-transcribe': { per_minute: 0.0045 },
      // models.dev only lists these through a gateway alias whose audio-token price converts to ~$0.0015/min,
      // 4× below OpenAI's per-minute price; the override wins over the alias (§4.4).
      'gpt-4o-transcribe': { per_minute: 0.006 },
      'gpt-4o-transcribe-diarize': { per_minute: 0.006 },
    } as Record<string, ModelPriceOverride>,
    category: AppConfigCategories.PRICING,
    description:
      'Manual prices for models models.dev does not price. Wins over alias resolution, not over a direct models.dev price.',
    public: false,
  }),
  'pricing.audio_tokens_per_minute': defineConfig({
    schema: z.object({
      input: z.number().min(0).max(100_000),
      output: z.number().min(0).max(100_000),
    }),
    // OpenAI realtime cost guide: user audio 1 token / 100 ms, assistant audio 1 token / 50 ms.
    default: { input: 600, output: 1200 },
    category: AppConfigCategories.PRICING,
    description:
      'Audio tokens per minute used to convert audio durations to token costs.',
    public: false,
  }),
  'pricing.sync': defineConfig({
    schema: z.object({
      enabled: z.boolean(),
      interval_hours: z.number().int().min(1).max(24 * 30),
      providers: z.array(z.string().min(1)).min(1),
      // Secondary providers that list OpenAI models as "openai/<id>", tried in order for aliases.
      alias_providers: z.array(z.string().min(1)),
    }),
    default: {
      enabled: true,
      interval_hours: 12,
      providers: ['openai'],
      alias_providers: ['vercel'],
    },
    category: AppConfigCategories.PRICING,
    description: 'models.dev price sync schedule and providers.',
    public: false,
  }),
};
