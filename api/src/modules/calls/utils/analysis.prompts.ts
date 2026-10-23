import { z } from 'zod';
import {
  AgentSnapshot,
  PracticeSnapshot,
} from '../interfaces/call-snapshots.interface';
import { AnalysisCriterion } from '@/shared/config/templates/analysis-criteria.config';
import { buildAgentBrief } from './copilot.prompts';

const ref = () =>
  z
    .number()
    .int()
    .nullable()
    .describe('The #n reference of the transcript line, or null');

const baseAnalysisSchema = z.object({
  verdict: z
    .string()
    .describe('One or two sentence summary verdict of the performance'),
  category_scores: z.array(
    z.object({
      key: z.string(),
      score: z.number().int().min(0).max(100),
      comment: z.string().describe('One sentence justification'),
    }),
  ),
  mistakes: z.array(
    z.object({
      title: z.string(),
      category_key: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      ref: ref(),
      what_happened: z.string(),
      why_it_matters: z.string(),
      what_to_do_instead: z
        .string()
        .describe('Concrete words to say or action to take instead'),
    }),
  ),
  strengths: z.array(
    z.object({
      title: z.string(),
      category_key: z.string(),
      ref: ref(),
      detail: z.string(),
    }),
  ),
  improvements: z
    .array(z.object({ title: z.string(), tip: z.string() }))
    .describe(
      'Top 3 prioritized things to focus on next time, most important first',
    ),
  objections: z.array(
    z.object({
      ref: ref(),
      objection: z.string(),
      handled: z.boolean(),
      comment: z.string(),
    }),
  ),
  buying_signals: z.array(
    z.object({ ref: ref(), signal: z.string(), acted_on: z.boolean() }),
  ),
  prospect_insights: z.object({
    summary: z.string(),
    needs: z.array(z.string()),
    pain_points: z.array(z.string()),
    objections: z.array(z.string()),
    interest_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    buying_signals: z.array(z.string()),
    budget: z.string().describe('What was revealed, or "Not discussed"'),
    timeline: z.string(),
    decision_makers: z.string(),
    competitors: z.string(),
  }),
  summary: z.string().describe('Concise summary of the conversation'),
  next_steps: z
    .array(z.string())
    .describe('Agreed next steps and suggested follow-up actions'),
  follow_up_draft: z
    .string()
    .describe(
      'A short follow-up email the salesperson can send, or empty if not appropriate',
    ),
  suggested_practice: z
    .array(
      z.object({
        title: z.string().describe('e.g. "Busy Clinic Owner – Hard – Cold"'),
        focus: z.string().describe('The weakness this practice targets'),
        scenario_description: z
          .string()
          .describe(
            'One-sentence prospect description to generate the practice agent',
          ),
        lead_temperature: z.enum(['COLD', 'WARM']),
        difficulty: z.number().int().min(1).max(5),
      }),
    )
    .describe('1-2 practice scenarios targeting the main weaknesses'),
});

const practiceResultSchema = z.object({
  objective_achieved: z.boolean(),
  objective_explanation: z.string(),
  prospect_thinking: z
    .string()
    .describe('What the prospect was thinking during the call, first person'),
  reveal: z.array(
    z.object({
      kind: z.enum([
        'PAIN_POINT',
        'HIDDEN_INFO',
        'OBJECTION',
        'CONVERSION_CONDITION',
      ]),
      item: z.string(),
      uncovered: z.boolean().describe('For conditions: whether it was met'),
      comment: z.string(),
    }),
  ),
  what_would_change_outcome: z.string(),
  lost_attention_ref: ref().describe(
    'Where the salesperson lost the prospect attention, if they did',
  ),
});

const suggestionUsageSchema = z.object({
  items: z.array(
    z.object({
      suggestion_ref: z
        .number()
        .int()
        .describe('The S# reference of the suggestion'),
      usage: z.enum(['FOLLOWED', 'ADAPTED', 'IGNORED']),
      helpful: z.boolean(),
      comment: z.string(),
    }),
  ),
  effect_on_outcome: z.string(),
  copilot_improvements: z
    .array(z.string())
    .describe(
      'Concrete improvements to the co-pilot script, objection library or instructions',
    ),
});

export const buildAnalysisSchema = (
  includePractice: boolean,
  includeSuggestions: boolean,
) =>
  baseAnalysisSchema.extend({
    ...(includePractice ? { practice_result: practiceResultSchema } : {}),
    ...(includeSuggestions ? { suggestion_usage: suggestionUsageSchema } : {}),
  });

export type CallAnalysisOutput = z.infer<typeof baseAnalysisSchema> & {
  practice_result?: z.infer<typeof practiceResultSchema>;
  suggestion_usage?: z.infer<typeof suggestionUsageSchema>;
};

export interface AnalysisPromptInput {
  kind: 'LIVE' | 'PRACTICE';
  agent: AgentSnapshot | null;
  persona: PracticeSnapshot | null;
  criteria: AnalysisCriterion[];
  callContext: string;
  transcript: string;
  suggestions: string;
  bookmarks: string;
  metrics: string;
  outcome: string;
  outputLanguage: string;
}

export const buildAnalysisSystem = (
  input: AnalysisPromptInput,
): string => `You are an elite sales coach reviewing a recorded ${input.kind === 'PRACTICE' ? 'practice call against an AI prospect' : 'real sales call'}. Give objective, specific, actionable feedback that helps the salesperson improve measurably.

SCORING CATEGORIES (score each 0-100, use exactly these keys):
${input.criteria.map((c) => `- ${c.key}: ${c.label}${c.description ? ` – ${c.description}` : ''}`).join('\n')}

RULES:
- Be honest and calibrated: 50 = average, 70 = good, 85+ = excellent. Do not inflate.
- Every mistake and strength must point to the exact transcript line with its #n reference when possible.
- For each mistake: what happened, why it matters, and exactly what to say or do instead.
- Typical mistakes: interrupting, missing a buying signal, giving up after the first objection, talking over the prospect, pitching before discovery, not confirming next steps, talking too much.
- Improvements: top 3 only, prioritized.
- If the transcript is very short or one-sided, still score what you can and say so in the verdict.
- Write all text in ${input.outputLanguage}.`;

export const buildAnalysisPrompt = (
  input: AnalysisPromptInput,
): string => `CALL CONTEXT:
${input.callContext}
Outcome recorded by the salesperson: ${input.outcome}

${input.agent ? buildAgentBrief(input.agent) : 'No co-pilot agent was used.'}

${
  input.persona
    ? `PRACTICE PROSPECT CONFIGURATION (hidden from the salesperson during the call):
Objective for the salesperson: ${input.persona.user_objective ?? 'n/a'}
Pain points: ${input.persona.pain_points.join(' | ') || 'none'}
Hidden information: ${input.persona.hidden_information.join(' | ') || 'none'}
Objections: ${input.persona.objections.map((o) => o.text).join(' | ') || 'none'}
Conversion conditions: ${input.persona.conversion_conditions.join(' | ') || 'none'}
Difficulty ${input.persona.difficulty}/5, patience ${input.persona.patience}/5, lead ${input.persona.lead_temperature}.
In practice_result.reveal, list EVERY pain point, hidden information item, objection and conversion condition above and state whether the salesperson uncovered/met it.`
    : ''
}

MEASURED CONVERSATION METRICS:
${input.metrics}

CO-PILOT SUGGESTIONS SHOWN DURING THE CALL (S# reference, time, type, text):
${input.suggestions || 'none'}

BOOKMARKS MADE BY THE SALESPERSON:
${input.bookmarks || 'none'}

TRANSCRIPT:
${input.transcript}`;
