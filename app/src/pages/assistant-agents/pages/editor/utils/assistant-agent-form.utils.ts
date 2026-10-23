import type {
  AssistantAgent,
  CreateAssistantAgentDto,
} from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import type {
  AssistantAgentTemplate,
  Catalog,
} from "@/features/catalog/interfaces/catalog.interfaces";
import type { AssistantAgentFormValues } from "../../../validation-schemas/assistant-agent.schema";

export const toFormValues = (
  source: AssistantAgent | AssistantAgentTemplate | null,
  catalog: Catalog,
): AssistantAgentFormValues => {
  const agent = source && "id" in source ? source : null;
  return {
    name: source?.name ?? "",
    description: source?.description ?? "",
    call_goal: source?.call_goal ?? "",
    script: source?.script ?? [],
    instructions: source?.instructions ?? "",
    knowledge: source?.knowledge ?? "",
    objection_library: source?.objection_library ?? [],
    methodology: source?.methodology ?? "CUSTOM",
    languages: agent?.languages?.length
      ? agent.languages
      : [agent?.language ?? catalog.template_language ?? "en"],
    tone: source?.tone ?? "PROFESSIONAL",
    suggestion_frequency: source?.suggestion_frequency ?? "BALANCED",
    suggestion_length: agent?.suggestion_length ?? "SHORT",
    alternatives_count: agent?.alternatives_count ?? 1,
    realtime_model: agent?.realtime_model ?? catalog.recommended_realtime_model,
    analysis_model: agent?.analysis_model ?? catalog.recommended_analysis_model,
    analysis_criteria: source?.analysis_criteria?.length
      ? source.analysis_criteria
      : catalog.default_analysis_criteria,
    consent_line: agent?.consent_line ?? "",
    suggest_consent_line: agent?.suggest_consent_line ?? false,
    is_default: agent?.is_default ?? false,
  };
};

export const toPayload = (
  values: AssistantAgentFormValues,
): CreateAssistantAgentDto => ({
  ...values,
  language: values.languages[0],
  name: values.name.trim(),
  consent_line: values.consent_line || undefined,
  analysis_criteria: values.analysis_criteria.map((criterion) => ({
    ...criterion,
    description: criterion.description || undefined,
  })),
});

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50) || `criterion_${Date.now()}`;
