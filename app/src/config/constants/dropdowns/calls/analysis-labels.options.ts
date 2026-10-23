export const AnalysisSeverityOptions: { id: "LOW" | "MEDIUM" | "HIGH"; label: string }[] = [
    { id: "LOW", label: "Minor" },
    { id: "MEDIUM", label: "Moderate" },
    { id: "HIGH", label: "Critical" },
];

export const InterestLevelOptions: { id: "LOW" | "MEDIUM" | "HIGH"; label: string }[] = [
    { id: "LOW", label: "Low interest" },
    { id: "MEDIUM", label: "Some interest" },
    { id: "HIGH", label: "High interest" },
];

export const SuggestionUsageOptions: { id: "FOLLOWED" | "ADAPTED" | "IGNORED"; label: string }[] = [
    { id: "FOLLOWED", label: "Followed" },
    { id: "ADAPTED", label: "Adapted" },
    { id: "IGNORED", label: "Ignored" },
];

export const PracticeRevealKindOptions: { id: "PAIN_POINT" | "HIDDEN_INFO" | "OBJECTION" | "CONVERSION_CONDITION"; label: string }[] = [
    { id: "PAIN_POINT", label: "Hidden pain point" },
    { id: "HIDDEN_INFO", label: "Hidden information" },
    { id: "OBJECTION", label: "Planned objection" },
    { id: "CONVERSION_CONDITION", label: "Condition to convert" },
];
