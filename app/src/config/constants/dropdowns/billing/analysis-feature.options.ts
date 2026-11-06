import i18n from "@/i18n";

export const AnalysisFeatureKeys = {
    OVERVIEW: "overview",
    CATEGORY_SCORES: "category_scores",
    MOMENTS: "moments",
    IMPROVEMENTS: "improvements",
    METRICS: "metrics",
    PROSPECT_INSIGHTS: "prospect_insights",
    NEXT_STEPS: "next_steps",
    FOLLOW_UP_DRAFT: "follow_up_draft",
    PRACTICE_REVEAL: "practice_reveal",
    COPILOT_USAGE: "copilot_usage",
    SUGGESTED_PRACTICE: "suggested_practice",
} as const;
export type AnalysisFeatureKey = (typeof AnalysisFeatureKeys)[keyof typeof AnalysisFeatureKeys];

export const AnalysisFeatureOptions: { id: AnalysisFeatureKey; label: string; description: string }[] = [
    { id: "overview", label: i18n.t("options:billing.analysis.overview"), description: i18n.t("options:billing.analysisHint.overview") },
    { id: "category_scores", label: i18n.t("options:billing.analysis.categoryScores"), description: i18n.t("options:billing.analysisHint.categoryScores") },
    { id: "moments", label: i18n.t("options:billing.analysis.moments"), description: i18n.t("options:billing.analysisHint.moments") },
    { id: "improvements", label: i18n.t("options:billing.analysis.improvements"), description: i18n.t("options:billing.analysisHint.improvements") },
    { id: "metrics", label: i18n.t("options:billing.analysis.metrics"), description: i18n.t("options:billing.analysisHint.metrics") },
    { id: "prospect_insights", label: i18n.t("options:billing.analysis.prospectInsights"), description: i18n.t("options:billing.analysisHint.prospectInsights") },
    { id: "next_steps", label: i18n.t("options:billing.analysis.nextSteps"), description: i18n.t("options:billing.analysisHint.nextSteps") },
    { id: "follow_up_draft", label: i18n.t("options:billing.analysis.followUpDraft"), description: i18n.t("options:billing.analysisHint.followUpDraft") },
    { id: "practice_reveal", label: i18n.t("options:billing.analysis.practiceReveal"), description: i18n.t("options:billing.analysisHint.practiceReveal") },
    { id: "copilot_usage", label: i18n.t("options:billing.analysis.copilotUsage"), description: i18n.t("options:billing.analysisHint.copilotUsage") },
    { id: "suggested_practice", label: i18n.t("options:billing.analysis.suggestedPractice"), description: i18n.t("options:billing.analysisHint.suggestedPractice") },
];

export function getAnalysisFeatureLabel(feature: AnalysisFeatureKey | string): string {
    return AnalysisFeatureOptions.find((option) => option.id === feature)?.label ?? feature;
}
