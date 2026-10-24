import { CallStatuses, type CallStatus } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallStatusOptions: { id: CallStatus; label: string }[] = [
    { id: CallStatuses.IN_PROGRESS, label: i18n.t("options:calls.status.inProgress") },
    { id: CallStatuses.ANALYZING, label: i18n.t("options:calls.status.analyzing") },
    { id: CallStatuses.ANALYZED, label: i18n.t("options:calls.status.analyzed") },
    { id: CallStatuses.ANALYSIS_FAILED, label: i18n.t("options:calls.status.analysisFailed") },
    { id: CallStatuses.ENDED, label: i18n.t("options:calls.status.ended") },
];

export function getCallStatusLabel(value: CallStatus | string | null | undefined): string {
    return CallStatusOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
