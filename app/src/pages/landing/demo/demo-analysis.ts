import { Speakers, type CallAnalysis } from "@/features/calls/interfaces/calls.interfaces";
import { DEMO_BEATS } from "./demo-script";

const PACE_WPM = 148;

const wordsFor = (speaker: string) =>
  DEMO_BEATS.filter((beat) => beat.line.speaker === speaker).reduce((sum, beat) => sum + beat.line.text.split(/\s+/).length, 0);

const userWords = wordsFor(Speakers.USER);
const prospectWords = wordsFor(Speakers.PROSPECT);
const toSeconds = (words: number) => Math.round((words / PACE_WPM) * 60);
const userRatio = Math.round((userWords / (userWords + prospectWords)) * 100);

// Hand-written review of the scripted call, shaped exactly like a real analysis so the real components render it.
export const DEMO_ANALYSIS: CallAnalysis = {
  id: "demo-analysis",
  call_id: "demo-call",
  model: "demo",
  overall_score: 84,
  verdict: "A well-run discovery call that turned a price objection into a booked pilot.",
  summary:
    "Jordan asked for consent, found the real cost of slow follow-up in two questions, and used it to answer the price objection. The pitch came before the budget owner was confirmed, which left Marcus's role open at the close.",
  category_scores: [
    { key: "opening", label: "Opening and rapport", weight: 15, score: 88, comment: "Asked for consent and respected her ten minutes." },
    { key: "discovery", label: "Discovery", weight: 30, score: 90, comment: "Two short questions surfaced the shared inbox and the two lost renewals." },
    { key: "value", label: "Value pitch", weight: 15, score: 78, comment: "Tied to her pain, but the pitch came before budget was discussed." },
    { key: "objections", label: "Objection handling", weight: 25, score: 86, comment: "Compared the seat price with the cost of the lost renewals." },
    { key: "closing", label: "Closing", weight: 15, score: 76, comment: "Booked a date, but left the decision maker unconfirmed." },
  ],
  mistakes: [
    {
      at_ms: null,
      segment_id: null,
      title: "Pitched before the budget was discussed",
      category_key: "value",
      severity: "MEDIUM",
      what_happened: "The five-minute nudge pitch came before you asked who owns the budget, so the price objection landed late.",
      why_it_matters: "Budget surprises are easier to handle when the pain is quantified first and the budget range is already on the table.",
      what_to_do_instead: "After she names the lost renewals, ask what range she has set aside for fixing it, then pitch.",
    },
    {
      at_ms: null,
      segment_id: null,
      title: "Decision maker left open at the close",
      category_key: "closing",
      severity: "LOW",
      what_happened: "You booked Thursday without confirming that Marcus is the person who approves the purchase.",
      why_it_matters: "A second approver who joins late can reopen the price conversation.",
      what_to_do_instead: "Ask who else signs off, and put them on the invite before you hang up.",
    },
  ],
  strengths: [
    { at_ms: null, segment_id: null, title: "Asked for consent first", category_key: "opening", detail: "You asked before recording, which builds trust in the first ten seconds." },
    { at_ms: null, segment_id: null, title: "Quantified the pain", category_key: "discovery", detail: "Asking what a missed callback cost got a number: two renewals worth about $30,000." },
    { at_ms: null, segment_id: null, title: "Turned price into a comparison", category_key: "objections", detail: "Instead of defending the price, you set it beside the cost of doing nothing." },
    { at_ms: null, segment_id: null, title: "Proposed a small first step", category_key: "closing", detail: "A 12-seat pilot made the next step easy to say yes to." },
  ],
  improvements: [
    { title: "Qualify budget before the pitch", tip: "Ask for the range she has in mind as soon as the pain is clear." },
    { title: "Name every approver", tip: "Before closing, ask who else signs off and invite them." },
  ],
  metrics: {
    talk_ratio_user: userRatio,
    talk_ratio_prospect: 100 - userRatio,
    user_talk_seconds: toSeconds(userWords),
    prospect_talk_seconds: toSeconds(prospectWords),
    questions_asked: 4,
    longest_monologue_seconds: 8,
    speaking_pace_wpm: PACE_WPM,
    filler_words: 2,
    filler_breakdown: { um: 1, like: 1 },
    interruptions: 0,
    objections_raised: 2,
    objections_handled: 2,
    objections: [
      { at_ms: null, segment_id: null, objection: "We already have a CRM that's supposed to do this", handled: true, comment: "Moved the conversation to the gap the CRM leaves: nobody owns the callback." },
      { at_ms: null, segment_id: null, objection: "Your price is well above what we budgeted", handled: true, comment: "Asked for her range and compared it with two lost renewals." },
    ],
    buying_signals: [
      { at_ms: null, segment_id: null, signal: "Named the cost of slow follow-up: two lost renewals", acted_on: true },
      { at_ms: null, segment_id: null, signal: "Weighed the seat price against the lost revenue herself", acted_on: true },
      { at_ms: null, segment_id: null, signal: "Asked to bring IT into the setup call", acted_on: true },
    ],
  },
  prospect_insights: {
    summary: "",
    needs: [],
    pain_points: [],
    objections: [],
    interest_level: "HIGH",
    buying_signals: [],
    budget: "",
    timeline: "",
    decision_makers: "",
    competitors: "",
  },
  next_steps: ["Send the Thursday invite with Marcus on it", "Share the 12-seat pilot scope", "Prepare a comparison with her current CRM"],
  follow_up_draft: null,
  suggested_practice: [],
  practice_result: null,
  suggestion_usage: null,
  error: null,
  created_at: new Date(0).toISOString(),
};
