export const PERSONALITY_TYPES = [
  'ANALYTICAL',
  'DRIVER',
  'AMIABLE',
  'EXPRESSIVE',
  'SKEPTICAL',
  'INDECISIVE',
] as const;
export const MOOD_TYPES = [
  'NEUTRAL',
  'RUSHED',
  'IRRITATED',
  'CURIOUS',
  'DISTRACTED',
  'ENTHUSIASTIC',
] as const;
export const DECISION_AUTHORITY_TYPES = [
  'DECISION_MAKER',
  'INFLUENCER',
  'GATEKEEPER',
  'NEEDS_APPROVAL',
] as const;
export const BUDGET_TYPES = [
  'NO_BUDGET',
  'LIMITED',
  'BUDGET_AVAILABLE',
  'PRICE_SENSITIVE',
] as const;
export const TIMELINE_TYPES = [
  'URGENT',
  'WITHIN_3_MONTHS',
  'JUST_RESEARCHING',
  'NO_TIMELINE',
] as const;
export const SCENARIO_TYPES = [
  'COLD_CALL',
  'INBOUND',
  'FOLLOW_UP',
  'DEMO_FOLLOW_UP',
  'DISCOVERY',
  'RENEWAL',
  'NEGOTIATION',
  'GATEKEEPER',
] as const;

export const DIFFICULTY_DESCRIPTIONS: Record<number, string> = {
  1: 'Very easy: friendly, open, almost no objections, converts with any reasonable pitch.',
  2: 'Easy: friendly and open, one or two mild objections, converts readily with a decent pitch.',
  3: 'Medium: some skepticism, raises a few genuine objections, needs good discovery and clear value.',
  4: 'Hard: skeptical, busy or guarded, raises tough and repeated objections, may try to end the call early.',
  5: 'Very hard: hostile to sales calls, repeats objections, hangs up quickly, converts only with excellent technique.',
};

export const PATIENCE_DESCRIPTIONS: Record<number, string> = {
  1: 'Extremely impatient: will end the call after one or two weak or irrelevant statements.',
  2: 'Impatient: gives the caller about 30 seconds to become relevant.',
  3: 'Average patience: tolerates a few weak moments but ends the call if the conversation keeps going nowhere.',
  4: 'Patient: gives the caller plenty of chances.',
  5: 'Very patient: almost never ends the call early.',
};
