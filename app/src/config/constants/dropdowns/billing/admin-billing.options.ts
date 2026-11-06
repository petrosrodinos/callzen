import i18n from "@/i18n";
import { AdminPaymentFilters, type AdminPaymentFilter } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";

export const PaymentFilterOptions: { id: AdminPaymentFilter; label: string }[] = [
    { id: AdminPaymentFilters.ALL, label: i18n.t("options:billing.paymentFilter.all") },
    { id: AdminPaymentFilters.FAILED, label: i18n.t("options:billing.paymentFilter.failed") },
    { id: AdminPaymentFilters.OPEN, label: i18n.t("options:billing.paymentFilter.open") },
    { id: AdminPaymentFilters.REFUNDED, label: i18n.t("options:billing.paymentFilter.refunded") },
    { id: AdminPaymentFilters.PAID, label: i18n.t("options:billing.paymentFilter.paid") },
];

export const AdminCancelModeOptions: { id: "at_period_end" | "immediate"; label: string }[] = [
    { id: "at_period_end", label: i18n.t("options:billing.cancelMode.atPeriodEnd") },
    { id: "immediate", label: i18n.t("options:billing.cancelMode.immediate") },
];

export const ActorKindOptions: { id: string; label: string }[] = [
    { id: "USER", label: i18n.t("options:billing.actor.user") },
    { id: "ADMIN", label: i18n.t("options:billing.actor.admin") },
    { id: "STRIPE", label: i18n.t("options:billing.actor.stripe") },
    { id: "SYSTEM", label: i18n.t("options:billing.actor.system") },
];

export function getActorKindLabel(kind: string): string {
    return ActorKindOptions.find((option) => option.id === kind)?.label ?? kind;
}
