import { TimelineMarkerKinds, type TimelineMarkerKind } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const TimelineMarkerOptions: { id: TimelineMarkerKind; label: string }[] = [
    { id: TimelineMarkerKinds.MISTAKE, label: i18n.t("options:calls.marker.mistake") },
    { id: TimelineMarkerKinds.STRENGTH, label: i18n.t("options:calls.marker.strength") },
    { id: TimelineMarkerKinds.OBJECTION, label: i18n.t("options:calls.marker.objection") },
    { id: TimelineMarkerKinds.BUYING_SIGNAL, label: i18n.t("options:calls.marker.buyingSignal") },
    { id: TimelineMarkerKinds.BOOKMARK, label: i18n.t("options:calls.marker.bookmark") },
];
