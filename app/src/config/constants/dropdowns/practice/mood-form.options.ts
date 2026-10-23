import { MoodTypes, type MoodType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const MoodFormOptions: { id: MoodType; label: string }[] = [
    { id: MoodTypes.NEUTRAL, label: "Neutral" },
    { id: MoodTypes.RUSHED, label: "Rushed" },
    { id: MoodTypes.IRRITATED, label: "Irritated" },
    { id: MoodTypes.CURIOUS, label: "Curious" },
    { id: MoodTypes.DISTRACTED, label: "Distracted" },
    { id: MoodTypes.ENTHUSIASTIC, label: "Enthusiastic" },
];

export function getMoodLabel(value: MoodType | string | null | undefined): string {
    return MoodFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
