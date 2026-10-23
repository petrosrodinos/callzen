import { Speaker } from 'generated/prisma';

export interface TranscriptLine {
  speaker: Speaker;
  text: string;
  start_ms: number;
}

const SPEAKER_NAMES: Record<Speaker, string> = {
  USER: 'SALESPERSON',
  PROSPECT: 'PROSPECT',
  UNKNOWN: 'UNLABELED',
};

export const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Renders "[#3 01:12] PROSPECT: text" lines. `#n` is the index in the given array so the
// model can reference exact moments; when maxChars is exceeded the oldest lines are dropped.
export const formatTranscript = (
  segments: TranscriptLine[],
  options: {
    maxChars?: number;
    indexOffset?: number;
    speakerNames?: Partial<Record<Speaker, string>>;
  } = {},
): string => {
  const names = { ...SPEAKER_NAMES, ...options.speakerNames };
  const offset = options.indexOffset ?? 0;
  const lines = segments.map(
    (segment, index) =>
      `[#${index + offset} ${formatTimestamp(segment.start_ms)}] ${names[segment.speaker]}: ${segment.text}`,
  );

  if (!options.maxChars) return lines.join('\n');

  const kept: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    total += lines[i].length + 1;
    if (total > options.maxChars) {
      kept.unshift('[... earlier conversation omitted ...]');
      break;
    }
    kept.unshift(lines[i]);
  }
  return kept.join('\n');
};
