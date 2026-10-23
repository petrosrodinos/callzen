import { useEffect, useMemo, useRef } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import { Speakers, type TranscriptSegment } from "@/features/calls/interfaces/calls.interfaces";
import { getSpeakerLabel } from "@/config/constants/dropdowns/calls/speaker.options";
import { MARKER_COLORS, type TimelineMarker } from "../utils/timeline.utils";

interface SyncedTranscriptProps {
  segments: TranscriptSegment[];
  markers: TimelineMarker[];
  currentMs: number;
  focusMs: number | null;
  prospectLabel?: string;
  onSeek: (ms: number) => void;
  onFlipSpeaker?: (segment: TranscriptSegment) => void;
}

export function SyncedTranscript({ segments, markers, currentMs, focusMs, prospectLabel, onSeek, onFlipSpeaker }: SyncedTranscriptProps) {
  const refs = useRef(new Map<string, HTMLLIElement>());
  const containerRef = useRef<HTMLOListElement>(null);

  const activeId = useMemo(() => {
    let active: string | null = null;
    for (const segment of segments) {
      if (segment.start_ms <= currentMs + 150) active = segment.id;
      else break;
    }
    return currentMs > 0 ? active : null;
  }, [currentMs, segments]);

  const markersBySegment = useMemo(() => {
    const map = new Map<string, TimelineMarker[]>();
    for (const marker of markers) {
      const segment = [...segments].reverse().find((s) => s.start_ms <= marker.atMs + 50);
      if (!segment) continue;
      map.set(segment.id, [...(map.get(segment.id) ?? []), marker]);
    }
    return map;
  }, [markers, segments]);

  // Follow playback inside the transcript box only (never scroll the whole page).
  const scrollIntoBox = (id: string | null) => {
    const container = containerRef.current;
    const element = id ? refs.current.get(id) : null;
    if (!container || !element) return;
    container.scrollTo({ top: element.offsetTop - container.offsetTop - container.clientHeight / 3, behavior: "smooth" });
  };

  useEffect(() => scrollIntoBox(activeId), [activeId]);

  useEffect(() => {
    if (focusMs === null) return;
    const target = [...segments].reverse().find((s) => s.start_ms <= focusMs + 50) ?? segments[0];
    scrollIntoBox(target?.id ?? null);
  }, [focusMs, segments]);

  if (!segments.length) return <p className="py-8 text-center text-sm text-muted-foreground">No transcript is stored for this call.</p>;

  return (
    <ol ref={containerRef} className="relative max-h-[60vh] space-y-1 overflow-y-auto overscroll-contain pr-1">
      {segments.map((segment) => {
        const isUser = segment.speaker === Speakers.USER;
        const segmentMarkers = markersBySegment.get(segment.id) ?? [];
        return (
          <li
            key={segment.id}
            ref={(element) => {
              if (element) refs.current.set(segment.id, element);
            }}
            className={cn("group flex gap-3 rounded-lg px-2 py-2 transition-colors", activeId === segment.id ? "bg-primary/10" : "hover:bg-muted/60")}
          >
            <button type="button" onClick={() => onSeek(segment.start_ms)} className="w-12 shrink-0 pt-0.5 text-left font-mono text-xs tabular-nums text-muted-foreground hover:text-primary" aria-label={`Play from ${formatClock(segment.start_ms)}`}>
              {formatClock(segment.start_ms)}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold", isUser ? "text-primary" : "text-foreground")}>
                  {segment.speaker === Speakers.PROSPECT && prospectLabel ? prospectLabel : getSpeakerLabel(segment.speaker)}
                </span>
                {segmentMarkers.map((marker) => (
                  <span key={marker.id} title={marker.label} className={cn("size-2 rounded-full", MARKER_COLORS[marker.kind])} />
                ))}
                {onFlipSpeaker && (
                  <button type="button" onClick={() => onFlipSpeaker(segment)} className="ml-auto rounded p-0.5 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Switch speaker" title="Wrong speaker? Switch it">
                    <ArrowLeftRight className="size-3" />
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed">{segment.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
