import { useEffect, useMemo, type RefObject } from "react";
import { Download, VolumeX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCallRecording } from "@/features/calls/hooks/use-calls";

interface RecordingPlayerProps {
  callId: string;
  hasRecording: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTimeUpdate: (ms: number) => void;
  fileName: string;
}

export function RecordingPlayer({ callId, hasRecording, audioRef, onTimeUpdate, fileName }: RecordingPlayerProps) {
  const { data: blob, isPending, isError } = useCallRecording(callId, hasRecording);
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  if (!hasRecording) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
        <VolumeX className="size-4" /> No audio stored for this call. Transcript and analysis are kept.
      </p>
    );
  }

  if (isPending) return <Skeleton className="h-12 w-full rounded-full" />;
  if (isError || !url) return <p className="text-sm text-destructive">The recording could not be loaded. It may still be uploading; refresh in a moment.</p>;

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} controls preload="metadata" className="h-11 w-full min-w-0" onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime * 1000)} />
      <Button asChild size="icon" variant="ghost" className="shrink-0" aria-label="Download recording">
        <a href={url} download={fileName}>
          <Download />
        </a>
      </Button>
    </div>
  );
}
