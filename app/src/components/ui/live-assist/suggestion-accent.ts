import { SuggestionTypes, type SuggestionType } from "@/features/calls/interfaces/calls.interfaces";

const ACCENTS: Record<SuggestionType, string> = {
    [SuggestionTypes.OPENER]: "bg-sky-500",
    [SuggestionTypes.DISCOVERY_QUESTION]: "bg-violet-500",
    [SuggestionTypes.OBJECTION_RESPONSE]: "bg-orange-500",
    [SuggestionTypes.VALUE_STATEMENT]: "bg-indigo-500",
    [SuggestionTypes.BUYING_SIGNAL]: "bg-emerald-500",
    [SuggestionTypes.NEXT_STEP]: "bg-teal-500",
    [SuggestionTypes.REMINDER]: "bg-amber-500",
    [SuggestionTypes.WARNING]: "bg-red-500",
    [SuggestionTypes.CONSENT]: "bg-slate-500",
    [SuggestionTypes.ANSWER]: "bg-primary",
};

// Solid accent strip color for the top edge of a suggestion card.
export const getSuggestionAccent = (type: SuggestionType): string => ACCENTS[type] ?? ACCENTS.ANSWER;
