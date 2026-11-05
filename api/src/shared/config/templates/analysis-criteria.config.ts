export interface AnalysisCriterion {
  key: string;
  label: string;
  weight: number;
  description?: string;
}

export const DEFAULT_ANALYSIS_CRITERIA: AnalysisCriterion[] = [
  { key: 'opening', label: 'Opening / first impression', weight: 1 },
  { key: 'rapport', label: 'Rapport building', weight: 1 },
  { key: 'discovery', label: 'Discovery and questioning', weight: 1.5 },
  { key: 'listening', label: 'Active listening', weight: 1 },
  { key: 'value', label: 'Value communication / pitch clarity', weight: 1 },
  { key: 'objections', label: 'Objection handling', weight: 1.5 },
  { key: 'confidence', label: 'Confidence and tone', weight: 1 },
  { key: 'control', label: 'Control of the conversation', weight: 1 },
  { key: 'closing', label: 'Closing / securing next steps', weight: 1.5 },
  { key: 'script', label: 'Script adherence', weight: 0.5 },
];

// Used instead of the agent's criteria for cold calls, where the job is to get past the
// gatekeeper, reach the decision maker and book a next step rather than to run a sales process.
export const COLD_CALL_ANALYSIS_CRITERIA: AnalysisCriterion[] = [
  {
    key: 'opener',
    label: 'Opener',
    weight: 1.5,
    description:
      'Clear, confident and brief introduction that earns the next ten seconds; no "how are you" filler',
  },
  {
    key: 'gatekeeper',
    label: 'Getting past the gatekeeper',
    weight: 1.5,
    description:
      'Courtesy, confidence and persistence with a receptionist or assistant; asking for the right person without over-explaining. Score 70 if no gatekeeper was involved',
  },
  {
    key: 'reaching_owner',
    label: 'Reaching the owner / decision maker',
    weight: 1.5,
    description:
      'Identifying and getting through to the person who decides, and holding their attention once there. Score low if the call ended without reaching them',
  },
  {
    key: 'hook',
    label: 'Hook and relevance',
    weight: 1,
    description:
      "A short, relevant reason for the call tied to the prospect's situation, rather than a feature dump",
  },
  {
    key: 'objections',
    label: 'Handling brush-offs and objections',
    weight: 1,
    description:
      '"Not interested", "send an email", "we already have someone" - acknowledged and answered without arguing',
  },
  {
    key: 'confidence',
    label: 'Confidence and tone',
    weight: 1,
  },
  {
    key: 'next_step',
    label: 'Booking a next step',
    weight: 2,
    description:
      'Asking for and securing a specific meeting, demo or callback with a date and time',
  },
];

export const DEFAULT_CONSENT_LINE =
  'Before we start, just so you know, I use a call assistant that records and transcribes our conversation so I can follow up accurately. Is that okay with you?';
