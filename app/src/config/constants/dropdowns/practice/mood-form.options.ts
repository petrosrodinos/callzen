import { MoodTypes, type MoodType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const MoodFormOptions: { id: MoodType; label: string }[] = [
    { id: MoodTypes.NEUTRAL, label: i18n.t("options:practice.mood.neutral") },
    { id: MoodTypes.RUSHED, label: i18n.t("options:practice.mood.rushed") },
    { id: MoodTypes.IRRITATED, label: i18n.t("options:practice.mood.irritated") },
    { id: MoodTypes.CURIOUS, label: i18n.t("options:practice.mood.curious") },
    { id: MoodTypes.DISTRACTED, label: i18n.t("options:practice.mood.distracted") },
    { id: MoodTypes.ENTHUSIASTIC, label: i18n.t("options:practice.mood.enthusiastic") },
];

export function getMoodLabel(value: MoodType | string | null | undefined): string {
    return MoodFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
