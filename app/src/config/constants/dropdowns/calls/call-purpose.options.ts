import { CallPurposes, type CallPurpose } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallPurposeFilterOptions: { id: CallPurpose | "all"; label: string }[] = [
    { id: "all", label: i18n.t("options:calls.purposeFilter.all") },
    { id: CallPurposes.SALES, label: i18n.t("options:calls.purpose.sales") },
    { id: CallPurposes.COLD_CALL, label: i18n.t("options:calls.purpose.coldCall") },
];
