import { TimelineMarkerKinds, type TimelineMarkerKind } from "@/features/calls/interfaces/calls.interfaces";

export const TimelineMarkerOptions: { id: TimelineMarkerKind; label: string }[] = [
    { id: TimelineMarkerKinds.MISTAKE, label: "Mistakes" },
    { id: TimelineMarkerKinds.STRENGTH, label: "Strengths" },
    { id: TimelineMarkerKinds.OBJECTION, label: "Objections" },
    { id: TimelineMarkerKinds.BUYING_SIGNAL, label: "Buying signals" },
    { id: TimelineMarkerKinds.BOOKMARK, label: "Bookmarks" },
];
