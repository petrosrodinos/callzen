import i18n from "@/i18n";
import {
    BillingIntervals,
    BillingInvoiceKinds,
    PlanKeys,
    SubscriptionSources,
    SubscriptionStatuses,
    type BillingInterval,
    type BillingInvoice,
    type BillingInvoiceKind,
    type PlanKey,
    type SubscriptionSource,
    type SubscriptionStatus,
} from "@/features/billing/interfaces/billing.interfaces";

export const PlanFormOptions: { id: PlanKey; label: string }[] = [
    { id: PlanKeys.TRIAL, label: i18n.t("options:billing.plan.trial") },
    { id: PlanKeys.STARTER, label: i18n.t("options:billing.plan.starter") },
    { id: PlanKeys.PRO, label: i18n.t("options:billing.plan.pro") },
    { id: PlanKeys.COACH, label: i18n.t("options:billing.plan.coach") },
];

export const PlanFilterOptions: { id: PlanKey | "all"; label: string }[] = [{ id: "all", label: i18n.t("options:billing.plan.all") }, ...PlanFormOptions];

export function getPlanLabel(plan: PlanKey | string | null | undefined): string {
    return PlanFormOptions.find((option) => option.id === plan)?.label ?? (plan ? String(plan) : "");
}

export const PlanDescriptionOptions: { id: PlanKey; description: string }[] = [
    { id: PlanKeys.TRIAL, description: i18n.t("options:billing.planDescription.trial") },
    { id: PlanKeys.STARTER, description: i18n.t("options:billing.planDescription.starter") },
    { id: PlanKeys.PRO, description: i18n.t("options:billing.planDescription.pro") },
    { id: PlanKeys.COACH, description: i18n.t("options:billing.planDescription.coach") },
];

export function getPlanDescription(plan: PlanKey | string): string {
    return PlanDescriptionOptions.find((option) => option.id === plan)?.description ?? "";
}

export const SubscriptionStatusOptions: { id: SubscriptionStatus; label: string }[] = [
    { id: SubscriptionStatuses.TRIALING, label: i18n.t("options:billing.status.trialing") },
    { id: SubscriptionStatuses.ACTIVE, label: i18n.t("options:billing.status.active") },
    { id: SubscriptionStatuses.PAST_DUE, label: i18n.t("options:billing.status.pastDue") },
    { id: SubscriptionStatuses.CANCELED, label: i18n.t("options:billing.status.canceled") },
    { id: SubscriptionStatuses.INCOMPLETE, label: i18n.t("options:billing.status.incomplete") },
    { id: SubscriptionStatuses.NONE, label: i18n.t("options:billing.status.none") },
];

export const SubscriptionStatusFilterOptions: { id: SubscriptionStatus | "all"; label: string }[] = [
    { id: "all", label: i18n.t("options:billing.status.all") },
    ...SubscriptionStatusOptions,
];

export function getSubscriptionStatusLabel(status: SubscriptionStatus | string | null | undefined, cancelling = false): string {
    if (cancelling) return i18n.t("options:billing.status.cancelling");
    return SubscriptionStatusOptions.find((option) => option.id === status)?.label ?? (status ? String(status) : "");
}

export const BillingInvoiceKindOptions: { id: BillingInvoiceKind; label: string }[] = [
    { id: BillingInvoiceKinds.SUBSCRIPTION, label: i18n.t("options:billing.invoiceKind.subscription") },
    { id: BillingInvoiceKinds.SEATS, label: i18n.t("options:billing.invoiceKind.seats") },
    { id: BillingInvoiceKinds.TOPUP_TEAM, label: i18n.t("options:billing.invoiceKind.topupTeam") },
    { id: BillingInvoiceKinds.TOPUP_PERSONAL, label: i18n.t("options:billing.invoiceKind.topupPersonal") },
    { id: BillingInvoiceKinds.OTHER, label: i18n.t("options:billing.invoiceKind.other") },
];

export function getBillingInvoiceKindLabel(kind: BillingInvoiceKind | string): string {
    return BillingInvoiceKindOptions.find((option) => option.id === kind)?.label ?? String(kind);
}

export const InvoiceStatusOptions: { id: string; label: string }[] = [
    { id: "draft", label: i18n.t("options:billing.invoiceStatus.draft") },
    { id: "open", label: i18n.t("options:billing.invoiceStatus.open") },
    { id: "paid", label: i18n.t("options:billing.invoiceStatus.paid") },
    { id: "void", label: i18n.t("options:billing.invoiceStatus.void") },
    { id: "uncollectible", label: i18n.t("options:billing.invoiceStatus.uncollectible") },
    { id: "failed", label: i18n.t("options:billing.invoiceStatus.failed") },
    { id: "refunded", label: i18n.t("options:billing.invoiceStatus.refunded") },
];

export function getInvoiceStatusLabel(status: string): string {
    return InvoiceStatusOptions.find((option) => option.id === status)?.label ?? status;
}

// Pack names are keyed by the pack's label_key (AppConfig plans.topup_packs); unknown keys fall back to minutes.
export function getTopupPackLabel(pack: { label_key: string; live_minutes: number; practice_minutes: number }): string {
    const key = `options:billing.pack.${pack.label_key}`;
    if (i18n.exists(key)) return i18n.t(key);
    if (pack.live_minutes && pack.practice_minutes)
        return i18n.t("options:billing.pack.mixed", { live: pack.live_minutes, practice: pack.practice_minutes });
    return pack.live_minutes
        ? i18n.t("options:billing.pack.liveFallback", { count: pack.live_minutes })
        : i18n.t("options:billing.pack.practiceFallback", { count: pack.practice_minutes });
}

export const CancelReasonOptions: { id: string; label: string }[] = [
    { id: "too_expensive", label: i18n.t("options:billing.cancelReason.tooExpensive") },
    { id: "not_using", label: i18n.t("options:billing.cancelReason.notUsing") },
    { id: "missing_features", label: i18n.t("options:billing.cancelReason.missingFeatures") },
    { id: "switching", label: i18n.t("options:billing.cancelReason.switching") },
    { id: "temporary", label: i18n.t("options:billing.cancelReason.temporary") },
    { id: "other", label: i18n.t("options:billing.cancelReason.other") },
];

export const BillingIntervalOptions: { id: BillingInterval; label: string }[] = [
    { id: BillingIntervals.MONTH, label: i18n.t("options:billing.interval.month") },
    { id: BillingIntervals.YEAR, label: i18n.t("options:billing.interval.year") },
];

export function getBillingIntervalLabel(interval: BillingInterval | string | null | undefined): string {
    return BillingIntervalOptions.find((option) => option.id === interval)?.label ?? "";
}

// Built from the stored kind and parameters so invoices read in the viewer's language, not Stripe's English (§11a).
export function getInvoiceDescription(invoice: Pick<BillingInvoice, "kind" | "params">): string {
    const { kind, params } = invoice;
    if (kind === BillingInvoiceKinds.SUBSCRIPTION && params.plan)
        return [getPlanLabel(params.plan), getBillingIntervalLabel(params.interval)].filter(Boolean).join(", ");
    if (kind === BillingInvoiceKinds.SEATS) return i18n.t("options:billing.invoiceDescription.seats", { count: params.seats ?? 0 });
    if ((kind === BillingInvoiceKinds.TOPUP_TEAM || kind === BillingInvoiceKinds.TOPUP_PERSONAL) && params.pack_id) {
        const key = `options:billing.pack.${params.pack_id}`;
        return i18n.t("options:billing.invoiceDescription.topup", { pack: i18n.exists(key) ? i18n.t(key) : params.pack_id });
    }
    return getBillingInvoiceKindLabel(kind);
}

export const SubscriptionEventTypeOptions: { id: string; label: string }[] = [
    "STARTED",
    "PLAN_CHANGED",
    "CHANGE_SCHEDULED",
    "CHANGE_CANCELED",
    "SEATS_CHANGED",
    "CANCEL_SCHEDULED",
    "CANCEL_REVOKED",
    "CANCELED",
    "REACTIVATED",
    "TRIAL_STARTED",
    "TRIAL_ENDED",
    "TRIAL_EXTENDED",
    "PAYMENT_SUCCEEDED",
    "PAYMENT_FAILED",
    "REFUNDED",
    "CREDITS_GRANTED",
    "MANUAL_ASSIGNED",
    "DISCOUNT_APPLIED",
    "SYNCED",
].map((id) => ({ id, label: i18n.t(`options:billing.eventType.${id}`) }));

export function getSubscriptionEventTypeLabel(type: string): string {
    return SubscriptionEventTypeOptions.find((option) => option.id === type)?.label ?? type;
}

export const SubscriptionSourceOptions: { id: SubscriptionSource; label: string }[] = [
    { id: SubscriptionSources.STRIPE, label: i18n.t("options:billing.source.stripe") },
    { id: SubscriptionSources.MANUAL, label: i18n.t("options:billing.source.manual") },
];

export function getSubscriptionSourceLabel(source: SubscriptionSource | string | null | undefined): string {
    return SubscriptionSourceOptions.find((option) => option.id === source)?.label ?? "";
}
