import { SuggestionFrequencies, type SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const SuggestionFrequencyFormOptions: { id: SuggestionFrequency; label: string }[] = [
    { id: SuggestionFrequencies.OBJECTIONS_ONLY, label: i18n.t("options:agents.frequency.objectionsOnly") },
    { id: SuggestionFrequencies.BALANCED, label: i18n.t("options:agents.frequency.balanced") },
    { id: SuggestionFrequencies.CONSTANT, label: i18n.t("options:agents.frequency.constant") },
];

export function getSuggestionFrequencyLabel(value: SuggestionFrequency | string | null | undefined): string {
    return SuggestionFrequencyFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const SuggestionFrequencyDescriptionOptions: Record<SuggestionFrequency, string> = {
    [SuggestionFrequencies.OBJECTIONS_ONLY]: i18n.t("options:agents.frequencyDescription.objectionsOnly"),
    [SuggestionFrequencies.BALANCED]: i18n.t("options:agents.frequencyDescription.balanced"),
    [SuggestionFrequencies.CONSTANT]: i18n.t("options:agents.frequencyDescription.constant"),
};
