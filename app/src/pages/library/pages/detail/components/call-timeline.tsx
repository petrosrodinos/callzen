import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TimelineMarkerOptions } from "@/config/constants/dropdowns/calls/timeline-marker.options";
import { MARKER_COLORS, type TimelineMarker } from "../utils/timeline.utils";

interface CallTimelineProps {
  markers: TimelineMarker[];
  durationMs: number;
  currentMs: number;
  onSeek: (ms: number) => void;
}

export function CallTimeline({
  markers,
  durationMs,
  currentMs,
  onSeek,
}: CallTimelineProps) {
  const { t } = useTranslation("library");
  const progress = Math.min(100, (currentMs / durationMs) * 100);
  const presentKinds = TimelineMarkerOptions.filter((option) =>
    markers.some((marker) => marker.kind === option.id),
  );

  return (
    <div className="space-y-2">
      <div
        className="relative h-8 cursor-pointer rounded-md bg-muted"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onSeek(((event.clientX - rect.left) / rect.width) * durationMs);
        }}
        role="slider"
        aria-label={t("detail.timeline.label")}
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1000)}
        aria-valuenow={Math.round(currentMs / 1000)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight")
            onSeek(Math.min(durationMs, currentMs + 5000));
          if (event.key === "ArrowLeft") onSeek(Math.max(0, currentMs - 5000));
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-md bg-primary/15"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-primary"
          style={{ left: `${progress}%` }}
        />
        {markers.map((marker) => (
          <Tooltip key={marker.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-transform hover:scale-150",
                  MARKER_COLORS[marker.kind],
                )}
                style={{
                  left: `${Math.min(99, (marker.atMs / durationMs) * 100)}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSeek(marker.atMs);
                }}
                aria-label={t("detail.timeline.markerAt", {
                  label: marker.label,
                  time: formatClock(marker.atMs),
                })}
              />
            </TooltipTrigger>
            <TooltipContent>
              {formatClock(marker.atMs)} · {marker.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      {presentKinds.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {presentKinds.map((option) => (
            <span key={option.id} className="inline-flex items-center gap-1.5">
              <span
                className={cn("size-2 rounded-full", MARKER_COLORS[option.id])}
              />{" "}
              {option.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
