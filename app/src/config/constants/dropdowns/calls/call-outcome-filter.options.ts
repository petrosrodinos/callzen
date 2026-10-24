import type { CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import { CallOutcomeFormOptions } from "@/config/constants/dropdowns/calls/call-outcome-form.options";
import i18n from "@/i18n";

export const CallOutcomeFilterOptions: { id: CallOutcome | "NONE" | "all"; label: string }[] = [
    { id: "all", label: i18n.t("options:calls.outcomeFilter.all") },
    ...CallOutcomeFormOptions,
    { id: "NONE", label: i18n.t("options:calls.outcomeFilter.none") },
];
