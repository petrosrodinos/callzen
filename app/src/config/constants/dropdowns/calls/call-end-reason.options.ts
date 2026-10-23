import { CallEndReasons, type CallEndReason } from "@/features/calls/interfaces/calls.interfaces";

export const CallEndReasonOptions: { id: CallEndReason; label: string }[] = [
    { id: CallEndReasons.USER, label: "Ended by you" },
    { id: CallEndReasons.PROSPECT_HUNG_UP, label: "Prospect hung up" },
    { id: CallEndReasons.TIME_LIMIT, label: "Time limit reached" },
    { id: CallEndReasons.INTERRUPTED, label: "Connection interrupted" },
];

export function getCallEndReasonLabel(value: CallEndReason | string | null | undefined): string {
    return CallEndReasonOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
