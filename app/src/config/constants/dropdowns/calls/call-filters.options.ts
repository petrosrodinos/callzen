export const CallSortOptions: { id: string; label: string }[] = [
    { id: "started_at:desc", label: "Newest first" },
    { id: "started_at:asc", label: "Oldest first" },
    { id: "score:desc", label: "Highest score" },
    { id: "score:asc", label: "Lowest score" },
    { id: "duration_seconds:desc", label: "Longest" },
];

export const ScoreRangeFilterOptions: { id: string; label: string; min?: number; max?: number }[] = [
    { id: "all", label: "Any score" },
    { id: "80-100", label: "80+ excellent", min: 80, max: 100 },
    { id: "60-79", label: "60–79 good", min: 60, max: 79 },
    { id: "0-59", label: "Below 60", min: 0, max: 59 },
];

export const DateRangeFilterOptions: { id: string; label: string; days?: number }[] = [
    { id: "all", label: "Any time" },
    { id: "7", label: "Last 7 days", days: 7 },
    { id: "30", label: "Last 30 days", days: 30 },
    { id: "90", label: "Last 90 days", days: 90 },
];

export const DashboardPeriodOptions: { id: string; label: string }[] = [
    { id: "30", label: "Last 30 days" },
    { id: "90", label: "Last 90 days" },
    { id: "365", label: "Last 12 months" },
];
