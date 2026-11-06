import { z } from 'zod';
import { AppConfigCategories, defineConfig } from './app-config.types';
import {
  AudioModelUses,
  isKnownAiModel,
  isKnownAudioModel,
  RECOMMENDED_ANALYSIS_MODEL,
  RECOMMENDED_REALTIME_MODEL,
  UTILITY_MODEL,
} from '@/shared/config/ai-models/ai-models.config';
import {
  REALTIME_TRANSCRIPTION_MODEL,
  REALTIME_VOICE_MODEL,
  UPLOAD_TRANSCRIPTION_MODEL,
} from '@/shared/config/voices/voice-providers.config';

const textModel = z
  .string()
  .refine(isKnownAiModel, 'Not a model in the curated catalog');

export const DefaultModelsSchema = z.object({
  realtime: textModel,
  analysis: textModel,
  utility: textModel,
  voice: z
    .string()
    .refine(
      (id) => isKnownAudioModel(id, AudioModelUses.VOICE),
      'Not a realtime voice model',
    ),
  transcription: z
    .string()
    .refine(
      (id) => isKnownAudioModel(id, AudioModelUses.TRANSCRIPTION),
      'Not a live transcription model',
    ),
  upload_transcription: z
    .string()
    .refine(
      (id) => isKnownAudioModel(id, AudioModelUses.UPLOAD_TRANSCRIPTION),
      'Not an upload transcription model',
    ),
});
export type DefaultModels = z.infer<typeof DefaultModelsSchema>;

export const AI_KEYS = {
  'ai.default_models': defineConfig({
    schema: DefaultModelsSchema,
    default: {
      realtime: RECOMMENDED_REALTIME_MODEL,
      analysis: RECOMMENDED_ANALYSIS_MODEL,
      utility: UTILITY_MODEL,
      voice: REALTIME_VOICE_MODEL,
      transcription: REALTIME_TRANSCRIPTION_MODEL,
      upload_transcription: UPLOAD_TRANSCRIPTION_MODEL,
    } as DefaultModels,
    category: AppConfigCategories.AI,
    description:
      'Models used when a co-pilot has none set, plus the voice and transcription models. Users never pick models.',
    public: false,
  }),
};
