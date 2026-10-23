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

export const DEFAULT_CONSENT_LINE =
  'Before we start, just so you know, I use a call assistant that records and transcribes our conversation so I can follow up accurately. Is that okay with you?';
