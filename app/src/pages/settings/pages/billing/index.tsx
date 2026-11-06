import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useSubscription } from "@/features/billing/hooks/use-billing";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { SettingsNav } from "../../components/settings-nav";
import { useCheckoutReturn } from "../../hooks/use-checkout-return";
import { MyPurchasesCard } from "../usage/components/my-purchases-card";
import { PlanCard } from "./components/plan-card";
import { ChangePlanDialog } from "./components/change-plan-dialog";
import { CancelPlanDialog } from "./components/cancel-plan-dialog";
import { PaymentMethodCard } from "./components/payment-method-card";
import { InvoicesCard } from "./components/invoices-card";
import { PlanHistoryCard } from "./components/plan-history-card";
import { MinutesCard } from "./components/minutes-card";
import { YourPlanCard } from "./components/your-plan-card";

// Billing for the active organisation (§11a). Plan changes and cancellation happen here; Stripe's portal is used
// only for card and billing details.
const BillingPage: FC = () => {
    const { t } = useTranslation("billing");
    usePageMetadata({ title: t("page.title") });
    const { can, isPending: permissionsPending } = usePermissions();
    const canView = can(Permissions.BILLING_VIEW);
    const canManage = can(Permissions.BILLING_MANAGE);
    const { data: overview, isPending } = useSubscription(canView);
    const [changeOpen, setChangeOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    useCheckoutReturn();

    return (
        <div className="mx-auto max-w-5xl">
            <PageHeader title={t("page.title")} />
            <SettingsNav />
            {permissionsPending ? (
                <Skeleton className="h-48 w-full rounded-xl" />
            ) : !canView ? (
                <div className="space-y-4">
                    <YourPlanCard />
                    <MinutesCard />
                    <MyPurchasesCard />
                </div>
            ) : isPending || !overview ? (
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
            ) : (
                <div className="space-y-4">
                    <PlanCard overview={overview} canManage={canManage} onChangePlan={() => setChangeOpen(true)} onCancel={() => setCancelOpen(true)} />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <PaymentMethodCard overview={overview} canManage={canManage} />
                        <MinutesCard />
                    </div>
                    <InvoicesCard />
                    <PlanHistoryCard />
                    <MyPurchasesCard />
                    {canManage && <ChangePlanDialog overview={overview} open={changeOpen} onOpenChange={setChangeOpen} />}
                    {canManage && <CancelPlanDialog overview={overview} open={cancelOpen} onOpenChange={setCancelOpen} />}
                </div>
            )}
        </div>
    );
};

export default BillingPage;
