import { SuggestionTypes, type SuggestionType } from "@/features/calls/interfaces/calls.interfaces";

export const SuggestionTypeOptions: { id: SuggestionType; label: string }[] = [
    { id: SuggestionTypes.OPENER, label: "Opener / Hook" },
    { id: SuggestionTypes.DISCOVERY_QUESTION, label: "Discovery question" },
    { id: SuggestionTypes.OBJECTION_RESPONSE, label: "Objection response" },
    { id: SuggestionTypes.VALUE_STATEMENT, label: "Value statement" },
    { id: SuggestionTypes.BUYING_SIGNAL, label: "Buying signal detected" },
    { id: SuggestionTypes.NEXT_STEP, label: "Next step / Close" },
    { id: SuggestionTypes.REMINDER, label: "Reminder" },
    { id: SuggestionTypes.WARNING, label: "Warning" },
    { id: SuggestionTypes.CONSENT, label: "Consent disclosure" },
    { id: SuggestionTypes.ANSWER, label: "Answer" },
];

export function getSuggestionTypeLabel(value: SuggestionType | string | null | undefined): string {
    return SuggestionTypeOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
