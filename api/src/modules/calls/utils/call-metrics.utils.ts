import { Speaker } from 'generated/prisma';
import { round } from '@/shared/utils/math/math.utils';

export interface MetricSegment {
  speaker: Speaker;
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface ConversationMetrics {
  talk_ratio_user: number;
  talk_ratio_prospect: number;
  user_talk_seconds: number;
  prospect_talk_seconds: number;
  questions_asked: number;
  longest_monologue_seconds: number;
  speaking_pace_wpm: number;
  filler_words: number;
  filler_breakdown: Record<string, number>;
  interruptions: number;
  objections_raised: number;
  objections_handled: number;
}

const FILLER_PATTERNS: Record<string, RegExp> = {
  um: /\b(um+|uhm+|erm+)\b/gi,
  uh: /\b(uh+|eh+)\b/gi,
  like: /\blike\b(?!\s+(to|that|this|it|a|the)\b)/gi,
  'you know': /\byou know\b/gi,
  basically: /\bbasically\b/gi,
  actually: /\bactually\b/gi,
  'kind of': /\b(kind|sort) of\b/gi,
  literally: /\bliterally\b/gi,
};

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

const durationMs = (segment: MetricSegment) => {
  const measured = segment.end_ms - segment.start_ms;
  // Fall back to ~150 words per minute when timing is missing or implausible.
  return measured > 200 ? measured : wordCount(segment.text) * 400;
};

export const computeConversationMetrics = (
  segments: MetricSegment[],
  objections: { raised: number; handled: number },
): ConversationMetrics => {
  const userSegments = segments.filter((s) => s.speaker === Speaker.USER);
  const prospectSegments = segments.filter((s) => s.speaker !== Speaker.USER);

  const userMs = userSegments.reduce((sum, s) => sum + durationMs(s), 0);
  const prospectMs = prospectSegments.reduce(
    (sum, s) => sum + durationMs(s),
    0,
  );
  const totalMs = userMs + prospectMs || 1;

  let longestMonologueMs = 0;
  let currentRunMs = 0;
  for (const segment of segments) {
    if (segment.speaker === Speaker.USER) {
      currentRunMs += durationMs(segment);
      longestMonologueMs = Math.max(longestMonologueMs, currentRunMs);
    } else {
      currentRunMs = 0;
    }
  }

  const fillerBreakdown: Record<string, number> = {};
  for (const [label, pattern] of Object.entries(FILLER_PATTERNS)) {
    const count = userSegments.reduce(
      (sum, s) => sum + (s.text.match(pattern)?.length ?? 0),
      0,
    );
    if (count) fillerBreakdown[label] = count;
  }

  let interruptions = 0;
  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1];
    const current = segments[i];
    if (
      current.speaker === Speaker.USER &&
      previous.speaker !== Speaker.USER &&
      current.start_ms + 300 < previous.end_ms
    ) {
      interruptions += 1;
    }
  }

  const userWords = userSegments.reduce((sum, s) => sum + wordCount(s.text), 0);

  return {
    talk_ratio_user: round((userMs / totalMs) * 100),
    talk_ratio_prospect: round((prospectMs / totalMs) * 100),
    user_talk_seconds: round(userMs / 1000),
    prospect_talk_seconds: round(prospectMs / 1000),
    questions_asked: userSegments.reduce(
      (sum, s) => sum + (s.text.match(/\?/g)?.length ?? 0),
      0,
    ),
    longest_monologue_seconds: round(longestMonologueMs / 1000),
    speaking_pace_wpm: userMs > 0 ? round(userWords / (userMs / 60000)) : 0,
    filler_words: Object.values(fillerBreakdown).reduce((sum, n) => sum + n, 0),
    filler_breakdown: fillerBreakdown,
    interruptions,
    objections_raised: objections.raised,
    objections_handled: objections.handled,
  };
};
