import { TimelineTypes, type TimelineType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const TimelineFormOptions: { id: TimelineType; label: string }[] = [
    { id: TimelineTypes.URGENT, label: i18n.t("options:practice.timeline.urgent") },
    { id: TimelineTypes.WITHIN_3_MONTHS, label: i18n.t("options:practice.timeline.within3Months") },
    { id: TimelineTypes.JUST_RESEARCHING, label: i18n.t("options:practice.timeline.justResearching") },
    { id: TimelineTypes.NO_TIMELINE, label: i18n.t("options:practice.timeline.none") },
];

export function getTimelineLabel(value: TimelineType | string | null | undefined): string {
    return TimelineFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
