import { SuggestionFrequency, SuggestionLength } from 'generated/prisma';
import { AnalysisCriterion } from '@/shared/config/templates/analysis-criteria.config';
import {
  ObjectionEntry,
  ScriptStage,
} from '@/shared/config/templates/assistant-agent-templates.config';
import { PracticeObjection } from '@/shared/config/templates/practice-agent-templates.config';

export interface AgentSnapshot {
  id: string;
  name: string;
  description: string | null;
  call_goal: string | null;
  script: ScriptStage[];
  instructions: string | null;
  knowledge: string | null;
  objection_library: ObjectionEntry[];
  methodology: string | null;
  language: string;
  languages: string[];
  tone: string;
  suggestion_frequency: SuggestionFrequency;
  suggestion_length: SuggestionLength;
  alternatives_count: number;
  realtime_model: string;
  analysis_model: string;
  analysis_criteria: AnalysisCriterion[];
}

export interface PracticeSnapshot {
  id: string;
  name: string;
  prospect_name: string | null;
  role_prompt: string;
  scenario_context: string | null;
  scenario_type: string;
  selling_product: string | null;
  user_objective: string | null;
  lead_temperature: string;
  difficulty: number;
  personality: string | null;
  mood: string | null;
  communication_style: string | null;
  decision_authority: string | null;
  budget: string | null;
  timeline: string | null;
  current_solution: string | null;
  pain_points: string[];
  objections: PracticeObjection[];
  hidden_information: string[];
  conversion_conditions: string[];
  patience: number;
  language: string;
  languages: string[];
  accent: string | null;
  industry: string | null;
  company: string | null;
  job_title: string | null;
  age_range: string | null;
  background_story: string | null;
  briefing: string | null;
  voice_provider: string;
  voice: string;
  time_limit_minutes: number | null;
  product_knowledge: string | null;
}
