import { VoiceProvider } from 'generated/prisma';

export interface VoiceOption {
  id: string;
  label: string;
  gender: 'female' | 'male' | 'neutral';
  style: string;
}

export interface VoiceProviderCatalogEntry {
  id: VoiceProvider;
  label: string;
  recommended: boolean;
  realism: 1 | 2 | 3 | 4 | 5;
  latency: string;
  cost_per_minute_usd: number;
  languages: string;
  supports_interruptions: boolean;
  description: string;
  voices: VoiceOption[];
}

export const REALTIME_VOICE_MODEL = 'gpt-realtime';
export const REALTIME_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';
// Approximate blended prices used for usage estimates only.
export const TRANSCRIPTION_COST_PER_MINUTE_USD = 0.006;

export const VOICE_PROVIDER_CATALOG: VoiceProviderCatalogEntry[] = [
  {
    id: VoiceProvider.OPENAI_REALTIME,
    label: 'OpenAI Realtime',
    recommended: true,
    realism: 5,
    latency: 'Very low (≈0.5s)',
    cost_per_minute_usd: 0.15,
    languages: '50+ languages, natural accents',
    supports_interruptions: true,
    description:
      'Speech-to-speech AI. Sounds like a real person, reacts instantly and can be interrupted mid-sentence.',
    voices: [
      {
        id: 'marin',
        label: 'Marin',
        gender: 'female',
        style: 'Warm, natural, conversational',
      },
      {
        id: 'cedar',
        label: 'Cedar',
        gender: 'male',
        style: 'Calm, grounded, natural',
      },
      {
        id: 'alloy',
        label: 'Alloy',
        gender: 'neutral',
        style: 'Neutral and balanced',
      },
      {
        id: 'ash',
        label: 'Ash',
        gender: 'male',
        style: 'Direct, slightly gravelly',
      },
      {
        id: 'ballad',
        label: 'Ballad',
        gender: 'male',
        style: 'Expressive, British-leaning',
      },
      {
        id: 'coral',
        label: 'Coral',
        gender: 'female',
        style: 'Bright and friendly',
      },
      { id: 'echo', label: 'Echo', gender: 'male', style: 'Clear, mid-range' },
      {
        id: 'sage',
        label: 'Sage',
        gender: 'female',
        style: 'Composed, thoughtful',
      },
      {
        id: 'shimmer',
        label: 'Shimmer',
        gender: 'female',
        style: 'Soft, energetic',
      },
      {
        id: 'verse',
        label: 'Verse',
        gender: 'male',
        style: 'Dynamic, animated',
      },
    ],
  },
  {
    id: VoiceProvider.BROWSER,
    label: 'Browser voice (free)',
    recommended: false,
    realism: 2,
    latency: 'Moderate (≈1.5–3s)',
    cost_per_minute_usd: 0.01,
    languages: 'Depends on your browser and OS voices',
    supports_interruptions: false,
    description:
      'Uses your browser’s built-in speech recognition and voices with a text AI. Robotic, but nearly free. Works best in Chrome.',
    voices: [],
  },
];

export const findVoiceProvider = (id: VoiceProvider) =>
  VOICE_PROVIDER_CATALOG.find((p) => p.id === id);
