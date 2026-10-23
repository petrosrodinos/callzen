import { CallOutcomes, type CallOutcome } from "@/features/calls/interfaces/calls.interfaces";

export const CallOutcomeFormOptions: { id: CallOutcome; label: string }[] = [
    { id: CallOutcomes.MEETING_BOOKED, label: "Meeting / demo booked" },
    { id: CallOutcomes.DEAL_WON, label: "Deal closed / won" },
    { id: CallOutcomes.FOLLOW_UP, label: "Follow-up scheduled" },
    { id: CallOutcomes.LOST, label: "Not interested / lost" },
    { id: CallOutcomes.NO_DECISION, label: "No decision / callback" },
    { id: CallOutcomes.GATEKEEPER, label: "Gatekeeper / wrong person" },
    { id: CallOutcomes.CUSTOM, label: "Custom outcome" },
];

export function getCallOutcomeLabel(value: CallOutcome | string | null | undefined): string {
    return CallOutcomeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
