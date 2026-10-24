import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMicrophoneStream, stopStream } from "@/lib/audio/media-capture";
import { AudioLevelMeter } from "./audio-level-meter";

// Lets people confirm microphone permission and levels before a call starts.
export function MicCheck() {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(
    () => () => {
      stopStream(streamRef.current);
      void contextRef.current?.close();
    },
    [],
  );

  const test = async () => {
    try {
      const stream = await getMicrophoneStream();
      streamRef.current = stream;
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      contextRef.current = context;
      analyserRef.current = analyser;
      setStatus("ok");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  };

  const getLevel = () => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / data.length) * 4);
  };

  if (status === "ok") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
        <CheckCircle2 className="size-4 text-emerald-600" />
        {t("micCheck.ready")}
        <AudioLevelMeter getLevel={getLevel} label={t("micCheck.speak")} className="ml-auto" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center">
      <span className="flex items-center gap-2 text-muted-foreground">
        {status === "error" ? <MicOff className="size-4 text-destructive" /> : <Mic className="size-4" />}
        {status === "error" ? error : t("micCheck.prompt")}
      </span>
      <Button type="button" size="sm" variant="outline" className="sm:ml-auto" onClick={() => void test()}>
        {t("micCheck.test")}
      </Button>
    </div>
  );
}
