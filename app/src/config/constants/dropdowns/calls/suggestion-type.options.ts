import { SuggestionTypes, type SuggestionType } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const SuggestionTypeOptions: { id: SuggestionType; label: string }[] = [
    { id: SuggestionTypes.OPENER, label: i18n.t("options:calls.suggestionType.opener") },
    { id: SuggestionTypes.DISCOVERY_QUESTION, label: i18n.t("options:calls.suggestionType.discoveryQuestion") },
    { id: SuggestionTypes.OBJECTION_RESPONSE, label: i18n.t("options:calls.suggestionType.objectionResponse") },
    { id: SuggestionTypes.VALUE_STATEMENT, label: i18n.t("options:calls.suggestionType.valueStatement") },
    { id: SuggestionTypes.BUYING_SIGNAL, label: i18n.t("options:calls.suggestionType.buyingSignal") },
    { id: SuggestionTypes.NEXT_STEP, label: i18n.t("options:calls.suggestionType.nextStep") },
    { id: SuggestionTypes.REMINDER, label: i18n.t("options:calls.suggestionType.reminder") },
    { id: SuggestionTypes.WARNING, label: i18n.t("options:calls.suggestionType.warning") },
    { id: SuggestionTypes.CONSENT, label: i18n.t("options:calls.suggestionType.consent") },
    { id: SuggestionTypes.ANSWER, label: i18n.t("options:calls.suggestionType.answer") },
];

export function getSuggestionTypeLabel(value: SuggestionType | string | null | undefined): string {
    return SuggestionTypeOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
