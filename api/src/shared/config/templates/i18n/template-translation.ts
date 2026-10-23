import {
  ASSISTANT_AGENT_TEMPLATES,
  AssistantAgentTemplate,
} from '../assistant-agent-templates.config';
import {
  PRACTICE_AGENT_TEMPLATES,
  PracticeAgentTemplate,
} from '../practice-agent-templates.config';
import {
  DEFAULT_ANALYSIS_CRITERIA,
  DEFAULT_CONSENT_LINE,
} from '../analysis-criteria.config';

export type AssistantTemplateTexts = {
  name: string;
  description: string;
  call_goal: string;
  instructions: string;
  knowledge: string;
  script: { title: string; content: string }[];
  objection_library: { objection: string; response: string }[];
};

export type PracticeTemplateTexts = Pick<
  PracticeAgentTemplate,
  | 'name'
  | 'description'
  | 'prospect_name'
  | 'role_prompt'
  | 'scenario_context'
  | 'selling_product'
  | 'user_objective'
  | 'communication_style'
  | 'current_solution'
  | 'pain_points'
  | 'hidden_information'
  | 'conversion_conditions'
  | 'accent'
  | 'industry'
  | 'company'
  | 'job_title'
  | 'background_story'
  | 'briefing'
> & { objections: { text: string }[] };

export interface TemplateTranslation {
  assistant: Record<string, AssistantTemplateTexts>;
  practice: Record<string, PracticeTemplateTexts>;
  criteria: Record<string, string>;
  consent_line: string;
}

const PRACTICE_TEXT_KEYS = [
  'name',
  'description',
  'prospect_name',
  'role_prompt',
  'scenario_context',
  'selling_product',
  'user_objective',
  'communication_style',
  'current_solution',
  'pain_points',
  'hidden_information',
  'conversion_conditions',
  'accent',
  'industry',
  'company',
  'job_title',
  'background_story',
  'briefing',
] as const;

// The English source texts, in the same shape as a translation file. The translate script feeds these to the model.
export const extractSourceTexts = (): TemplateTranslation => ({
  assistant: Object.fromEntries(
    ASSISTANT_AGENT_TEMPLATES.map((t) => [
      t.key,
      {
        name: t.name,
        description: t.description,
        call_goal: t.call_goal,
        instructions: t.instructions,
        knowledge: t.knowledge,
        script: t.script.map((s) => ({ title: s.title, content: s.content })),
        objection_library: t.objection_library.map((o) => ({
          objection: o.objection,
          response: o.response,
        })),
      },
    ]),
  ),
  practice: Object.fromEntries(
    PRACTICE_AGENT_TEMPLATES.map((t) => [
      t.key,
      {
        ...Object.fromEntries(PRACTICE_TEXT_KEYS.map((k) => [k, t[k]])),
        objections: t.objections.map((o) => ({ text: o.text })),
      } as PracticeTemplateTexts,
    ]),
  ),
  criteria: Object.fromEntries(
    DEFAULT_ANALYSIS_CRITERIA.map((c) => [c.key, c.label]),
  ),
  consent_line: DEFAULT_CONSENT_LINE,
});

export const localizeAssistantTemplate = (
  template: AssistantAgentTemplate,
  tr: TemplateTranslation | undefined,
): AssistantAgentTemplate => {
  const texts = tr?.assistant[template.key];
  if (!texts) return template;
  return {
    ...template,
    name: texts.name ?? template.name,
    description: texts.description ?? template.description,
    call_goal: texts.call_goal ?? template.call_goal,
    instructions: texts.instructions ?? template.instructions,
    knowledge: texts.knowledge ?? template.knowledge,
    script: template.script.map((s, i) => ({ ...s, ...texts.script?.[i] })),
    objection_library: template.objection_library.map((o, i) => ({
      ...o,
      ...texts.objection_library?.[i],
    })),
    analysis_criteria: localizeCriteria(template.analysis_criteria, tr),
  };
};

export const localizePracticeTemplate = (
  template: PracticeAgentTemplate,
  languageCode: string,
  tr: TemplateTranslation | undefined,
): PracticeAgentTemplate => {
  const texts = tr?.practice[template.key];
  if (!texts) return template;
  const { objections, ...rest } = texts;
  return {
    ...template,
    ...rest,
    language: languageCode,
    objections: template.objections.map((o, i) => ({
      ...o,
      text: objections?.[i]?.text ?? o.text,
    })),
  };
};

export const localizeCriteria = <T extends { key: string; label: string }>(
  criteria: T[],
  tr: TemplateTranslation | undefined,
): T[] =>
  criteria.map((c) => ({ ...c, label: tr?.criteria[c.key] ?? c.label }));
