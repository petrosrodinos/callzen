import i18n from "@/i18n";

export const UsagePeriodOptions: { id: string; label: string }[] = [
    { id: "7", label: i18n.t("options:periods.last7Days") },
    { id: "30", label: i18n.t("options:periods.last30Days") },
    { id: "90", label: i18n.t("options:periods.last90Days") },
    { id: "365", label: i18n.t("options:periods.last12Months") },
];
