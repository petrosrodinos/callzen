import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard, Hourglass, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBillingPortal, useSubscription } from "@/features/billing/hooks/use-billing";
import { SubscriptionStatuses } from "@/features/billing/interfaces/billing.interfaces";
import { useActiveOrganisation, usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { Routes } from "@/routes/routes";

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_WARNING_DAYS = 3;

const daysUntil = (iso: string | null | undefined) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)) : null);

function Banner({ tone, icon: Icon, children, action }: { tone: "danger" | "warning"; icon: typeof AlertTriangle; children: ReactNode; action?: ReactNode }) {
    return (
        <div
            role="status"
            className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm sm:px-6",
                tone === "danger" ? "border-destructive/30 bg-destructive/10" : "border-amber-500/30 bg-amber-500/10",
            )}
        >
            <Icon className={cn("size-4 shrink-0", tone === "danger" ? "text-destructive" : "text-amber-600 dark:text-amber-400")} />
            <span className="flex-1">{children}</span>
            {action}
        </div>
    );
}

// Past due, payment action required, trial ending and plan ended (§11a "Banners and alerts"). Billing details are
// only fetched for people with billing.view; everyone else relies on the organisation's plan summary.
export function BillingBanners() {
    const { t } = useTranslation("billing");
    const { can } = usePermissions();
    const { organisation } = useActiveOrganisation();
    const canView = can(Permissions.BILLING_VIEW);
    const { data: overview } = useSubscription(canView);
    const portal = useBillingPortal();
    const plan = organisation?.plan;
    if (!plan) return null;

    const manageLink = (label: string) => (
        <Button size="sm" variant="outline" asChild>
            <Link to={Routes.settings.billing}>{label}</Link>
        </Button>
    );

    if (canView && overview?.banners.action_required)
        return (
            <Banner
                tone="danger"
                icon={AlertTriangle}
                action={
                    overview.banners.action_required.hosted_invoice_url && (
                        <Button size="sm" asChild>
                            <a href={overview.banners.action_required.hosted_invoice_url} target="_blank" rel="noreferrer">
                                {t("banners.completePayment")}
                            </a>
                        </Button>
                    )
                }
            >
                {t("banners.actionRequired")}
            </Banner>
        );

    if (canView && overview?.banners.past_due) {
        const days = daysUntil(overview.banners.past_due.grace_ends_at);
        return (
            <Banner
                tone="danger"
                icon={CreditCard}
                action={
                    can(Permissions.BILLING_MANAGE) && overview.has_stripe_customer ? (
                        <Button size="sm" onClick={() => portal.mutate()} loading={portal.isPending} disabled={portal.isPending}>
                            {t("banners.updatePayment")}
                        </Button>
                    ) : (
                        manageLink(t("banners.viewBilling"))
                    )
                }
            >
                {days != null ? t("banners.pastDueDays", { count: days }) : t("banners.pastDue")}
            </Banner>
        );
    }

    if (plan.read_only)
        return (
            <Banner tone="danger" icon={Lock} action={canView ? manageLink(t("upgrade.choosePlan")) : undefined}>
                {canView ? t("banners.readOnly") : t("banners.readOnlyMember")}
            </Banner>
        );

    const trialDays = plan.status === SubscriptionStatuses.TRIALING ? daysUntil(plan.trial_ends_at) : null;
    if (canView && trialDays != null && trialDays <= TRIAL_WARNING_DAYS)
        return (
            <Banner tone="warning" icon={Hourglass} action={manageLink(t("upgrade.choosePlan"))}>
                {t("banners.trialEnding", { count: trialDays })}
            </Banner>
        );

    return null;
}
