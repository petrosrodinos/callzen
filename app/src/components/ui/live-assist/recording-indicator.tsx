import { cn } from "@/lib/utils";

interface RecordingIndicatorProps {
  state: "recording" | "paused" | "listening" | "off" | "connecting";
  className?: string;
}

const LABELS: Record<RecordingIndicatorProps["state"], string> = {
  recording: "Recording",
  listening: "Listening · not recorded",
  paused: "Paused",
  off: "Not capturing",
  connecting: "Connecting…",
};

export function RecordingIndicator({ state, className }: RecordingIndicatorProps) {
  const active = state === "recording" || state === "listening";
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
        state === "recording" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        state === "listening" && "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        state === "paused" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        (state === "off" || state === "connecting") && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="relative flex size-2.5">
        {active && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", state === "recording" ? "bg-red-500" : "bg-sky-500")} />}
        <span
          className={cn(
            "relative inline-flex size-2.5 rounded-full",
            state === "recording" && "bg-red-500",
            state === "listening" && "bg-sky-500",
            state === "paused" && "bg-amber-500",
            (state === "off" || state === "connecting") && "bg-muted-foreground/50",
          )}
        />
      </span>
      {LABELS[state]}
    </span>
  );
}
