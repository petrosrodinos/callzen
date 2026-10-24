import { useEffect, useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, VolumeX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCallRecording } from "@/features/calls/hooks/use-calls";

interface RecordingPlayerProps {
  callId: string;
  hasRecording: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTimeUpdate: (ms: number) => void;
  fileName: string;
  uploading?: boolean;
}

export function RecordingPlayer({
  callId,
  hasRecording,
  audioRef,
  onTimeUpdate,
  fileName,
  uploading = false,
}: RecordingPlayerProps) {
  const { t } = useTranslation("library");
  const {
    data: blob,
    isPending,
    isError,
  } = useCallRecording(callId, hasRecording);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  if (!hasRecording && uploading) {
    return (
      <p
        className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" />{" "}
        {t("detail.recording.saving")}
      </p>
    );
  }

  if (!hasRecording) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
        <VolumeX className="size-4" /> {t("detail.recording.noAudio")}
      </p>
    );
  }

  if (isPending) return <Skeleton className="h-12 w-full rounded-full" />;
  if (isError || !url)
    return (
      <p className="text-sm text-destructive">
        {t("detail.recording.loadError")}
      </p>
    );

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={url}
        controls
        preload="metadata"
        className="h-11 w-full min-w-0"
        onTimeUpdate={(event) =>
          onTimeUpdate(event.currentTarget.currentTime * 1000)
        }
      />
      <Button
        asChild
        size="icon"
        variant="ghost"
        className="shrink-0"
        aria-label={t("detail.recording.download")}
      >
        <a href={url} download={fileName}>
          <Download />
        </a>
      </Button>
    </div>
  );
}
