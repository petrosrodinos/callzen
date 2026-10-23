import { useCallback, useEffect, useRef, useState } from "react";
import { useCreateRealtimeSession } from "@/features/calls/hooks/use-calls";
import { exchangeRealtimeSdp } from "@/features/calls/services/realtime-sdp.services";
import { AUTO_LANGUAGE, CallTypes, Speakers, type Call, type Speaker } from "@/features/calls/interfaces/calls.interfaces";
import { CallRecorder } from "@/lib/audio/call-recorder";
import { RealtimeTranscriber } from "@/lib/audio/realtime-transcriber";
import { BrowserSpeechRecognizer, isSpeechRecognitionSupported } from "@/lib/audio/browser-speech";
import { getMicrophoneStream, getTabAudioStream, stopStream } from "@/lib/audio/media-capture";
import { takePendingCapture } from "@/lib/audio/pending-capture";
import type { CopilotSession } from "@/hooks/use-copilot-session";

export type CaptureStatus = "needs-audio" | "connecting" | "live" | "paused" | "interrupted" | "stopped";
export type TranscriptionEngine = "realtime" | "browser" | "manual";

interface UseLiveCaptureOptions {
  call: Call | undefined;
  copilot: CopilotSession;
  clock: { now: () => number; start: () => void; pause: () => void; resume: () => void; stop: () => void };
}

interface Channel {
  speaker: Speaker;
  stream: MediaStream;
  transcriber: RealtimeTranscriber | null;
  recognizer: BrowserSpeechRecognizer | null;
}

export const useLiveCapture = ({ call, copilot, clock }: UseLiveCaptureOptions) => {
  const [status, setStatus] = useState<CaptureStatus>("needs-audio");
  const [engine, setEngine] = useState<TranscriptionEngine>("realtime");
  const [notice, setNotice] = useState<string | null>(null);
  const [interim, setInterim] = useState<Record<string, string>>({});
  const createSession = useCreateRealtimeSession();

  const recorderRef = useRef<CallRecorder | null>(null);
  const channelsRef = useRef<Channel[]>([]);
  const startedRef = useRef(false);
  const callbacksRef = useRef({ copilot, clock });
  useEffect(() => {
    callbacksRef.current = { copilot, clock };
  }, [copilot, clock]);

  const isMeeting = call?.call_type === CallTypes.ONLINE_MEETING;

  const onPhrase = useCallback((speaker: Speaker, phrase: { id?: string; text: string; startMs: number; endMs: number }) => {
    callbacksRef.current.copilot.addFinalSegment({
      speaker,
      text: phrase.text,
      startMs: phrase.startMs,
      endMs: phrase.endMs,
      clientId: phrase.id ? `${speaker}-${phrase.id}` : undefined,
    });
  }, []);

  const startBrowserFallback = useCallback(
    (channel: Channel) => {
      if (!call || !isSpeechRecognitionSupported()) return false;
      const recognizer = new BrowserSpeechRecognizer({
        language: call.language === AUTO_LANGUAGE ? (call.agent_snapshot?.language ?? "en") : call.language,
        clock: () => callbacksRef.current.clock.now(),
        onFinal: (phrase) => onPhrase(channel.speaker, phrase),
        onInterim: (text) => setInterim((prev) => ({ ...prev, [channel.speaker]: text })),
        onError: (message) => setNotice(message),
      });
      recognizer.start();
      channel.recognizer = recognizer;
      return true;
    },
    [call, onPhrase],
  );

  const startChannel = useCallback(
    async (channel: Channel) => {
      if (!call) return;
      const transcriber = new RealtimeTranscriber({
        track: channel.stream.getAudioTracks()[0],
        clock: () => callbacksRef.current.clock.now(),
        createSession: () => createSession.mutateAsync({ id: call.id, purpose: "TRANSCRIPTION" }),
        exchangeSdp: exchangeRealtimeSdp,
        onPhrase: (phrase) => onPhrase(channel.speaker, phrase),
        onInterim: (text) => setInterim((prev) => ({ ...prev, [channel.speaker]: text })),
        onStatus: (state) => {
          if (state === "reconnecting") setNotice("Transcription connection dropped. Reconnecting…");
          if (state === "live") setNotice(null);
          if (state === "failed") {
            setNotice("Live transcription is unavailable. Switched to your browser's speech recognition.");
            if (startBrowserFallback(channel)) setEngine("browser");
            else setEngine("manual");
          }
        },
      });
      channel.transcriber = transcriber;
      try {
        await transcriber.start();
      } catch {
        transcriber.stop();
        channel.transcriber = null;
        // Browser speech recognition can only hear the microphone, not a shared tab.
        if (channel.speaker !== Speakers.PROSPECT && startBrowserFallback(channel)) {
          setEngine("browser");
          setNotice("AI transcription is unavailable, so your browser's speech recognition is being used instead. Speaker detection may be less accurate.");
        } else {
          setEngine("manual");
          setNotice("Transcription is unavailable for this audio. Add key lines manually so the co-pilot can still help.");
        }
      }
    },
    [call, createSession, onPhrase, startBrowserFallback],
  );

  const watchTrack = useCallback((stream: MediaStream, label: string) => {
    stream.getAudioTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        if (!startedRef.current) return;
        setStatus("interrupted");
        setNotice(`${label} audio stopped (the tab was closed or the device disconnected). What was captured is safe. Reconnect to continue.`);
      });
    });
  }, []);

  const begin = useCallback(
    async (streams: { microphone: MediaStream; remote: MediaStream | null }) => {
      if (!call) return;
      setStatus("connecting");
      const recorder = recorderRef.current ?? new CallRecorder();
      recorderRef.current = recorder;
      recorder.addStream("user", streams.microphone);
      if (streams.remote) recorder.addStream("prospect", streams.remote);
      watchTrack(streams.microphone, "Microphone");
      if (streams.remote) watchTrack(streams.remote, "Meeting");

      const channels: Channel[] = streams.remote
        ? [
            { speaker: Speakers.USER, stream: streams.microphone, transcriber: null, recognizer: null },
            { speaker: Speakers.PROSPECT, stream: streams.remote, transcriber: null, recognizer: null },
          ]
        : [{ speaker: Speakers.UNKNOWN, stream: streams.microphone, transcriber: null, recognizer: null }];
      channelsRef.current = channels;

      if (!startedRef.current) {
        await recorder.start(call.keep_recording);
        callbacksRef.current.clock.start();
        startedRef.current = true;
      } else {
        callbacksRef.current.clock.resume();
      }
      setStatus("live");
      await Promise.all(channels.map((channel) => startChannel(channel)));
    },
    [call, startChannel, watchTrack],
  );

  // Pick up the streams captured on the setup screen.
  useEffect(() => {
    if (!call || startedRef.current) return;
    const pending = takePendingCapture(call.id);
    // Starting capture subscribes to external media/WebRTC systems; state updates come from them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending) void begin(pending);
  }, [begin, call]);

  const stopChannels = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      channel.transcriber?.stop();
      channel.recognizer?.stop();
      stopStream(channel.stream);
    });
    channelsRef.current = [];
  }, []);

  // Re-acquire audio after a reload or an interruption (needs a click for tab sharing).
  const reconnect = useCallback(async () => {
    try {
      stopChannels();
      const remote = isMeeting ? await getTabAudioStream() : null;
      const microphone = await getMicrophoneStream();
      if (recorderRef.current) {
        recorderRef.current.removeStream("user");
        recorderRef.current.removeStream("prospect");
      }
      setNotice(null);
      await begin({ microphone, remote });
    } catch (error) {
      setNotice((error as Error).message);
      setStatus(startedRef.current ? "interrupted" : "needs-audio");
    }
  }, [begin, isMeeting, stopChannels]);

  const pause = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      channel.stream.getAudioTracks().forEach((track) => (track.enabled = false));
      channel.recognizer?.pause();
    });
    recorderRef.current?.pause();
    callbacksRef.current.clock.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      channel.stream.getAudioTracks().forEach((track) => (track.enabled = true));
      channel.recognizer?.resume();
    });
    recorderRef.current?.resume();
    callbacksRef.current.clock.resume();
    setStatus("live");
  }, []);

  const addManualLine = useCallback((speaker: Speaker, text: string) => {
    const now = callbacksRef.current.clock.now();
    callbacksRef.current.copilot.addFinalSegment({ speaker, text, startMs: now, endMs: now + 1000 });
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    stopChannels();
    const blob = (await recorderRef.current?.stop()) ?? null;
    recorderRef.current = null;
    callbacksRef.current.clock.stop();
    setStatus("stopped");
    return blob;
  }, [stopChannels]);

  useEffect(
    () => () => {
      stopChannels();
      void recorderRef.current?.stop();
    },
    [stopChannels],
  );

  return {
    status,
    engine,
    notice,
    interim: Object.entries(interim).map(([speaker, text]) => ({ speaker, text })),
    isMeeting,
    reconnect,
    pause,
    resume,
    stop,
    addManualLine,
    dismissNotice: () => setNotice(null),
    getLevel: (key: "user" | "prospect") => recorderRef.current?.getLevel(key) ?? 0,
  };
};
