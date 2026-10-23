import type {
  CreatePracticeAgentDto,
  PracticeAgent,
} from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import type { PracticeAgentFormValues } from "../validation-schemas/practice-agent.schema";

const toItems = (values: string[] | undefined | null) =>
  (values ?? []).map((value) => ({ value }));

export const toPracticeFormValues = (
  source: Partial<PracticeAgent> | null | undefined,
): PracticeAgentFormValues => ({
  name: source?.name ?? "",
  prospect_name: source?.prospect_name ?? "",
  role_prompt: source?.role_prompt ?? "",
  scenario_context: source?.scenario_context ?? "",
  scenario_type: source?.scenario_type ?? "COLD_CALL",
  selling_product: source?.selling_product ?? "",
  linked_assistant_agent_id: source?.linked_assistant_agent_id ?? "",
  user_objective: source?.user_objective ?? "",
  lead_temperature: source?.lead_temperature ?? "COLD",
  difficulty: source?.difficulty ?? 3,
  personality: source?.personality ?? "",
  mood: source?.mood ?? "",
  communication_style: source?.communication_style ?? "",
  decision_authority: source?.decision_authority ?? "",
  budget: source?.budget ?? "",
  timeline: source?.timeline ?? "",
  current_solution: source?.current_solution ?? "",
  pain_points: toItems(source?.pain_points),
  objections: (source?.objections ?? []).map((o) => ({
    text: o.text,
    persistence: o.persistence,
  })),
  hidden_information: toItems(source?.hidden_information),
  conversion_conditions: toItems(source?.conversion_conditions),
  patience: source?.patience ?? 3,
  languages: source?.languages?.length
    ? source.languages
    : [source?.language ?? "en"],
  accent: source?.accent ?? "",
  industry: source?.industry ?? "",
  company: source?.company ?? "",
  job_title: source?.job_title ?? "",
  age_range: source?.age_range ?? "",
  background_story: source?.background_story ?? "",
  briefing: source?.briefing ?? "",
  voice_provider: source?.voice_provider ?? "OPENAI_REALTIME",
  voice: source?.voice ?? "marin",
  time_limit_minutes: source?.time_limit_minutes ?? null,
});

const orUndefined = (value: string) =>
  value.trim() ? value.trim() : undefined;

export const toPracticePayload = (
  values: PracticeAgentFormValues,
): CreatePracticeAgentDto => ({
  name: values.name.trim(),
  prospect_name: orUndefined(values.prospect_name),
  role_prompt: values.role_prompt.trim(),
  scenario_context: orUndefined(values.scenario_context),
  scenario_type: values.scenario_type,
  selling_product: orUndefined(values.selling_product),
  linked_assistant_agent_id: values.linked_assistant_agent_id || null,
  user_objective: orUndefined(values.user_objective),
  lead_temperature: values.lead_temperature,
  difficulty: values.difficulty,
  personality: values.personality || undefined,
  mood: values.mood || undefined,
  communication_style: orUndefined(values.communication_style),
  decision_authority: values.decision_authority || undefined,
  budget: values.budget || undefined,
  timeline: values.timeline || undefined,
  current_solution: orUndefined(values.current_solution),
  pain_points: values.pain_points.map((item) => item.value),
  objections: values.objections,
  hidden_information: values.hidden_information.map((item) => item.value),
  conversion_conditions: values.conversion_conditions.map((item) => item.value),
  patience: values.patience,
  language: values.languages[0],
  languages: values.languages,
  accent: orUndefined(values.accent),
  industry: orUndefined(values.industry),
  company: orUndefined(values.company),
  job_title: orUndefined(values.job_title),
  age_range: orUndefined(values.age_range),
  background_story: orUndefined(values.background_story),
  briefing: orUndefined(values.briefing),
  voice_provider: values.voice_provider,
  voice: values.voice,
  time_limit_minutes: values.time_limit_minutes,
});
