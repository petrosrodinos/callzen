import { SuggestionLengths, type SuggestionLength } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const SuggestionLengthFormOptions: { id: SuggestionLength; label: string }[] = [
    { id: SuggestionLengths.SHORT, label: i18n.t("options:agents.length.short") },
    { id: SuggestionLengths.MEDIUM, label: i18n.t("options:agents.length.medium") },
];

export function getSuggestionLengthLabel(value: SuggestionLength | string | null | undefined): string {
    return SuggestionLengthFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
