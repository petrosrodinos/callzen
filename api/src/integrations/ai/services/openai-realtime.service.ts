import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { AiConfig } from '../utils/ai.config';

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime';

export interface RealtimeClientSecret {
  client_secret: string;
  expires_at: number;
  model: string;
  webrtc_url: string;
}

export interface RealtimeVoiceSessionOptions {
  model: string;
  voice: string;
  instructions: string;
  language?: string;
  transcriptionModel: string;
  tools?: Record<string, unknown>[];
}

export interface RealtimeTranscriptionSessionOptions {
  model: string;
  transcriptionModel: string;
  language?: string;
  prompt?: string;
}

@Injectable()
export class OpenAiRealtimeService {
  private readonly logger = new Logger(OpenAiRealtimeService.name);

  constructor(private readonly aiConfig: AiConfig) {}

  // Speech-to-speech session used by AI practice prospects.
  createVoiceSession(
    options: RealtimeVoiceSessionOptions,
  ): Promise<RealtimeClientSecret> {
    return this.createClientSecret(options.model, {
      type: 'realtime',
      model: options.model,
      instructions: options.instructions,
      output_modalities: ['audio'],
      audio: {
        input: {
          noise_reduction: { type: 'near_field' },
          transcription: {
            model: options.transcriptionModel,
            ...(options.language ? { language: options.language } : {}),
          },
          turn_detection: {
            type: 'semantic_vad',
            eagerness: 'auto',
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice: options.voice },
      },
      tools: options.tools ?? [],
      tool_choice: 'auto',
    });
  }

  // Listen-only session: the model never answers, it only transcribes the incoming audio.
  createTranscriptionSession(
    options: RealtimeTranscriptionSessionOptions,
  ): Promise<RealtimeClientSecret> {
    return this.createClientSecret(options.model, {
      type: 'realtime',
      model: options.model,
      output_modalities: ['text'],
      instructions: 'You are a silent transcriber. Never respond.',
      audio: {
        input: {
          noise_reduction: { type: 'near_field' },
          transcription: {
            model: options.transcriptionModel,
            ...(options.language ? { language: options.language } : {}),
            ...(options.prompt ? { prompt: options.prompt } : {}),
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 450,
            create_response: false,
            interrupt_response: false,
          },
        },
      },
    });
  }

  private async createClientSecret(
    model: string,
    session: Record<string, unknown>,
  ): Promise<RealtimeClientSecret> {
    const apiKey = this.aiConfig.getApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        message:
          'Realtime voice is not configured. Set OPENAI_API_KEY on the server.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    try {
      const response = await axios.post(
        `${OPENAI_REALTIME_URL}/client_secrets`,
        { expires_after: { anchor: 'created_at', seconds: 600 }, session },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      return {
        client_secret: response.data?.value,
        expires_at: response.data?.expires_at,
        model,
        webrtc_url: `${OPENAI_REALTIME_URL}/calls`,
      };
    } catch (error) {
      const detail = error?.response?.data?.error?.message ?? error?.message;
      this.logger.error(`Failed to create realtime session: ${detail}`);
      throw new BadGatewayException({
        message: `Could not start the realtime voice session: ${detail}`,
        code: 'REALTIME_SESSION_FAILED',
      });
    }
  }
}
