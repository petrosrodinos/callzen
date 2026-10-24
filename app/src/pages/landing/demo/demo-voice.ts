import type { DemoLine } from "./demo-script";

export interface Utterance {
  // Resolves when the line has been spoken (or was cancelled).
  done: Promise<void>;
  cancel: () => void;
  // 0..1 progress of the line, used to reveal the transcript in time with the voice.
  progress: () => number;
}

const WORDS_PER_MINUTE = 155;
const estimateMs = (text: string) => (text.split(/\s+/).length * 60000) / WORDS_PER_MINUTE;

const clips = new Map<string, HTMLAudioElement>();
// Every element ever started, so one call can silence all of them even if a run lost track of its clip.
const started = new Set<HTMLAudioElement>();

export const stopAllVoices = () => {
  for (const audio of started) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
  }
  started.clear();
};

// Starts downloading every pre-recorded line so playback has no gaps between turns.
export const preloadVoices = (lines: DemoLine[]) => {
  for (const line of lines) {
    if (clips.has(line.audio)) continue;
    const audio = new Audio(line.audio);
    audio.preload = "auto";
    clips.set(line.audio, audio);
  }
};

// Reads the line's text for as long as it would take to say it. Used for the silent mode and if a clip can't be played.
const silent = (line: DemoLine): Utterance => {
  const total = estimateMs(line.text);
  const startedAt = performance.now();
  let timer = 0;
  let resolve = () => undefined as void;
  const done = new Promise<void>((r) => {
    resolve = r;
    timer = window.setTimeout(r, total);
  });
  return {
    done,
    cancel: () => {
      window.clearTimeout(timer);
      resolve();
    },
    progress: () => Math.min(1, (performance.now() - startedAt) / total),
  };
};

const recorded = (line: DemoLine): Utterance => {
  const audio = clips.get(line.audio) ?? new Audio(line.audio);
  audio.currentTime = 0;
  let resolve = () => undefined as void;
  let fallback: Utterance | null = null;
  const done = new Promise<void>((r) => {
    resolve = r;
  });
  audio.onended = () => resolve();
  // A clip that can't load or play is shown as text for a natural reading time rather than skipped.
  const fail = () => {
    fallback = silent(line);
    void fallback.done.then(resolve);
  };
  audio.onerror = fail;
  started.add(audio);
  audio.play().catch(fail);
  return {
    done,
    cancel: () => {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      fallback?.cancel();
      resolve();
    },
    progress: () => (fallback ? fallback.progress() : audio.duration > 0 ? Math.min(1, audio.currentTime / audio.duration) : 0),
  };
};

export const speak = (line: DemoLine, sound: boolean): Utterance => (sound ? recorded(line) : silent(line));
