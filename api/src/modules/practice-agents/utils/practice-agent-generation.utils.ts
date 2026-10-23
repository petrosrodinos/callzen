import { z } from 'zod';
import {
  BUDGET_TYPES,
  DECISION_AUTHORITY_TYPES,
  DIFFICULTY_DESCRIPTIONS,
  MOOD_TYPES,
  PERSONALITY_TYPES,
  SCENARIO_TYPES,
  TIMELINE_TYPES,
} from '@/shared/config/practice/practice-options.config';
import { VOICE_PROVIDER_CATALOG } from '@/shared/config/voices/voice-providers.config';
import { VoiceProvider } from 'generated/prisma';

const realtimeVoiceIds = VOICE_PROVIDER_CATALOG.find(
  (p) => p.id === VoiceProvider.OPENAI_REALTIME,
).voices.map((v) => v.id) as [string, ...string[]];

export const GeneratedPracticeAgentSchema = z.object({
  name: z
    .string()
    .describe('Short scenario name, e.g. "Cold Call – Skeptical IT Manager"'),
  prospect_name: z.string().describe('Realistic full name of the prospect'),
  role_prompt: z
    .string()
    .describe('Who the prospect is and what they want, 1-3 sentences'),
  scenario_context: z.string().describe('The situation of the call'),
  scenario_type: z.enum(SCENARIO_TYPES),
  selling_product: z
    .string()
    .describe('What the salesperson sells in this scenario'),
  user_objective: z
    .string()
    .describe('What counts as success for the salesperson'),
  lead_temperature: z.enum(['COLD', 'WARM']),
  difficulty: z.number().int().min(1).max(5),
  personality: z.enum(PERSONALITY_TYPES),
  mood: z.enum(MOOD_TYPES),
  communication_style: z.string(),
  decision_authority: z.enum(DECISION_AUTHORITY_TYPES),
  budget: z.enum(BUDGET_TYPES),
  timeline: z.enum(TIMELINE_TYPES),
  current_solution: z.string(),
  pain_points: z
    .array(z.string())
    .describe('Real underlying problems, revealed only through good discovery'),
  objections: z.array(
    z.object({ text: z.string(), persistence: z.number().int().min(1).max(3) }),
  ),
  hidden_information: z
    .array(z.string())
    .describe(
      'Facts shared only if asked the right questions or trust is built',
    ),
  conversion_conditions: z
    .array(z.string())
    .describe('What the salesperson must do for the prospect to agree'),
  patience: z.number().int().min(1).max(5),
  language: z.string().describe('ISO 639-1 code, e.g. "en"'),
  accent: z.string(),
  industry: z.string(),
  company: z.string(),
  job_title: z.string(),
  age_range: z.string().describe('e.g. "35-45"'),
  background_story: z.string(),
  briefing: z
    .string()
    .describe(
      'What the salesperson would realistically know before the call. Must NOT reveal hidden info, pain points or conversion conditions.',
    ),
  voice: z
    .enum(realtimeVoiceIds)
    .describe('Voice matching the persona gender and style'),
});

export type GeneratedPracticeAgent = z.infer<
  typeof GeneratedPracticeAgentSchema
>;

export const PRACTICE_AGENT_GENERATION_SYSTEM = `You design realistic sales-practice prospects ("AI prospects") for salespeople to rehearse calls against.
Create believable, specific, internally consistent personas. Use concrete details (numbers, names, situations).
Difficulty scale:
${Object.entries(DIFFICULTY_DESCRIPTIONS)
  .map(([level, text]) => `${level} = ${text}`)
  .join('\n')}
Rules:
- Pain points and hidden information must be things a good salesperson could uncover with discovery questions.
- Objections must be realistic for this persona; persistence 1 = drops it easily, 3 = keeps coming back.
- Conversion conditions must be concrete behaviours the salesperson must show.
- The briefing contains only what a salesperson would know before dialing (name, company, lead source). Never include hidden information.
- Voice ids: marin, coral, sage, shimmer are female; cedar, ash, ballad, echo, verse are male; alloy is neutral.`;

export interface GenerationContext {
  product?: string | null;
  knowledge?: string | null;
}

export const buildProductContext = (context: GenerationContext): string => {
  const parts: string[] = [];
  if (context.product) parts.push(`The salesperson sells: ${context.product}`);
  if (context.knowledge)
    parts.push(
      `Product knowledge (excerpt):\n${context.knowledge.slice(0, 4000)}`,
    );
  return parts.length
    ? parts.join('\n\n')
    : 'No product details given. Invent a plausible product that fits the scenario.';
};
