import { CallEndReasons, type CallEndReason } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallEndReasonOptions: { id: CallEndReason; label: string }[] = [
    { id: CallEndReasons.USER, label: i18n.t("options:calls.endReason.user") },
    { id: CallEndReasons.PROSPECT_HUNG_UP, label: i18n.t("options:calls.endReason.prospectHungUp") },
    { id: CallEndReasons.TIME_LIMIT, label: i18n.t("options:calls.endReason.timeLimit") },
    { id: CallEndReasons.INTERRUPTED, label: i18n.t("options:calls.endReason.interrupted") },
];

export function getCallEndReasonLabel(value: CallEndReason | string | null | undefined): string {
    return CallEndReasonOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
