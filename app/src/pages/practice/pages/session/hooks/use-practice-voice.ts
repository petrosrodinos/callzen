import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCreateRealtimeSession,
  usePracticeTurn,
} from "@/features/calls/hooks/use-calls";
import { exchangeRealtimeSdp } from "@/features/calls/services/realtime-sdp.services";
import {
  Speakers,
  type Call,
} from "@/features/calls/interfaces/calls.interfaces";
import { VoiceProviders } from "@/features/catalog/interfaces/catalog.interfaces";
import {
  RealtimeConnection,
  type RealtimeServerEvent,
} from "@/lib/audio/realtime-connection";
import { CallRecorder } from "@/lib/audio/call-recorder";
import { getMicrophoneStream, stopStream } from "@/lib/audio/media-capture";
import {
  BrowserSpeechRecognizer,
  cancelSpeech,
  speakText,
} from "@/lib/audio/browser-speech";
import { createClientId } from "@/lib/format";
import i18n from "@/i18n";
import type { CopilotSession } from "@/hooks/use-copilot-session";

export type PracticeVoiceStatus =
  "idle" | "connecting" | "live" | "ending" | "ended" | "error";

interface UsePracticeVoiceOptions {
  call: Call | undefined;
  copilot: CopilotSession;
  clock: () => number;
  onProspectHangUp: () => void;
}

const BROWSER_TURN_SILENCE_MS = 1200;

export const usePracticeVoice = ({
  call,
  copilot,
  clock,
  onProspectHangUp,
}: UsePracticeVoiceOptions) => {
  const [status, setStatus] = useState<PracticeVoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prospectSpeaking, setProspectSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [prospectThinking, setProspectThinking] = useState(false);

  const createSession = useCreateRealtimeSession();
  const practiceTurn = usePracticeTurn();

  const micRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<CallRecorder | null>(null);
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const recognizerRef = useRef<BrowserSpeechRecognizer | null>(null);
  const userStarts = useRef(new Map<string, number>());
  const userEnds = useRef(new Map<string, number>());
  const prospectStartRef = useRef<number | null>(null);
  const hangUpPendingRef = useRef(false);
  const bufferRef = useRef<{
    text: string;
    startMs: number;
    endMs: number;
  } | null>(null);
  const turnTimerRef = useRef<number | null>(null);
  const turnBusyRef = useRef(false);
  const startedRef = useRef(false);
  const callbacksRef = useRef({ copilot, onProspectHangUp, clock });
  useEffect(() => {
    callbacksRef.current = { copilot, onProspectHangUp, clock };
  }, [copilot, onProspectHangUp, clock]);

  const isBrowser = call?.practice?.voice_provider === VoiceProviders.BROWSER;

  const finishHangUp = useCallback(() => {
    if (!hangUpPendingRef.current) return;
    hangUpPendingRef.current = false;
    window.setTimeout(() => callbacksRef.current.onProspectHangUp(), 600);
  }, []);

  // ---------- OpenAI Realtime provider ----------
  const handleRealtimeEvent = useCallback(
    (event: RealtimeServerEvent) => {
      const { copilot: session, clock: now } = callbacksRef.current;
      const itemId = String(event.item_id ?? "");
      switch (event.type) {
        case "input_audio_buffer.speech_started":
          userStarts.current.set(itemId, now() - 300);
          setUserSpeaking(true);
          break;
        case "input_audio_buffer.speech_stopped":
          userEnds.current.set(itemId, now());
          setUserSpeaking(false);
          break;
        case "conversation.item.input_audio_transcription.completed": {
          const text = String(event.transcript ?? "").trim();
          const endMs = userEnds.current.get(itemId) ?? now();
          const startMs =
            userStarts.current.get(itemId) ?? Math.max(0, endMs - 2000);
          if (text)
            session.addFinalSegment({
              speaker: Speakers.USER,
              text,
              startMs,
              endMs,
              clientId: `u-${itemId}`,
            });
          break;
        }
        case "output_audio_buffer.started":
          prospectStartRef.current = now();
          setProspectSpeaking(true);
          break;
        case "output_audio_buffer.stopped":
        case "output_audio_buffer.cleared":
          setProspectSpeaking(false);
          finishHangUp();
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done": {
          const text = String(event.transcript ?? "").trim();
          const startMs = prospectStartRef.current ?? now();
          const endMs = Math.max(
            now(),
            startMs + text.split(/\s+/).length * 380,
          );
          if (text)
            session.addFinalSegment({
              speaker: Speakers.PROSPECT,
              text,
              startMs,
              endMs,
              clientId: `p-${itemId}`,
            });
          break;
        }
        case "response.function_call_arguments.done":
          if (event.name === "end_call") {
            hangUpPendingRef.current = true;
            // If no audio is playing, hang up shortly; otherwise wait for the goodbye to finish.
            window.setTimeout(finishHangUp, 4000);
          }
          break;
        case "error": {
          const message = (event.error as { message?: string } | undefined)
            ?.message;
          if (message) console.warn("[CallZen] realtime error:", message);
          break;
        }
        default:
          break;
      }
    },
    [finishHangUp],
  );

  // ---------- Browser provider ----------
  const speakProspect = useCallback(
    async (text: string) => {
      recognizerRef.current?.pause();
      setProspectSpeaking(true);
      try {
        await speakText(text, {
          voiceName: call?.practice?.voice || undefined,
          language: call?.practice?.language ?? "en",
        });
      } finally {
        setProspectSpeaking(false);
        if (!hangUpPendingRef.current) recognizerRef.current?.resume();
      }
    },
    [call?.practice?.language, call?.practice?.voice],
  );

  const runBrowserTurn = useCallback(
    async (userLine?: { text: string; startMs: number; endMs: number }) => {
      if (!call || turnBusyRef.current) return;
      turnBusyRef.current = true;
      setProspectThinking(true);
      const { copilot: session } = callbacksRef.current;
      const clientId = createClientId();
      if (userLine)
        session.addFinalSegment({
          speaker: Speakers.USER,
          text: userLine.text,
          startMs: userLine.startMs,
          endMs: userLine.endMs,
          clientId,
          send: false,
        });

      try {
        const result = await practiceTurn.mutateAsync({
          id: call.id,
          dto: {
            user_text: userLine?.text,
            client_id: clientId,
            start_ms: Math.round(userLine?.startMs ?? 0),
            end_ms: Math.round(userLine?.endMs ?? callbacksRef.current.clock()),
          },
        });
        if (result.user_segment) session.addServerSegment(result.user_segment);
        session.addServerSegment(result.prospect_segment);
        setProspectThinking(false);
        if (result.end_call) hangUpPendingRef.current = true;
        void session.requestSuggestionNow();
        await speakProspect(result.prospect_segment.text);
        finishHangUp();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setProspectThinking(false);
        turnBusyRef.current = false;
      }
    },
    [call, finishHangUp, practiceTurn, speakProspect],
  );

  const queueBrowserPhrase = useCallback(
    (phrase: { text: string; startMs: number; endMs: number }) => {
      const buffer = bufferRef.current;
      bufferRef.current = buffer
        ? {
            text: `${buffer.text} ${phrase.text}`,
            startMs: buffer.startMs,
            endMs: phrase.endMs,
          }
        : phrase;
      if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current);
      turnTimerRef.current = window.setTimeout(() => {
        const line = bufferRef.current;
        bufferRef.current = null;
        setInterim("");
        if (line) void runBrowserTurn(line);
      }, BROWSER_TURN_SILENCE_MS);
    },
    [runBrowserTurn],
  );

  const start = useCallback(async () => {
    if (!call || startedRef.current) return;
    startedRef.current = true;
    setStatus("connecting");
    setError(null);

    try {
      const mic = await getMicrophoneStream();
      micRef.current = mic;
      const recorder = new CallRecorder();
      recorder.addStream("user", mic);
      recorderRef.current = recorder;

      if (isBrowser) {
        const recognizer = new BrowserSpeechRecognizer({
          language: call.practice?.language ?? "en",
          clock: () => callbacksRef.current.clock(),
          onFinal: queueBrowserPhrase,
          onInterim: (text) => {
            setInterim(text);
            setUserSpeaking(!!text);
          },
          onError: (message) => setError(message),
        });
        recognizerRef.current = recognizer;
        await recorder.start(call.keep_recording);
        recognizer.start();
        setStatus("live");
        void runBrowserTurn();
        return;
      }

      const session = await createSession.mutateAsync({
        id: call.id,
        purpose: "PRACTICE_VOICE",
      });
      const connection = new RealtimeConnection({
        track: mic.getAudioTracks()[0],
        playRemoteAudio: true,
        exchangeSdp: (offerSdp) =>
          exchangeRealtimeSdp({
            url: session.webrtc_url,
            clientSecret: session.client_secret,
            offerSdp,
          }),
        onEvent: handleRealtimeEvent,
        onRemoteStream: (stream) => recorder.addStream("prospect", stream),
        onStateChange: (state) => {
          if (state === "failed")
            setError(i18n.t("practice:session.connectionDropped"));
        },
      });
      connectionRef.current = connection;
      await connection.connect();
      await recorder.start(call.keep_recording);
      setStatus("live");
      // The prospect speaks first: picks up the phone or greets you.
      connection.send({ type: "response.create" });
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
      startedRef.current = false;
    }
  }, [
    call,
    createSession,
    handleRealtimeEvent,
    isBrowser,
    queueBrowserPhrase,
    runBrowserTurn,
  ]);

  const sendTypedLine = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || status !== "live") return;
      const now = callbacksRef.current.clock();
      if (isBrowser) {
        void runBrowserTurn({ text: value, startMs: now, endMs: now + 500 });
        return;
      }
      callbacksRef.current.copilot.addFinalSegment({
        speaker: Speakers.USER,
        text: value,
        startMs: now,
        endMs: now + 500,
      });
      connectionRef.current?.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: value }],
        },
      });
      connectionRef.current?.send({ type: "response.create" });
    },
    [isBrowser, runBrowserTurn, status],
  );

  const toggleMic = useCallback(() => {
    const next = !micMuted;
    micRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = !next));
    if (next) recognizerRef.current?.pause();
    else recognizerRef.current?.resume();
    setMicMuted(next);
  }, [micMuted]);

  const teardown = useCallback(async (): Promise<Blob | null> => {
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current);
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    cancelSpeech();
    connectionRef.current?.close();
    connectionRef.current = null;
    const blob = (await recorderRef.current?.stop()) ?? null;
    recorderRef.current = null;
    stopStream(micRef.current);
    micRef.current = null;
    return blob;
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    setStatus("ending");
    const blob = await teardown();
    setStatus("ended");
    return blob;
  }, [teardown]);

  useEffect(
    () => () => {
      void teardown();
    },
    [teardown],
  );

  return {
    status,
    error,
    prospectSpeaking,
    userSpeaking,
    prospectThinking,
    interim,
    micMuted,
    isBrowser,
    start,
    stop,
    toggleMic,
    sendTypedLine,
    getUserLevel: () => recorderRef.current?.getLevel("user") ?? 0,
    getProspectLevel: () => recorderRef.current?.getLevel("prospect") ?? 0,
  };
};
