import { z } from 'zod';
import {
  SuggestionFrequency,
  SuggestionLength,
  SuggestionType,
} from 'generated/prisma';
import { AgentSnapshot } from '../interfaces/call-snapshots.interface';
import {
  AUTO_LANGUAGE,
  languageName,
  languageNames,
} from '@/shared/config/languages/languages.config';

export const COPILOT_SUGGESTION_TYPES = [
  SuggestionType.OPENER,
  SuggestionType.DISCOVERY_QUESTION,
  SuggestionType.OBJECTION_RESPONSE,
  SuggestionType.VALUE_STATEMENT,
  SuggestionType.BUYING_SIGNAL,
  SuggestionType.NEXT_STEP,
  SuggestionType.REMINDER,
  SuggestionType.WARNING,
] as const;

export const CopilotSuggestionSchema = z.object({
  speaker_labels: z
    .array(
      z.object({
        ref: z.number().int(),
        speaker: z.enum(['USER', 'PROSPECT']),
      }),
    )
    .describe('Speaker for every UNLABELED line, by its #ref. Empty if none.'),
  show: z.boolean().describe('false when no new guidance is needed right now'),
  type: z.enum(COPILOT_SUGGESTION_TYPES),
  text: z
    .string()
    .describe(
      'The single best ready-to-speak line or ultra-short talking points',
    ),
  alternatives: z
    .array(z.string())
    .describe('Alternative phrasings (e.g. softer / more direct)'),
  reason: z
    .string()
    .describe(
      'Max 8 words: why this suggestion, e.g. "Price objection detected"',
    ),
  completed_stage_ids: z
    .array(z.string())
    .describe('Ids of script stages that are now completed'),
  info_card: z
    .object({ title: z.string(), content: z.string() })
    .nullable()
    .describe(
      'A quick fact from the knowledge base if the prospect asked about something it covers, else null',
    ),
});

export type CopilotSuggestion = z.infer<typeof CopilotSuggestionSchema>;

export const CopilotAnswerSchema = z.object({
  answer: z
    .string()
    .describe('Direct, short answer the salesperson can use immediately'),
  found_in_knowledge: z.boolean(),
});

const FREQUENCY_RULES: Record<SuggestionFrequency, string> = {
  OBJECTIONS_ONLY:
    'Only show a suggestion (show=true) when the prospect raises an objection, asks a question or shows a buying signal. Otherwise show=false.',
  BALANCED:
    'Show a suggestion when the prospect said something meaningful, when there is an objection, question or buying signal, or when the salesperson needs a nudge. Skip small talk and acknowledgements.',
  CONSTANT:
    'Always show the next best thing to say (show=true) unless the very last suggestion is still perfectly valid.',
};

const LENGTH_RULES: Record<SuggestionLength, string> = {
  SHORT: 'text: max 20 words.',
  MEDIUM: 'text: max 35 words.',
};

const truncate = (value: string | null | undefined, max: number) => {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}\n[...truncated]` : value;
};

export const buildAgentBrief = (agent: AgentSnapshot): string => {
  const script = agent.script?.length
    ? agent.script
        .map(
          (stage) =>
            `- [${stage.id}] ${stage.stage} – ${stage.title}: ${stage.content}`,
        )
        .join('\n')
    : 'No script provided.';
  const objections = agent.objection_library?.length
    ? agent.objection_library
        .map((o) => `- "${o.objection}" → ${o.response}`)
        .join('\n')
    : 'None.';

  return `CO-PILOT AGENT: ${agent.name}
Purpose: ${agent.description ?? 'n/a'}
Call goal: ${agent.call_goal ?? 'n/a'}
Methodology: ${agent.methodology ?? 'none'}
Tone: ${agent.tone}
Conversation languages: ${languageNames(agent.languages?.length ? agent.languages : [agent.language])}
Instructions from the salesperson (follow strictly):
${agent.instructions || 'none'}

SCRIPT (stage id in brackets):
${script}

OBJECTION LIBRARY (prefer these responses, adapted to the moment):
${objections}

KNOWLEDGE:
${truncate(agent.knowledge, 8000) || 'none'}`;
};

export interface CopilotPromptInput {
  agent: AgentSnapshot;
  callContext: string;
  transcript: string;
  recentSuggestions: string[];
  completedStageIds: string[];
  outputLanguage: string;
  frequency: SuggestionFrequency;
  hasUnlabeled: boolean;
  elapsedLabel: string;
}

export const buildCopilotSystem = (
  input: CopilotPromptInput,
): string => `You are CallZen, a real-time sales co-pilot. You silently listen to a live sales call and show the SALESPERSON short, glanceable guidance on what to say next. The salesperson is talking and listening at the same time: be extremely brief and immediately usable.

${buildAgentBrief(input.agent)}

RULES:
- Respond to what the prospect ACTUALLY said last, not just the next script line. Guide back to the script and call goal naturally.
- Objection detected ("too expensive", "send me an email", "we have a provider", "not interested", "call me later", etc.) → type OBJECTION_RESPONSE, prefer the objection library response.
- Buying signal ("how does pricing work?", "can it do X?", "who else uses this?") → type BUYING_SIGNAL with how to move forward.
- Use REMINDER for important missed items (e.g. "You haven't asked about budget yet") and WARNING for behaviour issues (talking too much, prospect disengaged).
- Phrase "text" as words the salesperson can say out loud, in first person. ${LENGTH_RULES[input.agent.suggestion_length]}
- Provide exactly ${input.agent.alternatives_count} alternative(s) (each max 20 words), or an empty list if 0.
- Do not repeat a recent suggestion unless still the best move.
- ${FREQUENCY_RULES[input.frequency]}
- ${input.hasUnlabeled ? 'Some lines are UNLABELED because one microphone captured both people. Infer who spoke each UNLABELED line from context (the SALESPERSON is the one selling) and return it in speaker_labels.' : 'speaker_labels must be an empty list.'}
- Write text, alternatives, reason and info_card in ${input.outputLanguage}.`;

export const buildCopilotPrompt = (
  input: CopilotPromptInput,
): string => `CALL CONTEXT:
${input.callContext}

Elapsed: ${input.elapsedLabel}
Script stages already completed: ${input.completedStageIds.length ? input.completedStageIds.join(', ') : 'none'}

RECENT SUGGESTIONS ALREADY SHOWN (newest last):
${input.recentSuggestions.length ? input.recentSuggestions.map((s) => `- ${s}`).join('\n') : 'none'}

LIVE TRANSCRIPT (newest last):
${input.transcript || '(nothing said yet)'}

What should the salesperson see right now?`;

// The language suggestions and analyses are written in. With several conversation languages and
// auto-detection, the model follows whichever of them the prospect is speaking.
export const resolveOutputLanguage = (
  mode: 'CONVERSATION' | 'INTERFACE',
  conversationLanguage: string,
  interfaceLanguage: string,
  conversationLanguages: string[] = [],
  purpose: 'live' | 'review' = 'live',
): string => {
  if (mode === 'INTERFACE') return languageName(interfaceLanguage);
  if (conversationLanguage === AUTO_LANGUAGE && purpose === 'review') {
    return 'the main language the prospect spoke in the transcript (not English unless the prospect mainly spoke English)';
  }
  if (conversationLanguage === AUTO_LANGUAGE) {
    return conversationLanguages.length
      ? `the language the prospect is currently speaking (one of: ${languageNames(conversationLanguages)})`
      : 'the language the prospect is currently speaking';
  }
  return languageName(conversationLanguage);
};
