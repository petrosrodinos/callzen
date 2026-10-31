import { z } from 'zod';
import { SuggestionFrequency } from 'generated/prisma';
import { SUPPORTED_LANGUAGE_CODES } from '@/shared/config/languages/languages.config';

export const GENERATED_SCRIPT_STAGES = [
  'OPENER',
  'PITCH',
  'DISCOVERY',
  'OBJECTION_HANDLING',
  'CLOSE',
  'OTHER',
] as const;

export const GENERATED_METHODOLOGIES = [
  'SPIN',
  'BANT',
  'MEDDIC',
  'CHALLENGER',
  'SANDLER',
  'CUSTOM',
] as const;

export const GENERATED_TONES = [
  'PROFESSIONAL',
  'FRIENDLY',
  'CONSULTATIVE',
  'ASSERTIVE',
] as const;

export const GeneratedAssistantAgentSchema = z.object({
  name: z
    .string()
    .describe('Short co-pilot name, e.g. "Cold Call – Dental Clinics"'),
  description: z
    .string()
    .describe('One or two sentences: what is sold and to whom'),
  call_goal: z
    .string()
    .describe('The single concrete outcome of the call, e.g. "Book a demo"'),
  language: z
    .enum(SUPPORTED_LANGUAGE_CODES as [string, ...string[]])
    .describe(
      'Language the salesperson speaks on the call (ISO 639-1). Use the language of the description unless it says otherwise',
    ),
  methodology: z.enum(GENERATED_METHODOLOGIES),
  tone: z.enum(GENERATED_TONES),
  suggestion_frequency: z.enum([
    SuggestionFrequency.OBJECTIONS_ONLY,
    SuggestionFrequency.BALANCED,
    SuggestionFrequency.CONSTANT,
  ]),
  instructions: z
    .string()
    .describe(
      'Rules for the live suggestion engine: length, what to avoid, what to always do. 2-5 short sentences',
    ),
  knowledge: z
    .string()
    .describe(
      'Product and market notes the co-pilot can quote: value props, typical customer, pricing hints, common competitors. Only facts from the description or clearly generic, never invented numbers',
    ),
  script: z
    .array(
      z.object({
        stage: z.enum(GENERATED_SCRIPT_STAGES),
        title: z.string(),
        content: z
          .string()
          .describe('What the salesperson says; spoken, natural, concise'),
      }),
    )
    .describe('4-6 stages in call order, from opener to close'),
  objection_library: z
    .array(
      z.object({
        objection: z.string(),
        response: z.string(),
      }),
    )
    .describe('5-8 realistic objections with a short, natural response each'),
});

export type GeneratedAssistantAgent = z.infer<
  typeof GeneratedAssistantAgentSchema
>;

export const ASSISTANT_AGENT_GENERATION_SYSTEM = `You design AI sales co-pilots: a real-time assistant that whispers suggestions to a salesperson during a live call.
From a short description, create a ready-to-use configuration: a call script, an objection library, suggestion rules and product knowledge.
Rules:
- Write script, objections, instructions and knowledge in the language of the description (set "language" to match).
- Script content is spoken dialogue: short sentences, no markdown, use placeholders like {name}, {company}, {me} where the salesperson fills in details.
- Order stages as a real call flows: OPENER, PITCH, DISCOVERY (with real questions), OBJECTION_HANDLING, CLOSE.
- Objections must be the ones this specific audience actually raises; responses are 1-3 sentences and end with a question or next step when natural.
- Never invent statistics, prices, customer names or claims. If the description lacks product facts, keep knowledge generic and flag gaps with "[add: ...]" placeholders.
- Pick the methodology that fits the sales motion (SPIN for consultative discovery, BANT for qualification, MEDDIC for complex B2B, CHALLENGER for insight-led, SANDLER for qualifying hard) or CUSTOM when none clearly fits.
- Pick suggestion_frequency: OBJECTIONS_ONLY for experienced reps, BALANCED by default, CONSTANT for beginners or complex products.`;
