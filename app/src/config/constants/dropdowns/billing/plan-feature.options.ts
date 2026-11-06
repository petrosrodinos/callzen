import i18n from "@/i18n";
import { PlanFeatures, PlanLimitKeys, type PlanFeature } from "@/features/billing/interfaces/billing.interfaces";

export const PlanFeatureOptions: { id: PlanFeature; label: string }[] = [
    { id: PlanFeatures.KNOWLEDGE_DOCUMENT_IMPORT, label: i18n.t("options:billing.feature.knowledgeDocumentImport") },
    { id: PlanFeatures.ORG_ROLES_PERMISSIONS, label: i18n.t("options:billing.feature.orgRolesPermissions") },
    { id: PlanFeatures.ORG_INVITATIONS, label: i18n.t("options:billing.feature.orgInvitations") },
    { id: PlanFeatures.VIEW_ALL_MEMBER_CALLS, label: i18n.t("options:billing.feature.viewAllMemberCalls") },
    { id: PlanFeatures.COHORT_DASHBOARD, label: i18n.t("options:billing.feature.cohortDashboard") },
    { id: PlanFeatures.TOPUP_PURCHASES, label: i18n.t("options:billing.feature.topupPurchases") },
    { id: PlanFeatures.STUDENT_PAGES, label: i18n.t("options:billing.feature.studentPages") },
    { id: PlanFeatures.PRACTICE_ASSIGNMENTS, label: i18n.t("options:billing.feature.practiceAssignments") },
    { id: PlanFeatures.CALL_COMMENTS, label: i18n.t("options:billing.feature.callComments") },
    { id: PlanFeatures.COACH_REPORTS, label: i18n.t("options:billing.feature.coachReports") },
    { id: PlanFeatures.STUDENT_EXPORT, label: i18n.t("options:billing.feature.studentExport") },
    { id: PlanFeatures.AGENT_ACCESS_CONTROL, label: i18n.t("options:billing.feature.agentAccessControl") },
];

export function getPlanFeatureLabel(feature: PlanFeature | string | undefined): string {
    return PlanFeatureOptions.find((option) => option.id === feature)?.label ?? (feature ?? "");
}

// Every limit key editable in the admin plan matrix, including non-count settings.
export const PlanLimitOptions: { id: string; label: string; unit: "minutes" | "count" | "days" | "boolean" }[] = [
    { id: PlanLimitKeys.SEATS_INCLUDED, label: i18n.t("options:billing.limit.seatsIncluded"), unit: "count" },
    { id: "extra_seats_allowed", label: i18n.t("options:billing.limit.extraSeatsAllowed"), unit: "boolean" },
    { id: PlanLimitKeys.LIVE_MINUTES, label: i18n.t("options:billing.limit.liveMinutes"), unit: "minutes" },
    { id: PlanLimitKeys.PRACTICE_MINUTES, label: i18n.t("options:billing.limit.practiceMinutes"), unit: "minutes" },
    { id: "practice_shares_live_pool", label: i18n.t("options:billing.limit.practiceSharesLivePool"), unit: "boolean" },
    { id: "live_minutes_reserved_for_owner_per_period", label: i18n.t("options:billing.limit.liveOwnerReserve"), unit: "minutes" },
    { id: "practice_minutes_reserved_for_owner_per_period", label: i18n.t("options:billing.limit.practiceOwnerReserve"), unit: "minutes" },
    { id: PlanLimitKeys.LIVE_MINUTES_PER_MEMBER, label: i18n.t("options:billing.limit.liveMinutesPerMember"), unit: "minutes" },
    { id: PlanLimitKeys.PRACTICE_MINUTES_PER_MEMBER, label: i18n.t("options:billing.limit.practiceMinutesPerMember"), unit: "minutes" },
    { id: PlanLimitKeys.COPILOTS_MAX, label: i18n.t("options:billing.limit.copilotsMax"), unit: "count" },
    { id: PlanLimitKeys.PRACTICE_PROSPECTS_MAX, label: i18n.t("options:billing.limit.practiceProspectsMax"), unit: "count" },
    { id: PlanLimitKeys.PRACTICE_PROSPECTS_PER_MEMBER_MAX, label: i18n.t("options:billing.limit.practiceProspectsPerMemberMax"), unit: "count" },
    { id: PlanLimitKeys.UPLOADS_PER_PERIOD, label: i18n.t("options:billing.limit.uploadsPerPeriod"), unit: "count" },
    { id: "trial_days", label: i18n.t("options:billing.limit.trialDays"), unit: "days" },
];

export function getPlanLimitLabel(limit: string | undefined): string {
    return PlanLimitOptions.find((option) => option.id === limit)?.label ?? (limit ?? "");
}
