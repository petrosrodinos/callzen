import i18n from "@/i18n";
import {
  TimelineMarkerKinds,
  type Call,
  type TimelineMarkerKind,
} from "@/features/calls/interfaces/calls.interfaces";

export const MARKER_COLORS: Record<TimelineMarkerKind, string> = {
  [TimelineMarkerKinds.MISTAKE]: "bg-red-500",
  [TimelineMarkerKinds.STRENGTH]: "bg-emerald-500",
  [TimelineMarkerKinds.OBJECTION]: "bg-orange-500",
  [TimelineMarkerKinds.BUYING_SIGNAL]: "bg-sky-500",
  [TimelineMarkerKinds.BOOKMARK]: "bg-violet-500",
};

export interface TimelineMarker {
  id: string;
  kind: TimelineMarkerKind;
  atMs: number;
  label: string;
}

export const buildTimelineMarkers = (call: Call): TimelineMarker[] => {
  const markers: TimelineMarker[] = [];
  const analysis = call.analysis;

  analysis?.mistakes.forEach(
    (m, i) =>
      m.at_ms != null &&
      markers.push({
        id: `m${i}`,
        kind: TimelineMarkerKinds.MISTAKE,
        atMs: m.at_ms,
        label: m.title,
      }),
  );
  analysis?.strengths.forEach(
    (s, i) =>
      s.at_ms != null &&
      markers.push({
        id: `s${i}`,
        kind: TimelineMarkerKinds.STRENGTH,
        atMs: s.at_ms,
        label: s.title,
      }),
  );
  analysis?.metrics?.objections?.forEach(
    (o, i) =>
      o.at_ms != null &&
      markers.push({
        id: `o${i}`,
        kind: TimelineMarkerKinds.OBJECTION,
        atMs: o.at_ms,
        label: o.objection,
      }),
  );
  analysis?.metrics?.buying_signals?.forEach(
    (b, i) =>
      b.at_ms != null &&
      markers.push({
        id: `b${i}`,
        kind: TimelineMarkerKinds.BUYING_SIGNAL,
        atMs: b.at_ms,
        label: b.signal,
      }),
  );
  call.bookmarks.forEach((b) =>
    markers.push({
      id: b.id,
      kind: TimelineMarkerKinds.BOOKMARK,
      atMs: b.at_ms,
      label: b.label ?? i18n.t("library:detail.timeline.bookmark"),
    }),
  );

  return markers.sort((a, b) => a.atMs - b.atMs);
};

export const callDurationMs = (call: Call): number => {
  const lastSegment = call.segments.at(-1)?.end_ms ?? 0;
  return Math.max(call.duration_seconds * 1000, lastSegment, 1000);
};
