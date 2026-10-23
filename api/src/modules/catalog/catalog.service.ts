import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
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
import {
  MAX_CONVERSATION_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
} from '@/shared/config/languages/languages.config';
import { getTemplateTranslation } from '@/shared/config/templates/i18n';
import {
  localizeAssistantTemplate,
  localizeCriteria,
  localizePracticeTemplate,
} from '@/shared/config/templates/i18n/template-translation';

@Injectable()
export class CatalogService {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async get(userId: string, requestedLanguage?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_language: true },
    });
    const language = SUPPORTED_LANGUAGE_CODES.includes(requestedLanguage)
      ? requestedLanguage
      : (user?.preferred_language ?? 'en');
    const translation = getTemplateTranslation(language);

    return {
      ai_configured: this.aiService.isConfigured(),
      ai_models: AI_MODEL_CATALOG,
      recommended_realtime_model: RECOMMENDED_REALTIME_MODEL,
      recommended_analysis_model: RECOMMENDED_ANALYSIS_MODEL,
      voice_providers: VOICE_PROVIDER_CATALOG,
      assistant_templates: ASSISTANT_AGENT_TEMPLATES.map((t) =>
        localizeAssistantTemplate(t, translation),
      ),
      practice_templates: PRACTICE_AGENT_TEMPLATES.map((t) =>
        localizePracticeTemplate(t, language, translation),
      ),
      default_analysis_criteria: localizeCriteria(
        DEFAULT_ANALYSIS_CRITERIA,
        translation,
      ),
      default_consent_line: translation?.consent_line ?? DEFAULT_CONSENT_LINE,
      template_language: language,
      languages: SUPPORTED_LANGUAGES,
      max_conversation_languages: MAX_CONVERSATION_LANGUAGES,
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
