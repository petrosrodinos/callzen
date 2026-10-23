import { UsageKinds, type UsageKind } from "@/features/usage/interfaces/usage.interfaces";

export const UsageKindOptions: { id: UsageKind; label: string }[] = [
    { id: UsageKinds.SUGGESTION, label: "Live suggestions" },
    { id: UsageKinds.ASK, label: "Co-pilot questions" },
    { id: UsageKinds.ANALYSIS, label: "Call analyses" },
    { id: UsageKinds.PRACTICE_TURN, label: "Practice replies (browser voice)" },
    { id: UsageKinds.PRACTICE_VOICE, label: "Practice voice minutes" },
    { id: UsageKinds.TRANSCRIPTION, label: "Live transcription" },
    { id: UsageKinds.GENERATION, label: "Prospect generation" },
];

export function getUsageKindLabel(value: UsageKind | string | null | undefined): string {
    return UsageKindOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
