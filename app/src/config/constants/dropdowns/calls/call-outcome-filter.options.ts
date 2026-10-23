import type { CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import { CallOutcomeFormOptions } from "@/config/constants/dropdowns/calls/call-outcome-form.options";

export const CallOutcomeFilterOptions: { id: CallOutcome | "NONE" | "all"; label: string }[] = [
    { id: "all", label: "All outcomes" },
    ...CallOutcomeFormOptions,
    { id: "NONE", label: "No outcome recorded" },
];
