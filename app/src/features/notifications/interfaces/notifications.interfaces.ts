export const NotificationTypes = {
    ASSIGNMENT_NEW: "ASSIGNMENT_NEW",
    ASSIGNMENT_DUE_SOON: "ASSIGNMENT_DUE_SOON",
    ASSIGNMENT_COMPLETED: "ASSIGNMENT_COMPLETED",
    COMMENT_NEW: "COMMENT_NEW",
    COMMENT_REPLY: "COMMENT_REPLY",
    COACH_REPORT: "COACH_REPORT",
    AGENT_SHARED: "AGENT_SHARED",
    BILLING_ALERT: "BILLING_ALERT",
} as const;
export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const BillingAlertKinds = {
    PAYMENT_FAILED: "PAYMENT_FAILED",
    TRIAL_ENDING: "TRIAL_ENDING",
    PAYMENT_ACTION_REQUIRED: "PAYMENT_ACTION_REQUIRED",
    PLAN_CANCELED: "PLAN_CANCELED",
} as const;
export type BillingAlertKind = (typeof BillingAlertKinds)[keyof typeof BillingAlertKinds];

// Ids and numbers only; the text is rendered from i18n keys in the reader's language.
export interface NotificationParams {
    assignment_id?: string;
    title?: string;
    due_at?: string;
    user_id?: string;
    completed_count?: number;
    call_id?: string;
    comment_id?: string;
    thread_id?: string;
    at_ms?: number | null;
    author_id?: string;
    author_name?: string;
    report_id?: string;
    period_start?: string;
    kind?: "copilot" | "prospect" | BillingAlertKind;
    id?: string;
    [key: string]: unknown;
}

export interface AppNotification {
    id: string;
    organisation_id: string;
    user_id: string;
    type: NotificationType;
    params: NotificationParams;
    read_at: string | null;
    created_at: string;
}

export interface NotificationList {
    data: AppNotification[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface UnreadCount {
    count: number;
    other_organisations: { organisation_id: string; count: number }[];
}

export interface NotificationsQuery {
    page?: number;
    limit?: number;
    unread?: boolean;
}
