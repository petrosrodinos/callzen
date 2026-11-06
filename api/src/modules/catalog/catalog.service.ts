import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from '@/integrations/ai/services/ai.service';
import { VoiceProvider } from 'generated/prisma';
import {
  AI_MODEL_CATALOG,
  AUDIO_MODEL_CATALOG,
} from '@/shared/config/ai-models/ai-models.config';
import { VOICE_PROVIDER_CATALOG } from '@/shared/config/voices/voice-providers.config';
import { isPlatformAdminRole } from '@/shared/interfaces/org-context.interface';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ModelPricingService } from '@/modules/pricing/services/model-pricing.service';
import { UnitPrices } from '@/modules/pricing/interfaces/pricing.interface';
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
    private readonly appConfig: AppConfigService,
    private readonly pricing: ModelPricingService,
  ) {}

  // Model choice, prices and browser voice are internal: only platform admins get them (§6.3, §6.4).
  async get(userId: string, requestedLanguage?: string, role?: string) {
    const admin = isPlatformAdminRole(role);
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
      ...(admin ? this.adminModelCatalog() : {}),
      voice_providers: admin
        ? VOICE_PROVIDER_CATALOG
        : VOICE_PROVIDER_CATALOG.filter(
            (provider) => provider.id === VoiceProvider.OPENAI_REALTIME,
          ),
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
        ...(admin
          ? [
              {
                name: 'Your browser',
                purpose:
                  'Browser voice provider: speech recognition and synthesis may be processed by your browser vendor',
                region: 'Depends on browser',
              },
            ]
          : []),
      ],
    };
  }

  private adminModelCatalog() {
    const defaults = this.appConfig.get('ai.default_models');
    return {
      ai_models: AI_MODEL_CATALOG.map((model) => {
        const price = this.pricing.resolvePrice(model.id);
        return {
          ...model,
          is_reasoning: this.pricing.isReasoning(model.id),
          relative_cost: relativeCost(price.unit_prices),
          prices: price.unit_prices,
          pricing_source: price.source,
        };
      }),
      audio_models: AUDIO_MODEL_CATALOG.map((model) => {
        const price = this.pricing.resolvePrice(model.id);
        return {
          ...model,
          prices: price.unit_prices,
          pricing_source: price.source,
          // Cost of one minute each way (input audio and output audio), for comparison.
          estimated_cost_per_minute_usd: this.pricing.estimateAudioCost({
            model: model.id,
            inputSeconds: 60,
            outputSeconds: model.uses.includes('voice') ? 60 : 0,
          }).baseCostUsd,
        };
      }),
      recommended_realtime_model: defaults.realtime,
      recommended_analysis_model: defaults.analysis,
      default_models: defaults,
    };
  }
}

// 1 (cheapest) to 4, from input + output USD per 1M tokens. Replaces the old hardcoded relative_cost.
const relativeCost = (prices: UnitPrices): 1 | 2 | 3 | 4 | null => {
  if (prices.input == null || prices.output == null) return null;
  const blended = prices.input + prices.output;
  if (blended < 2.1) return 1;
  if (blended < 5) return 2;
  if (blended < 11) return 3;
  return 4;
};
