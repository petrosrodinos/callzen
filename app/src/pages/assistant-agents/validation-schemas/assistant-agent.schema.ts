import { z } from "zod";
import i18n from "@/i18n";
import { formatNumber } from "@/lib/format";
import {
  SuggestionFrequencies,
  SuggestionLengths,
} from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const assistantAgentSchema = z.object({
  name: z.string().trim().min(1, i18n.t("assistant:validation.name")).max(120),
  description: z.string().max(1000),
  call_goal: z.string().max(300),
  script: z.array(
    z.object({
      id: z.string(),
      stage: z.string().min(1),
      title: z.string().max(120),
      content: z
        .string()
        .trim()
        .min(1, i18n.t("assistant:validation.stageContent"))
        .max(4000),
    }),
  ),
  instructions: z.string().max(5000),
  knowledge: z.string().max(60000, i18n.t("assistant:validation.knowledgeMax", { max: formatNumber(60000) })),
  objection_library: z.array(
    z.object({
      id: z.string(),
      objection: z.string().trim().min(1, i18n.t("assistant:validation.objection")).max(500),
      response: z
        .string()
        .trim()
        .min(1, i18n.t("assistant:validation.response"))
        .max(2000),
    }),
  ),
  methodology: z.string(),
  languages: z
    .array(z.string().min(2))
    .min(1, i18n.t("assistant:validation.languagesMin"))
    .max(5, i18n.t("assistant:validation.languagesMax", { max: 5 })),
  tone: z.string(),
  suggestion_frequency: z.enum([
    SuggestionFrequencies.OBJECTIONS_ONLY,
    SuggestionFrequencies.BALANCED,
    SuggestionFrequencies.CONSTANT,
  ]),
  suggestion_length: z.enum([
    SuggestionLengths.SHORT,
    SuggestionLengths.MEDIUM,
  ]),
  alternatives_count: z.number().int().min(0).max(2),
  realtime_model: z.string().min(1),
  analysis_model: z.string().min(1),
  analysis_criteria: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().trim().min(1, i18n.t("assistant:validation.categoryName")).max(120),
        weight: z.number().min(0).max(5),
        description: z.string().max(500).optional(),
      }),
    )
    .min(1, i18n.t("assistant:validation.categoryMin")),
  consent_line: z.string().max(1000),
  suggest_consent_line: z.boolean(),
  is_default: z.boolean(),
});

export type AssistantAgentFormValues = z.infer<typeof assistantAgentSchema>;
