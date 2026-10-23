import { CallStatuses, type CallStatus } from "@/features/calls/interfaces/calls.interfaces";

export const CallStatusOptions: { id: CallStatus; label: string }[] = [
    { id: CallStatuses.IN_PROGRESS, label: "In progress" },
    { id: CallStatuses.ANALYZING, label: "Analyzing" },
    { id: CallStatuses.ANALYZED, label: "Analyzed" },
    { id: CallStatuses.ANALYSIS_FAILED, label: "Analysis failed" },
    { id: CallStatuses.ENDED, label: "Not analyzed" },
];

export function getCallStatusLabel(value: CallStatus | string | null | undefined): string {
    return CallStatusOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
