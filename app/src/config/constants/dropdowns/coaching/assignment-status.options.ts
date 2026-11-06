import i18n from "@/i18n";
import { AssignmentStatuses, type AssignmentStatus } from "@/features/coaching/interfaces/coaching.interfaces";

export const AssignmentStatusOptions: { id: AssignmentStatus; label: string }[] = [
    { id: AssignmentStatuses.OPEN, label: i18n.t("options:coaching.assignmentStatus.open") },
    { id: AssignmentStatuses.OVERDUE, label: i18n.t("options:coaching.assignmentStatus.overdue") },
    { id: AssignmentStatuses.COMPLETED, label: i18n.t("options:coaching.assignmentStatus.completed") },
    { id: AssignmentStatuses.ARCHIVED, label: i18n.t("options:coaching.assignmentStatus.archived") },
];

export const AssignmentStatusFilterOptions: { id: AssignmentStatus | "all"; label: string }[] = [
    { id: "all", label: i18n.t("options:coaching.assignmentStatus.all") },
    ...AssignmentStatusOptions,
];

export function getAssignmentStatusLabel(status: AssignmentStatus | string): string {
    return AssignmentStatusOptions.find((option) => option.id === status)?.label ?? String(status);
}

export const CohortPeriodOptions: { id: string; label: string }[] = [
    { id: "7", label: i18n.t("options:periods.last7Days") },
    { id: "30", label: i18n.t("options:periods.last30Days") },
    { id: "90", label: i18n.t("options:periods.last90Days") },
];
