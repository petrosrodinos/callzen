import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IntervalToggle, PlanCards } from "@/components/billing/plan-cards";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useCheckout, useEntitlements, usePlans } from "@/features/billing/hooks/use-billing";
import { BillingIntervals, PlanKeys, type BillingInterval, type CatalogPlan } from "@/features/billing/interfaces/billing.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { Routes } from "@/routes/routes";

// In-app pricing (§8.6): limits and features from GET /plans (AppConfig), amounts from Stripe.
const PricingPage: FC = () => {
    const { t } = useTranslation("billing");
    usePageMetadata({ title: t("pricing.title") });
    const { data: catalog, isPending } = usePlans();
    const { data: usage } = useEntitlements();
    const { can } = usePermissions();
    const checkout = useCheckout();
    const [interval, setInterval] = useState<BillingInterval>(BillingIntervals.MONTH);
    const [extraSeats, setExtraSeats] = useState(0);
    const canManage = can(Permissions.BILLING_MANAGE);
    const paidPlans = catalog?.plans.filter((plan) => plan.is_paid) ?? [];
    const hasPaidPlan = !!usage && usage.plan !== PlanKeys.TRIAL && !usage.read_only;

    const footer = (plan: CatalogPlan) => {
        if (usage?.plan === plan.key && !usage.read_only) return <p className="text-center text-sm text-muted-foreground">{t("plans.current")}</p>;
        if (!canManage) return <p className="text-center text-xs text-muted-foreground">{t("upgrade.askOwner")}</p>;
        // An existing paid plan is changed from the billing page (with a price preview); new plans go to Checkout.
        if (hasPaidPlan)
            return (
                <Button asChild className="w-full" variant="outline">
                    <Link to={Routes.settings.billing}>{t("pricing.switchTo", { plan: getPlanLabel(plan.key) })}</Link>
                </Button>
            );
        const price = interval === BillingIntervals.YEAR ? plan.prices?.yearly : plan.prices?.monthly;
        return (
            <Button
                className="w-full"
                disabled={!price || checkout.isPending}
                loading={checkout.isPending && checkout.variables?.plan === plan.key}
                onClick={() => checkout.mutate({ plan: plan.key, interval, ...(plan.limits.extra_seats_allowed && { extra_seats: extraSeats }) })}
            >
                {t("pricing.choose", { plan: getPlanLabel(plan.key) })}
            </Button>
        );
    };

    const coach = paidPlans.find((plan) => plan.limits.extra_seats_allowed);

    return (
        <div className="mx-auto max-w-6xl">
            <PageHeader title={t("pricing.title")} description={t("pricing.subtitle")} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <IntervalToggle value={interval} onChange={setInterval} />
                {coach && canManage && !hasPaidPlan && (
                    <div className="flex items-center gap-2 text-sm">
                        <span>{t("pricing.coachSeats", { plan: getPlanLabel(coach.key) })}</span>
                        <Button size="icon" variant="outline" className="size-8" aria-label={t("change.removeSeat")} onClick={() => setExtraSeats((n) => Math.max(0, n - 1))}>
                            <Minus />
                        </Button>
                        <span className="w-8 text-center font-medium tabular-nums">{extraSeats}</span>
                        <Button size="icon" variant="outline" className="size-8" aria-label={t("change.addSeat")} onClick={() => setExtraSeats((n) => n + 1)}>
                            <Plus />
                        </Button>
                        <span className="text-xs text-muted-foreground">{t("change.totalSeats", { count: coach.limits.seats_included + extraSeats })}</span>
                    </div>
                )}
            </div>
            {isPending ? (
                <div className="grid gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-96 rounded-xl" />
                    ))}
                </div>
            ) : (
                <PlanCards plans={paidPlans} interval={interval} currentPlan={usage?.read_only ? null : usage?.plan} renderFooter={footer} />
            )}
            <p className="mt-4 text-xs text-muted-foreground">{t("pricing.footnote")}</p>
        </div>
    );
};

export default PricingPage;
