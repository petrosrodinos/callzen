import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Speakers, SuggestionStatuses, type Suggestion, type SuggestionFeedback } from "@/features/calls/interfaces/calls.interfaces";
import { SuggestionFrequencies, type SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import type { CopilotHealth, LiveSegment } from "@/hooks/use-copilot-session";
import type { LiveAssistSession } from "@/components/ui/live-assist/live-assist-panel";
import { DEMO_BEATS, DEMO_OPENING_SUGGESTION, type DemoSuggestion } from "./demo-script";
import { preloadVoices, speak, stopAllVoices, type Utterance } from "./demo-voice";

export type DemoPhase = "idle" | "live" | "analysing" | "done";

const REVEAL_TICK_MS = 80;
const ANALYSING_MS = 2400;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const toSuggestion = (item: DemoSuggestion, index: number, atMs: number): Suggestion => ({
  id: `demo-suggestion-${index}`,
  call_id: "demo-call",
  type: item.type,
  text: item.text,
  alternatives: item.alternatives ?? [],
  reason: item.reason,
  info_card: item.infoCard ?? null,
  at_ms: atMs,
  status: SuggestionStatuses.SHOWN,
  feedback: null,
  model: null,
  latency_ms: null,
  created_at: new Date(0).toISOString(),
});

// Plays the scripted sales call: voices, live transcript, co-pilot cards and the post-call analysis hand-off.
export const useDemoCall = () => {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [interim, setInterim] = useState<{ speaker: string; text: string }[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [scriptProgress, setScriptProgress] = useState<string[]>([]);
  const [health, setHealth] = useState<CopilotHealth>("ok");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sound, setSound] = useState(true);
  const [muted, setMuted] = useState(false);
  const [frequency, setFrequency] = useState<SuggestionFrequency | undefined>(SuggestionFrequencies.BALANCED);

  const runRef = useRef(0);
  const soundRef = useRef(sound);
  const mutedRef = useRef(muted);
  const speakingRef = useRef<string | null>(null);
  const utteranceRef = useRef<Utterance | null>(null);
  const startedAtRef = useRef(0);
  const clockRef = useRef(0);
  const countRef = useRef(0);

  useEffect(() => {
    soundRef.current = sound;
    mutedRef.current = muted;
  }, [sound, muted]);

  const halt = useCallback(() => {
    runRef.current += 1;
    utteranceRef.current?.cancel();
    utteranceRef.current = null;
    speakingRef.current = null;
    window.clearInterval(clockRef.current);
    stopAllVoices();
  }, []);

  // Navigating is a React transition, so this component can outlive the URL change: stop on the change itself, not just on unmount.
  const { pathname } = useLocation();
  useEffect(() => halt, [halt, pathname]);

  const reset = useCallback(() => {
    setSegments([]);
    setInterim([]);
    setSuggestions([]);
    setScriptProgress([]);
    setHealth("ok");
    setElapsedMs(0);
    setMuted(false);
    countRef.current = 0;
  }, []);

  const stopToIdle = useCallback(() => {
    halt();
    reset();
    setPhase((current) => (current === "live" ? "idle" : current));
  }, [halt, reset]);

  // Router navigation is deferred until the next route is ready, which can take seconds on a slow chunk: stop at the click itself.
  useEffect(() => {
    const onLinkClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      // In-page anchors (#practice, #review) keep the visitor on the landing page.
      if (link.pathname === window.location.pathname) return;
      stopToIdle();
    };
    // A demo nobody can see shouldn't keep talking either.
    const onVisibility = () => {
      if (document.hidden) stopToIdle();
    };
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("popstate", stopToIdle);
    window.addEventListener("pagehide", stopToIdle);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", stopToIdle);
      window.removeEventListener("pagehide", stopToIdle);
    };
  }, [stopToIdle]);

  const startClock = useCallback(() => {
    startedAtRef.current = performance.now();
    window.clearInterval(clockRef.current);
    clockRef.current = window.setInterval(() => setElapsedMs(performance.now() - startedAtRef.current), 250);
  }, []);

  const play = useCallback(
    async (run: number) => {
      const alive = () => runRef.current === run;
      const showSuggestion = async (item: DemoSuggestion) => {
        setHealth("thinking");
        await wait(item.thinkMs);
        if (!alive()) return;
        const index = countRef.current++;
        const next = toSuggestion(item, index, performance.now() - startedAtRef.current);
        // A muted co-pilot keeps listening but shows nothing, same as the real panel.
        if (!mutedRef.current) setSuggestions((prev) => [...prev, next]);
        setHealth("ok");
      };

      startClock();
      await showSuggestion(DEMO_OPENING_SUGGESTION);
      if (!alive()) return;
      await wait(1400);

      for (const beat of DEMO_BEATS) {
        if (!alive()) return;
        const { line } = beat;
        const words = line.text.split(/\s+/);
        const startMs = performance.now() - startedAtRef.current;

        const utterance = speak(line, soundRef.current);
        utteranceRef.current = utterance;
        speakingRef.current = line.speaker;

        // Reveal the words as they are spoken, like interim speech-to-text.
        const reveal = window.setInterval(() => {
          const shown = Math.max(1, Math.round(utterance.progress() * words.length));
          setInterim([{ speaker: line.speaker, text: words.slice(0, shown).join(" ") }]);
        }, REVEAL_TICK_MS);
        await utterance.done;
        window.clearInterval(reveal);
        speakingRef.current = null;
        if (!alive()) return;

        setInterim([]);
        setSegments((prev) => [
          ...prev,
          { id: `demo-segment-${line.id}`, client_id: line.id, speaker: line.speaker, text: line.text, start_ms: startMs, end_ms: performance.now() - startedAtRef.current, pending: false },
        ]);
        if (beat.completes) setScriptProgress((prev) => [...prev, ...beat.completes!]);

        for (const item of beat.suggestions ?? []) {
          await showSuggestion(item);
          if (!alive()) return;
        }
        await wait(beat.pauseMs);
      }

      window.clearInterval(clockRef.current);
      setPhase("analysing");
      await wait(ANALYSING_MS);
      if (alive()) setPhase("done");
    },
    [startClock],
  );

  const start = useCallback(
    (withSound: boolean) => {
      halt();
      reset();
      setSound(withSound);
      soundRef.current = withSound;
      if (withSound) preloadVoices(DEMO_BEATS.map((beat) => beat.line));
      setPhase("live");
      void play(runRef.current);
    },
    [halt, play, reset],
  );

  const finishNow = useCallback(() => {
    halt();
    setInterim([]);
    setSegments(
      DEMO_BEATS.map(({ line }, i) => ({ id: `demo-segment-${line.id}`, client_id: line.id, speaker: line.speaker, text: line.text, start_ms: i * 8000, end_ms: i * 8000 + 6000, pending: false })),
    );
    const all = DEMO_BEATS.flatMap((beat) => beat.suggestions ?? []);
    setSuggestions([DEMO_OPENING_SUGGESTION, ...all].map((item, i) => toSuggestion(item, i, i * 8000)));
    setScriptProgress(DEMO_BEATS.flatMap((beat) => beat.completes ?? []));
    setHealth("ok");
    setPhase("done");
  }, [halt]);

  const setSuggestionStatus = useCallback((suggestion: Suggestion, status: Suggestion["status"]) => {
    setSuggestions((prev) => prev.map((item) => (item.id === suggestion.id ? { ...item, status } : item)));
  }, []);

  const visible = useMemo(() => suggestions.filter((item) => item.status !== SuggestionStatuses.DISMISSED), [suggestions]);
  const primary = visible.at(-1) ?? null;
  const pinned = useMemo(() => visible.filter((item) => item.status === SuggestionStatuses.PINNED && item.id !== primary?.id), [visible, primary]);
  const history = useMemo(() => visible.slice(0, -1).reverse().slice(0, 8), [visible]);
  const latestInfoCard = useMemo(() => [...visible].reverse().find((item) => item.info_card)?.info_card ?? null, [visible]);

  const session: LiveAssistSession = {
    primary,
    pinned,
    history,
    latestInfoCard,
    scriptProgress,
    muted,
    setMuted,
    frequency,
    setFrequency,
    health,
    fallbackModel: null,
    pendingCount: 0,
    isAsking: false,
    requestSuggestionNow: async () => undefined,
    // The demo has no live model behind it, so questions are rejected and the panel keeps the text in the box.
    ask: async () => {
      throw new Error("demo");
    },
    pin: (suggestion) => setSuggestionStatus(suggestion, suggestion.status === SuggestionStatuses.PINNED ? SuggestionStatuses.SHOWN : SuggestionStatuses.PINNED),
    dismiss: (suggestion) => setSuggestionStatus(suggestion, SuggestionStatuses.DISMISSED),
    rateSuggestion: (suggestion: Suggestion, feedback: SuggestionFeedback) =>
      setSuggestions((prev) => prev.map((item) => (item.id === suggestion.id ? { ...item, feedback: item.feedback === feedback ? null : feedback } : item))),
  };

  const getLevel = useCallback((who: "you" | "prospect") => {
    const speaking = speakingRef.current;
    const active = who === "you" ? speaking === Speakers.USER : speaking === Speakers.PROSPECT;
    return active ? 0.55 + Math.random() * 0.45 : 0;
  }, []);

  return { phase, segments, interim, session, elapsedMs, sound, setSound, start, finishNow, getLevel };
};
