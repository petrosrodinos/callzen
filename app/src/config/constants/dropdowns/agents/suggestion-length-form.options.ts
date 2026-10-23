import { SuggestionLengths, type SuggestionLength } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const SuggestionLengthFormOptions: { id: SuggestionLength; label: string }[] = [
    { id: SuggestionLengths.SHORT, label: "Short (up to 20 words)" },
    { id: SuggestionLengths.MEDIUM, label: "Medium (up to 35 words)" },
];

export function getSuggestionLengthLabel(value: SuggestionLength | string | null | undefined): string {
    return SuggestionLengthFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
