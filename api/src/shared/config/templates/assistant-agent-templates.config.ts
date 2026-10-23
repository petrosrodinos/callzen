import { SuggestionFrequency } from 'generated/prisma';
import {
  DEFAULT_ANALYSIS_CRITERIA,
  AnalysisCriterion,
} from './analysis-criteria.config';

export interface ScriptStage {
  id: string;
  stage: string;
  title: string;
  content: string;
}

export interface ObjectionEntry {
  id: string;
  objection: string;
  response: string;
}

export interface AssistantAgentTemplate {
  key: string;
  name: string;
  description: string;
  call_goal: string;
  methodology: string | null;
  tone: string;
  suggestion_frequency: SuggestionFrequency;
  instructions: string;
  knowledge: string;
  script: ScriptStage[];
  objection_library: ObjectionEntry[];
  analysis_criteria: AnalysisCriterion[];
}

const stage = (
  id: string,
  stageKey: string,
  title: string,
  content: string,
): ScriptStage => ({
  id,
  stage: stageKey,
  title,
  content,
});

const objection = (
  id: string,
  text: string,
  response: string,
): ObjectionEntry => ({
  id,
  objection: text,
  response,
});

export const ASSISTANT_AGENT_TEMPLATES: AssistantAgentTemplate[] = [
  {
    key: 'generic-cold-call',
    name: 'Generic Cold Call',
    description:
      'Short, punchy cold call focused on earning 30 seconds and booking a meeting.',
    call_goal: 'Book a 20-minute discovery meeting',
    methodology: 'CUSTOM',
    tone: 'FRIENDLY',
    suggestion_frequency: SuggestionFrequency.BALANCED,
    instructions:
      'Keep suggestions under 20 words. Never pitch before asking at least one discovery question. Always end by asking for a specific meeting time.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Permission opener',
        "Hi {name}, it's {me} from {company}. I know I'm calling out of the blue. Can I take 30 seconds to tell you why I called, and you can decide if it's worth continuing?",
      ),
      stage(
        's2',
        'PITCH',
        'Reason for the call',
        'We help {industry} teams {outcome}. Most people I speak with are struggling with {pain}.',
      ),
      stage(
        's3',
        'DISCOVERY',
        'Discovery',
        'How are you handling {process} today? What would you change about it if you could?',
      ),
      stage(
        's4',
        'CLOSE',
        'Meeting ask',
        'It sounds worth a proper conversation. Does Tuesday at 10 or Thursday at 2 work better for a 20-minute call?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'Send me an email',
        'Happy to. So I send something relevant, what is the biggest priority for you this quarter?',
      ),
      objection(
        'o2',
        'Not interested',
        'Totally fair, most people say that before they hear what it is. Can I ask one quick question to see if it is even relevant?',
      ),
      objection(
        'o3',
        'We already have a provider',
        'Makes sense. What do you like most about them, and if you could improve one thing what would it be?',
      ),
      objection(
        'o4',
        'Call me later',
        'Of course. When is a better time, later today or tomorrow morning?',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
  {
    key: 'b2b-discovery',
    name: 'B2B Discovery',
    description:
      'Deep qualification on budget, authority, need and timeline for enterprise deals.',
    call_goal:
      'Qualify the opportunity and agree a demo with the decision makers',
    methodology: 'BANT',
    tone: 'CONSULTATIVE',
    suggestion_frequency: SuggestionFrequency.BALANCED,
    instructions:
      'Prioritise open questions. Make sure budget, authority, need and timeline are all covered before the end. Summarise what you heard before proposing next steps.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Agenda setting',
        'Thanks for the time. I suggest we spend a few minutes on your current situation, then I can share how we help, and we decide together if a next step makes sense. Sound good?',
      ),
      stage(
        's2',
        'DISCOVERY',
        'Need',
        'What prompted you to look at this now? What happens if nothing changes?',
      ),
      stage(
        's3',
        'DISCOVERY',
        'Authority',
        'Besides yourself, who else will be involved in evaluating a solution like this?',
      ),
      stage(
        's4',
        'DISCOVERY',
        'Budget',
        'Have you set aside a budget for solving this, or is that still to be defined?',
      ),
      stage(
        's5',
        'DISCOVERY',
        'Timeline',
        'When would you ideally like to have something in place?',
      ),
      stage(
        's6',
        'CLOSE',
        'Next step',
        'Based on what you shared, a tailored demo with you and {stakeholder} would make sense. Can we lock in a time?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'We have no budget',
        'Understood. If we could show a clear return within the year, would it be worth building a business case together?',
      ),
      objection(
        'o2',
        'I need to talk to my boss',
        'Of course. What will matter most to them? Should we invite them to the next call so you do not have to relay everything?',
      ),
      objection(
        'o3',
        'Just researching',
        'Great time to talk then. What would need to be true for this to become a priority?',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
  {
    key: 'real-estate',
    name: 'Real Estate Buyer Calls',
    description:
      'Property-focused qualification and financing objections for buyer leads.',
    call_goal: 'Schedule a property viewing',
    methodology: 'CUSTOM',
    tone: 'FRIENDLY',
    suggestion_frequency: SuggestionFrequency.BALANCED,
    instructions:
      'Be warm and helpful. Uncover must-haves, budget, financing status and timeline. Always offer two viewing slots.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Opener',
        'Hi {name}, this is {me} from {agency}. You enquired about {property}. Is now a good moment for a quick chat?',
      ),
      stage(
        's2',
        'DISCOVERY',
        'Needs',
        'What are the must-haves for your next home? Bedrooms, area, schools?',
      ),
      stage(
        's3',
        'DISCOVERY',
        'Financing',
        'Have you already spoken with a lender or got a mortgage in principle?',
      ),
      stage(
        's4',
        'CLOSE',
        'Viewing',
        'I can show you {property} on Saturday morning or Monday evening. Which suits you better?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'The price is too high',
        'I hear you. Comparable homes nearby sold for similar figures. Would it help to see it first and then we can discuss value?',
      ),
      objection(
        'o2',
        'We have not sorted financing yet',
        'No problem, I can connect you with a broker who can give you clarity in 24 hours. Shall I?',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
  {
    key: 'insurance',
    name: 'Insurance',
    description:
      'Needs-based insurance review calls with compliance-friendly language.',
    call_goal: 'Book a coverage review appointment',
    methodology: 'SPIN',
    tone: 'PROFESSIONAL',
    suggestion_frequency: SuggestionFrequency.BALANCED,
    instructions:
      'Never promise specific premiums. Focus on risk and peace of mind. Use plain language, avoid jargon.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Opener',
        'Hi {name}, {me} here from {company}. I am reaching out because many families in your area are paying for coverage that no longer fits them. Do you have two minutes?',
      ),
      stage(
        's2',
        'DISCOVERY',
        'Situation',
        'When did you last review your current policy?',
      ),
      stage(
        's3',
        'DISCOVERY',
        'Implication',
        'If something happened tomorrow, how confident are you that your family would be covered?',
      ),
      stage(
        's4',
        'CLOSE',
        'Appointment',
        'A free 20-minute review would show you exactly where you stand. Would Wednesday or Friday work?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'I already have insurance',
        'Great, that is exactly why a review helps. Most people find gaps or overpayments. What does your current policy cover?',
      ),
      objection(
        'o2',
        'It is too expensive',
        'Understood. The review is free and often lowers costs. Would it hurt to see the numbers?',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
  {
    key: 'recruiting',
    name: 'Recruiting',
    description: 'Candidate outreach calls to spark interest in a new role.',
    call_goal: 'Schedule an interview with the hiring manager',
    methodology: 'CUSTOM',
    tone: 'FRIENDLY',
    suggestion_frequency: SuggestionFrequency.BALANCED,
    instructions:
      'Lead with curiosity about the candidate career goals before describing the role. Respect their time.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Opener',
        'Hi {name}, {me} from {company}. I came across your background in {field} and have a role that might interest you. Open to a quick chat?',
      ),
      stage(
        's2',
        'DISCOVERY',
        'Motivation',
        'What would make you consider a move right now?',
      ),
      stage(
        's3',
        'PITCH',
        'Role pitch',
        'This role offers {benefit}. Based on what you said, that seems to match {motivation}.',
      ),
      stage(
        's4',
        'CLOSE',
        'Interview',
        'Would you be open to a 30-minute conversation with the hiring manager this week?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'I am happy where I am',
        'That is great to hear. Out of curiosity, what would have to be true for a move to make sense in the future?',
      ),
      objection(
        'o2',
        'What is the salary?',
        'The range is competitive for the level. Before numbers, can I check what matters most to you beyond pay?',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
  {
    key: 'renewal-upsell',
    name: 'Renewal & Upsell',
    description:
      'Account expansion and retention conversations with existing customers.',
    call_goal: 'Secure the renewal and identify an expansion opportunity',
    methodology: 'CHALLENGER',
    tone: 'CONSULTATIVE',
    suggestion_frequency: SuggestionFrequency.OBJECTIONS_ONLY,
    instructions:
      'Start with the results the customer achieved. Explore new teams or use cases before discussing price.',
    knowledge: '',
    script: [
      stage(
        's1',
        'OPENER',
        'Value recap',
        'Before we talk renewal, I would love to hear how things have gone this year. What results have you seen?',
      ),
      stage(
        's2',
        'DISCOVERY',
        'Expansion',
        'Are there other teams who could benefit from the same results?',
      ),
      stage(
        's3',
        'CLOSE',
        'Renewal',
        'Shall we lock in the renewal now so there is no interruption, and plan a session for the new team?',
      ),
    ],
    objection_library: [
      objection(
        'o1',
        'We need a discount',
        'I understand budgets are tight. If we extend to a two-year term, I can look at better pricing. Would that work?',
      ),
      objection(
        'o2',
        'We are considering a competitor',
        'Thanks for being open. What are they offering that feels attractive? Let us see if we can match it.',
      ),
    ],
    analysis_criteria: DEFAULT_ANALYSIS_CRITERIA,
  },
];

export const findAssistantAgentTemplate = (key: string) =>
  ASSISTANT_AGENT_TEMPLATES.find((t) => t.key === key);
