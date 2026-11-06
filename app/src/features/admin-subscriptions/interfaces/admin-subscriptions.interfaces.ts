import type {
    BillingInterval,
    BillingInvoice,
    BillingInvoiceKind,
    PlanFeatureValues,
    PlanKey,
    PlanLimits,
    SubscriptionEvent,
    SubscriptionSource,
    SubscriptionStatus,
} from "@/features/billing/interfaces/billing.interfaces";

export interface PersonRef {
    id: string;
    name: string;
    email: string;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export const AdminSubscriptionSortKeys = {
    CREATED_AT: "created_at",
    NAME: "name",
    MRR: "mrr",
    MARGIN: "margin",
    AI_COST: "ai_cost",
    MINUTES_USED: "minutes_used",
} as const;
export type AdminSubscriptionSortKey = (typeof AdminSubscriptionSortKeys)[keyof typeof AdminSubscriptionSortKeys];

export interface AdminSubscriptionsQuery {
    page?: number;
    limit?: number;
    search?: string;
    plan?: PlanKey;
    status?: SubscriptionStatus;
    source?: SubscriptionSource;
    cancelling?: boolean;
    past_due?: boolean;
    no_subscription?: boolean;
    trial_ending_days?: number;
    margin_below?: number;
    order_by?: AdminSubscriptionSortKey;
    order_direction?: "asc" | "desc";
}

export interface AdminSubscriptionRow {
    organisation_id: string;
    name: string;
    owner: PersonRef | null;
    plan: PlanKey;
    status: SubscriptionStatus;
    stored_status: SubscriptionStatus | null;
    source: SubscriptionSource | null;
    interval: BillingInterval | null;
    seats: { used: number; total: number };
    price_per_month_cents: number;
    currency: string;
    next_renewal_at: string | null;
    trial_ends_at: string | null;
    cancelling: boolean;
    minutes_used_percent: number | null;
    ai_cost: { charged_usd: number; base_usd: number };
    margin_usd: number;
    failed_payments: number;
    created_at: string;
    out_of_sync: boolean;
}

export interface AdminSubscriptionsSummary {
    active_by_plan: Partial<Record<PlanKey, number>>;
    mrr_cents: number;
    arr_cents: number;
    trials_running: number;
    past_due: { count: number; amount_at_risk_cents: number };
    cancellations_scheduled: number;
    churn_this_month_percent: number;
    non_usd_subscriptions: number;
}

export interface AdminSubscriptionsList {
    summary: AdminSubscriptionsSummary;
    data: AdminSubscriptionRow[];
    pagination: Pagination;
}

export const AdminPaymentFilters = {
    ALL: "all",
    FAILED: "failed",
    OPEN: "open",
    REFUNDED: "refunded",
    PAID: "paid",
} as const;
export type AdminPaymentFilter = (typeof AdminPaymentFilters)[keyof typeof AdminPaymentFilters];

export interface AdminPaymentsQuery {
    page?: number;
    limit?: number;
    filter?: AdminPaymentFilter;
    kind?: BillingInvoiceKind;
    organisation_id?: string;
    from?: string;
    to?: string;
}

export interface AdminPayment extends BillingInvoice {
    organisation: { id: string; name: string };
    scope: "personal" | "team" | null;
    buyer: PersonRef | null;
    stripe_url: string;
}

export interface AdminPaymentsList {
    totals: { collected_cents: number; refunded_cents: number; failed_cents: number };
    data: AdminPayment[];
    pagination: Pagination;
}

export interface AdminKindConsumption {
    used_minutes: number;
    owners_minutes: number;
    others_minutes: number;
    team_credit_minutes_used: number;
    pool_minutes: number | null;
    owner_reserve_minutes: number | null;
    member_cap_minutes: number | null;
}

export interface AdminSubscriptionRecord {
    id: string;
    plan: PlanKey;
    status: SubscriptionStatus;
    effective_status: SubscriptionStatus;
    source: SubscriptionSource;
    billing_interval: BillingInterval | null;
    extra_seats: number;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
    cancel_at_period_end: boolean;
    pending_plan: PlanKey | null;
    pending_interval: BillingInterval | null;
    pending_change_at: string | null;
    unit_amount_cents: number | null;
    price_per_month_cents: number;
    currency: string;
    canceled_at: string | null;
    cancel_reason: string | null;
    drift_detected_at: string | null;
    last_synced_at: string | null;
    manual_note: string | null;
}

export interface AdminPeriod {
    start: string;
    end: string;
    live_minutes: number;
    practice_minutes: number;
    charged_cost_usd: number;
    base_cost_usd: number;
    revenue_cents: number;
    plan_price_per_month_cents: number;
}

export interface AdminMember {
    user_id: string;
    name: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    live_minutes: number;
    practice_minutes: number;
    live_cap_minutes: number | null;
    practice_cap_minutes: number | null;
    personal_credit_minutes: { live: number; practice: number };
}

export interface AdminSubscriptionDetail {
    organisation: { id: string; name: string; created_at: string; owner: PersonRef | null; members_count: number };
    subscription: AdminSubscriptionRecord | null;
    stripe_links: { customer: string | null; subscription: string | null };
    entitlements: {
        plan: PlanKey;
        status: SubscriptionStatus;
        read_only: boolean;
        period: { start: string; end: string };
        limits: PlanLimits;
        features: PlanFeatureValues;
        seats_total: number;
    };
    consumption: {
        live: AdminKindConsumption;
        practice: AdminKindConsumption;
        uploads: number;
        copilots: number;
        practice_prospects: number;
    };
    credits: {
        team: { live_minutes: number; practice_minutes: number };
        personal_total: { live_minutes: number; practice_minutes: number };
    };
    periods: AdminPeriod[];
    invoices: (BillingInvoice & { user_id: string | null; stripe_url: string })[];
    members: AdminMember[];
    timeline: SubscriptionEvent[];
    notes: {
        manual_note: string | null;
        log: { created_at: string; type: string; actor_kind: string; note: string }[];
    };
}

export interface AssignManualPlanDto {
    plan: PlanKey;
    extra_seats?: number;
    period_end?: string;
    note: string;
}

export interface GrantCreditsDto {
    live_minutes: number;
    practice_minutes: number;
    user_id?: string;
    note?: string;
}

export interface ExtendTrialDto {
    days: number;
    note?: string;
}

export interface AdminCancelDto {
    mode: "at_period_end" | "immediate";
    refund?: boolean;
    confirm_name: string;
    note?: string;
}

export interface RefundInvoiceDto {
    amount_cents?: number;
    confirm_name: string;
    note?: string;
}
