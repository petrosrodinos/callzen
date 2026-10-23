import { Injectable } from '@nestjs/common';
import { AiService } from '@/integrations/ai/services/ai.service';
import {
  AI_MODEL_CATALOG,
  RECOMMENDED_ANALYSIS_MODEL,
  RECOMMENDED_REALTIME_MODEL,
} from '@/shared/config/ai-models/ai-models.config';
import { VOICE_PROVIDER_CATALOG } from '@/shared/config/voices/voice-providers.config';
import { ASSISTANT_AGENT_TEMPLATES } from '@/shared/config/templates/assistant-agent-templates.config';
import { PRACTICE_AGENT_TEMPLATES } from '@/shared/config/templates/practice-agent-templates.config';
import {
  DEFAULT_ANALYSIS_CRITERIA,
  DEFAULT_CONSENT_LINE,
} from '@/shared/config/templates/analysis-criteria.config';
import { SUPPORTED_LANGUAGES } from '@/shared/config/languages/languages.config';

@Injectable()
export class CatalogService {
  constructor(private readonly aiService: AiService) {}

  get() {
    return {
      ai_configured: this.aiService.isConfigured(),
      ai_models: AI_MODEL_CATALOG,
      recommended_realtime_model: RECOMMENDED_REALTIME_MODEL,
      recommended_analysis_model: RECOMMENDED_ANALYSIS_MODEL,
      voice_providers: VOICE_PROVIDER_CATALOG,
      assistant_templates: ASSISTANT_AGENT_TEMPLATES,
      practice_templates: PRACTICE_AGENT_TEMPLATES,
      default_analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
      default_consent_line: DEFAULT_CONSENT_LINE,
      languages: SUPPORTED_LANGUAGES,
      data_processors: [
        {
          name: 'OpenAI',
          purpose:
            'Real-time suggestions, call analysis, transcription and AI prospect voices',
          region: 'United States',
        },
        {
          name: 'Your browser',
          purpose:
            'Browser voice provider: speech recognition and synthesis may be processed by your browser vendor',
          region: 'Depends on browser',
        },
      ],
    };
  }
}
