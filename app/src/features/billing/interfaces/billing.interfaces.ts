export const PlanKeys = {
    TRIAL: "TRIAL",
    STARTER: "STARTER",
    PRO: "PRO",
    COACH: "COACH",
} as const;
export type PlanKey = (typeof PlanKeys)[keyof typeof PlanKeys];

export const SubscriptionStatuses = {
    TRIALING: "TRIALING",
    ACTIVE: "ACTIVE",
    PAST_DUE: "PAST_DUE",
    CANCELED: "CANCELED",
    INCOMPLETE: "INCOMPLETE",
    NONE: "NONE",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatuses)[keyof typeof SubscriptionStatuses];

export const SubscriptionSources = {
    STRIPE: "STRIPE",
    MANUAL: "MANUAL",
} as const;
export type SubscriptionSource = (typeof SubscriptionSources)[keyof typeof SubscriptionSources];

export const BillingIntervals = {
    MONTH: "month",
    YEAR: "year",
} as const;
export type BillingInterval = (typeof BillingIntervals)[keyof typeof BillingIntervals];

export const PlanFeatures = {
    KNOWLEDGE_DOCUMENT_IMPORT: "knowledge_document_import",
    ORG_ROLES_PERMISSIONS: "org_roles_permissions",
    ORG_INVITATIONS: "org_invitations",
    VIEW_ALL_MEMBER_CALLS: "view_all_member_calls",
    COHORT_DASHBOARD: "cohort_dashboard",
    TOPUP_PURCHASES: "topup_purchases",
    STUDENT_PAGES: "student_pages",
    PRACTICE_ASSIGNMENTS: "practice_assignments",
    CALL_COMMENTS: "call_comments",
    COACH_REPORTS: "coach_reports",
    STUDENT_EXPORT: "student_export",
    AGENT_ACCESS_CONTROL: "agent_access_control",
} as const;
export type PlanFeature = (typeof PlanFeatures)[keyof typeof PlanFeatures];
export type PlanFeatureValues = Record<PlanFeature, boolean>;

export const PlanLimitKeys = {
    SEATS_INCLUDED: "seats_included",
    LIVE_MINUTES: "live_minutes_per_period",
    PRACTICE_MINUTES: "practice_minutes_per_period",
    LIVE_MINUTES_PER_MEMBER: "live_minutes_per_member_per_period",
    PRACTICE_MINUTES_PER_MEMBER: "practice_minutes_per_member_per_period",
    COPILOTS_MAX: "copilots_max",
    PRACTICE_PROSPECTS_MAX: "practice_prospects_max",
    PRACTICE_PROSPECTS_PER_MEMBER_MAX: "practice_prospects_per_member_max",
    UPLOADS_PER_PERIOD: "uploads_per_period",
} as const;
export type PlanLimitKey = (typeof PlanLimitKeys)[keyof typeof PlanLimitKeys];

// null = unlimited.
export interface PlanLimits {
    seats_included: number;
    extra_seats_allowed: boolean;
    live_minutes_per_period: number | null;
    practice_minutes_per_period: number | null;
    practice_shares_live_pool: boolean;
    live_minutes_reserved_for_owner_per_period: number | null;
    practice_minutes_reserved_for_owner_per_period: number | null;
    live_minutes_per_member_per_period: number | null;
    practice_minutes_per_member_per_period: number | null;
    copilots_max: number | null;
    practice_prospects_max: number | null;
    practice_prospects_per_member_max: number | null;
    uploads_per_period: number | null;
    trial_days: number | null;
}

export interface PlanDefinition {
    limits: PlanLimits;
    features: PlanFeatureValues;
}

export interface PriceAmount {
    amount_cents: number;
    currency: string;
    interval: string | null;
}

export interface PlanPrices {
    monthly: PriceAmount | null;
    yearly: PriceAmount | null;
    extra_seat_monthly?: PriceAmount | null;
    extra_seat_yearly?: PriceAmount | null;
}

export interface CatalogPlan extends PlanDefinition {
    key: PlanKey;
    is_paid: boolean;
    prices: PlanPrices | null;
}

export interface TopupPack {
    id: string;
    label_key: string;
    live_minutes: number;
    practice_minutes: number;
    price: PriceAmount | null;
    available: boolean;
}

export interface PlansCatalog {
    plans: CatalogPlan[];
    topup_packs: TopupPack[];
    // Plan × analysis section visibility (§9.2), to name the plan that unlocks a locked section.
    analysis_visibility?: Record<PlanKey, Record<string, boolean>>;
    currency: string;
}

export interface KindMeter {
    included_minutes: number | null;
    used_minutes: number;
    member_cap_minutes: number | null;
    member_used_minutes: number;
    available_minutes: number | null;
    team_credit_minutes: number;
    personal_credit_minutes: number;
    owner_reserve_minutes: number | null;
    owner_reserve_left_minutes: number | null;
}

export interface MemberMinutes {
    user_id: string;
    name: string;
    is_owner: boolean;
    live_minutes: number;
    practice_minutes: number;
    live_cap_minutes: number | null;
    practice_cap_minutes: number | null;
}

// GET /usage/plan — the caller's entitlements and consumption this period.
export interface PlanUsage {
    plan: PlanKey;
    status: SubscriptionStatus;
    source: SubscriptionSource | null;
    read_only: boolean;
    is_owner: boolean;
    period: { start: string; end: string };
    trial_ends_at: string | null;
    cancel_at_period_end: boolean;
    live: KindMeter;
    practice: KindMeter;
    practice_shares_live_pool: boolean;
    uploads: { used: number; included: number | null };
    copilots: { used: number; max: number | null };
    practice_prospects: { used: number; max: number | null };
    seats: { used: number; total: number };
    features: PlanFeatureValues;
    can_buy_topups: boolean;
    can_buy_team_topups: boolean;
    members?: MemberMinutes[];
}

export const PlanErrorCodes = {
    PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
    PLAN_FEATURE_LOCKED: "PLAN_FEATURE_LOCKED",
    SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
    CALL_TIME_LIMIT: "CALL_TIME_LIMIT",
} as const;
export type PlanErrorCode = (typeof PlanErrorCodes)[keyof typeof PlanErrorCodes];

// Body of a 403 plan error, as sent by the API.
export interface PlanErrorDetails {
    code: PlanErrorCode;
    message?: string;
    limit?: PlanLimitKey | string;
    feature?: PlanFeature;
    current?: number;
    max?: number | null;
    plan?: PlanKey;
    next_plan?: PlanKey | null;
    kind?: "LIVE" | "PRACTICE";
    can_buy_minutes?: boolean;
    extra_seats_allowed?: boolean;
}

export const TopupScopes = {
    PERSONAL: "personal",
    TEAM: "team",
} as const;
export type TopupScope = (typeof TopupScopes)[keyof typeof TopupScopes];

export interface CheckoutDto {
    plan: PlanKey;
    interval: BillingInterval;
    extra_seats?: number;
}

export interface TopupDto {
    pack_id: string;
    scope: TopupScope;
}


export interface RedirectResponse {
    url: string;
    session_id?: string;
}

export interface PaymentMethodSummary {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
}

export interface BillingOverview {
    plan: PlanKey;
    status: SubscriptionStatus;
    stored_status: SubscriptionStatus | null;
    source: SubscriptionSource | null;
    interval: BillingInterval | null;
    read_only: boolean;
    price: { amount_cents: number | null; currency: string };
    current_period_start: string | null;
    current_period_end: string | null;
    next_charge: { date: string; amount_cents: number | null } | null;
    trial_ends_at: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    pending_change: {
        plan: PlanKey | null;
        interval: BillingInterval | null;
        extra_seats: number | null;
        effective_at: string;
    } | null;
    seats: {
        used: number;
        members: number;
        pending_invitations: number;
        included: number;
        extra: number;
        total: number;
        extra_seats_allowed: boolean;
        extra_seat_price: PriceAmount | null;
    };
    payment_method: PaymentMethodSummary | null;
    has_stripe_customer: boolean;
    has_stripe_subscription: boolean;
    manual_plan: boolean;
    can_manage: boolean;
    banners: {
        past_due: { grace_ends_at: string | null } | null;
        action_required: { invoice_id: string; hosted_invoice_url: string | null } | null;
    };
}

export const BillingInvoiceKinds = {
    SUBSCRIPTION: "SUBSCRIPTION",
    SEATS: "SEATS",
    TOPUP_TEAM: "TOPUP_TEAM",
    TOPUP_PERSONAL: "TOPUP_PERSONAL",
    OTHER: "OTHER",
} as const;
export type BillingInvoiceKind = (typeof BillingInvoiceKinds)[keyof typeof BillingInvoiceKinds];

export interface BillingInvoice {
    id: string;
    number: string | null;
    kind: BillingInvoiceKind;
    status: string;
    params: { plan?: PlanKey; interval?: BillingInterval; seats?: number; billing_reason?: string; pack_id?: string };
    amount_due_cents: number;
    amount_paid_cents: number;
    amount_refunded_cents: number;
    currency: string;
    period_start: string | null;
    period_end: string | null;
    hosted_invoice_url: string | null;
    invoice_pdf_url: string | null;
    requires_action: boolean;
    attempt_count: number;
    last_error: string | null;
    created_at: string;
    paid_at: string | null;
}

export interface CursorPage<T> {
    data: T[];
    next_cursor: string | null;
}

export interface SubscriptionEvent {
    id: string;
    organisation_id: string;
    type: string;
    from_plan: PlanKey | null;
    to_plan: PlanKey | null;
    actor_kind: "USER" | "ADMIN" | "STRIPE" | "SYSTEM";
    note?: string | null;
    data: Record<string, unknown>;
    created_at: string;
}

export interface ChangePlanDto {
    plan: PlanKey;
    interval: BillingInterval;
    extra_seats?: number;
    idempotency_key?: string;
}

export type PlanChangeMode = "checkout" | "immediate" | "scheduled";

export interface ChangePreview {
    mode: PlanChangeMode;
    timing: "immediate" | "scheduled";
    amount_due_now_cents: number;
    next_amount_cents: number | null;
    next_charge_at: string | null;
    effective_at?: string;
    currency: string;
}

export interface ChangePlanResult {
    mode: PlanChangeMode;
    applied?: boolean;
    effective_at?: string;
    url?: string;
}

// Body of the SEATS_IN_USE error (leaving Coach while members + invitations exceed the new seats).
export interface SeatsInUseDetails {
    code: "SEATS_IN_USE";
    seats_after: number;
    members: number;
    pending_invitations: number;
    to_remove: number;
}

export interface CancelPlanDto {
    reason?: string;
    comment?: string;
}

export interface PersonalCredit {
    id: string;
    pack_id: string | null;
    live_minutes_granted: number;
    practice_minutes_granted: number;
    live_minutes_remaining: number;
    practice_minutes_remaining: number;
    created_at: string;
}

export interface MyPurchases {
    credits: PersonalCredit[];
    invoices: BillingInvoice[];
}
