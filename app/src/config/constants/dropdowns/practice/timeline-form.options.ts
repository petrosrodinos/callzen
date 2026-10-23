import { TimelineTypes, type TimelineType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const TimelineFormOptions: { id: TimelineType; label: string }[] = [
    { id: TimelineTypes.URGENT, label: "Urgent need" },
    { id: TimelineTypes.WITHIN_3_MONTHS, label: "Within 3 months" },
    { id: TimelineTypes.JUST_RESEARCHING, label: "Just researching" },
    { id: TimelineTypes.NO_TIMELINE, label: "No timeline" },
];

export function getTimelineLabel(value: TimelineType | string | null | undefined): string {
    return TimelineFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
