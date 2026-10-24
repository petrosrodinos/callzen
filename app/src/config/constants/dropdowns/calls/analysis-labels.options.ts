import i18n from "@/i18n";

export const AnalysisSeverityOptions: { id: "LOW" | "MEDIUM" | "HIGH"; label: string }[] = [
    { id: "LOW", label: i18n.t("options:calls.severity.low") },
    { id: "MEDIUM", label: i18n.t("options:calls.severity.medium") },
    { id: "HIGH", label: i18n.t("options:calls.severity.high") },
];

export const InterestLevelOptions: { id: "LOW" | "MEDIUM" | "HIGH"; label: string }[] = [
    { id: "LOW", label: i18n.t("options:calls.interest.low") },
    { id: "MEDIUM", label: i18n.t("options:calls.interest.medium") },
    { id: "HIGH", label: i18n.t("options:calls.interest.high") },
];

export const SuggestionUsageOptions: { id: "FOLLOWED" | "ADAPTED" | "IGNORED"; label: string }[] = [
    { id: "FOLLOWED", label: i18n.t("options:calls.suggestionUsage.followed") },
    { id: "ADAPTED", label: i18n.t("options:calls.suggestionUsage.adapted") },
    { id: "IGNORED", label: i18n.t("options:calls.suggestionUsage.ignored") },
];

export const PracticeRevealKindOptions: { id: "PAIN_POINT" | "HIDDEN_INFO" | "OBJECTION" | "CONVERSION_CONDITION"; label: string }[] = [
    { id: "PAIN_POINT", label: i18n.t("options:calls.revealKind.painPoint") },
    { id: "HIDDEN_INFO", label: i18n.t("options:calls.revealKind.hiddenInfo") },
    { id: "OBJECTION", label: i18n.t("options:calls.revealKind.objection") },
    { id: "CONVERSION_CONDITION", label: i18n.t("options:calls.revealKind.conversionCondition") },
];
