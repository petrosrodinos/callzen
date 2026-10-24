import { z } from "zod";
import i18n from "@/i18n";
import { LeadTemperatures } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import { VoiceProviders } from "@/features/catalog/interfaces/catalog.interfaces";

const textItem = z.object({
  value: z
    .string()
    .trim()
    .min(1, i18n.t("practice:validation.cantBeEmpty"))
    .max(500),
});

export const practiceAgentSchema = z.object({
  name: z.string().trim().min(1, i18n.t("practice:validation.nameScenario")).max(120),
  prospect_name: z.string().max(120),
  role_prompt: z
    .string()
    .trim()
    .min(3, i18n.t("practice:validation.describeProspect"))
    .max(4000),
  scenario_context: z.string().max(2000),
  scenario_type: z.string().min(1),
  selling_product: z.string().max(2000),
  linked_assistant_agent_id: z.string(),
  user_objective: z.string().max(300),
  lead_temperature: z.enum([LeadTemperatures.COLD, LeadTemperatures.WARM]),
  difficulty: z.number().int().min(1).max(5),
  personality: z.string(),
  mood: z.string(),
  communication_style: z.string().max(300),
  decision_authority: z.string(),
  budget: z.string(),
  timeline: z.string(),
  current_solution: z.string().max(1000),
  pain_points: z.array(textItem).max(20),
  objections: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, i18n.t("practice:validation.cantBeEmpty"))
          .max(500),
        persistence: z.number().int().min(1).max(3),
      }),
    )
    .max(20),
  hidden_information: z.array(textItem).max(20),
  conversion_conditions: z.array(textItem).max(20),
  patience: z.number().int().min(1).max(5),
  languages: z
    .array(z.string().min(2))
    .min(1, i18n.t("practice:validation.pickLanguage"))
    .max(5, i18n.t("practice:validation.maxLanguages")),
  accent: z.string().max(80),
  industry: z.string().max(120),
  company: z.string().max(120),
  job_title: z.string().max(120),
  age_range: z.string().max(40),
  background_story: z.string().max(4000),
  briefing: z.string().max(2000),
  voice_provider: z.enum([
    VoiceProviders.OPENAI_REALTIME,
    VoiceProviders.BROWSER,
  ]),
  voice: z.string().max(120),
  time_limit_minutes: z.number().int().min(1).max(60).nullable(),
});

export type PracticeAgentFormValues = z.infer<typeof practiceAgentSchema>;

export const generateFromDescriptionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(5, i18n.t("practice:validation.describeInSentence"))
    .max(2000),
});

export type GenerateFromDescriptionFormValues = z.infer<
  typeof generateFromDescriptionSchema
>;
