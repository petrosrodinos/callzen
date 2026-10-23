import { SuggestionFrequencies, type SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const SuggestionFrequencyFormOptions: { id: SuggestionFrequency; label: string }[] = [
    { id: SuggestionFrequencies.OBJECTIONS_ONLY, label: "Only objections & questions" },
    { id: SuggestionFrequencies.BALANCED, label: "Balanced" },
    { id: SuggestionFrequencies.CONSTANT, label: "Constant guidance" },
];

export function getSuggestionFrequencyLabel(value: SuggestionFrequency | string | null | undefined): string {
    return SuggestionFrequencyFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const SuggestionFrequencyDescriptionOptions: Record<SuggestionFrequency, string> = {
    [SuggestionFrequencies.OBJECTIONS_ONLY]: "Stays quiet until the prospect objects, asks something or shows interest.",
    [SuggestionFrequencies.BALANCED]: "Reacts to everything meaningful the prospect says, plus occasional nudges.",
    [SuggestionFrequencies.CONSTANT]: "Always shows the next best line. Great for new reps and practice.",
};
