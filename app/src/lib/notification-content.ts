import i18n from "@/i18n";
import { Routes } from "@/routes/routes";
import { formatDate } from "@/lib/date";
import { NotificationTypes, type AppNotification } from "@/features/notifications/interfaces/notifications.interfaces";

export interface NotificationContent {
    text: string;
    href: string | null;
}

// Notifications store a type and parameters only; the text is built here in the reader's language (§10.1f).
export function getNotificationContent(notification: AppNotification): NotificationContent {
    const p = notification.params ?? {};
    const t = (key: string, options?: Record<string, unknown>) => i18n.t(`notifications:items.${key}`, options);
    const title = p.title ?? t("untitledAssignment");

    switch (notification.type) {
        case NotificationTypes.ASSIGNMENT_NEW:
            return { text: t("assignmentNew", { title }), href: Routes.practice.root };
        case NotificationTypes.ASSIGNMENT_DUE_SOON:
            return {
                text: t("assignmentDueSoon", { title, date: p.due_at ? formatDate(p.due_at) : "" }),
                href: Routes.practice.root,
            };
        case NotificationTypes.ASSIGNMENT_COMPLETED:
            return {
                text: t("assignmentCompleted", { title, count: p.completed_count ?? 1 }),
                href: p.assignment_id ? Routes.coaching.assignment(p.assignment_id) : Routes.coaching.assignments,
            };
        case NotificationTypes.COMMENT_NEW:
            return {
                text: t("commentNew", { name: p.author_name ?? t("someone") }),
                href: p.call_id ? `${Routes.library.detail(p.call_id)}?comment=${p.comment_id ?? ""}` : null,
            };
        case NotificationTypes.COMMENT_REPLY:
            return {
                text: t("commentReply", { name: p.author_name ?? t("someone") }),
                href: p.call_id ? `${Routes.library.detail(p.call_id)}?comment=${p.comment_id ?? ""}` : null,
            };
        case NotificationTypes.COACH_REPORT:
            return {
                text: t("coachReport", { date: p.period_start ? formatDate(p.period_start) : "" }),
                href: p.report_id ? Routes.coaching.report(p.report_id) : Routes.coaching.reports,
            };
        case NotificationTypes.AGENT_SHARED:
            return p.kind === "prospect"
                ? { text: t("prospectShared"), href: p.id ? Routes.practice.start(p.id) : Routes.practice.root }
                : { text: t("copilotShared"), href: Routes.assistant_agents.root };
        case NotificationTypes.BILLING_ALERT: {
            const kinds: Record<string, string> = {
                PAYMENT_FAILED: "billingPaymentFailed",
                TRIAL_ENDING: "billingTrialEnding",
                PAYMENT_ACTION_REQUIRED: "billingActionRequired",
                PLAN_CANCELED: "billingPlanCanceled",
            };
            return { text: t(kinds[String(p.kind)] ?? "billingGeneric"), href: Routes.settings.billing };
        }
        default:
            return { text: t("generic"), href: null };
    }
}
