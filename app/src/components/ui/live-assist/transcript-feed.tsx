import { useEffect, useRef } from "react";
import { ArrowLeftRight, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import { Speakers } from "@/features/calls/interfaces/calls.interfaces";
import { getSpeakerLabel } from "@/config/constants/dropdowns/calls/speaker.options";
import type { LiveSegment } from "@/hooks/use-copilot-session";

interface TranscriptFeedProps {
  segments: LiveSegment[];
  interim?: { speaker: string; text: string }[];
  prospectLabel?: string;
  onFlipSpeaker?: (segment: LiveSegment) => void;
  emptyText?: string;
  className?: string;
}

export function TranscriptFeed({ segments, interim = [], prospectLabel, onFlipSpeaker, emptyText = "The transcript will appear here as people speak.", className }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [segments.length, interim]);

  const visibleInterim = interim.filter((item) => item.text);

  return (
    <div
      ref={containerRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      }}
      className={cn("space-y-3 overflow-y-auto overscroll-contain", className)}
      aria-live="polite"
    >
      {!segments.length && !visibleInterim.length && <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>}
      {segments.map((segment) => {
        const isUser = segment.speaker === Speakers.USER;
        const label = segment.speaker === Speakers.PROSPECT && prospectLabel ? prospectLabel : getSpeakerLabel(segment.speaker);
        return (
          <div key={segment.client_id} className={cn("group flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums">{formatClock(segment.start_ms)}</span>
              {segment.pending && <CloudOff className="size-3" aria-label="Not saved yet" />}
              {onFlipSpeaker && segment.id && (
                <button
                  type="button"
                  onClick={() => onFlipSpeaker(segment)}
                  className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Switch speaker"
                  title="Wrong speaker? Switch it"
                >
                  <ArrowLeftRight className="size-3" />
                </button>
              )}
            </div>
            <p
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                isUser ? "rounded-br-sm bg-primary text-primary-foreground" : segment.speaker === Speakers.UNKNOWN ? "rounded-bl-sm bg-muted/60 italic" : "rounded-bl-sm bg-muted",
              )}
            >
              {segment.text}
            </p>
          </div>
        );
      })}
      {visibleInterim.map((item) => (
        <div key={item.speaker} className={cn("flex", item.speaker === Speakers.USER ? "justify-end" : "justify-start")}>
          <p className="max-w-[90%] rounded-2xl border border-dashed px-3 py-2 text-sm text-muted-foreground">{item.text}…</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
