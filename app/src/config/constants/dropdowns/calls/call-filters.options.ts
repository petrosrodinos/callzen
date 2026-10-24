import i18n from "@/i18n";

export const CallSortOptions: { id: string; label: string }[] = [
    { id: "started_at:desc", label: i18n.t("options:calls.sort.newest") },
    { id: "started_at:asc", label: i18n.t("options:calls.sort.oldest") },
    { id: "score:desc", label: i18n.t("options:calls.sort.highestScore") },
    { id: "score:asc", label: i18n.t("options:calls.sort.lowestScore") },
    { id: "duration_seconds:desc", label: i18n.t("options:calls.sort.longest") },
];

export const ScoreRangeFilterOptions: { id: string; label: string; min?: number; max?: number }[] = [
    { id: "all", label: i18n.t("options:calls.scoreRange.any") },
    { id: "80-100", label: i18n.t("options:calls.scoreRange.excellent"), min: 80, max: 100 },
    { id: "60-79", label: i18n.t("options:calls.scoreRange.good"), min: 60, max: 79 },
    { id: "0-59", label: i18n.t("options:calls.scoreRange.below60"), min: 0, max: 59 },
];

export const DateRangeFilterOptions: { id: string; label: string; days?: number }[] = [
    { id: "all", label: i18n.t("options:calls.dateRange.any") },
    { id: "7", label: i18n.t("options:periods.last7Days"), days: 7 },
    { id: "30", label: i18n.t("options:periods.last30Days"), days: 30 },
    { id: "90", label: i18n.t("options:periods.last90Days"), days: 90 },
];

export const DashboardPeriodOptions: { id: string; label: string }[] = [
    { id: "30", label: i18n.t("options:periods.last30Days") },
    { id: "90", label: i18n.t("options:periods.last90Days") },
    { id: "365", label: i18n.t("options:periods.last12Months") },
];
