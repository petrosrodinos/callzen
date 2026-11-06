import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useAdminSubscriptions } from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import { AdminPaymentFilters } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { Routes } from "@/routes/routes";
import { SubscriptionsTab } from "./components/subscriptions-tab";
import { PaymentsTab } from "./components/payments-tab";

const TABS = ["subscriptions", "payments", "failed"] as const;
type Tab = (typeof TABS)[number];

// Failed and at risk: past-due subscriptions first, then failed and open invoices (§11b).
function AtRiskTab() {
    const { t } = useTranslation("subscriptions");
    const { data, isPending } = useAdminSubscriptions({ past_due: true, limit: 100, order_by: "mrr", order_direction: "desc" });
    return (
        <div className="space-y-4">
            <Card className="gap-0 p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4 text-destructive" /> {t("failed.pastDueTitle")}
                </h2>
                {isPending ? (
                    <Skeleton className="h-16 w-full" />
                ) : !data?.data.length ? (
                    <p className="text-sm text-muted-foreground">{t("failed.noPastDue")}</p>
                ) : (
                    <ul className="divide-y">
                        {data.data.map((row) => (
                            <li key={row.organisation_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                <Link to={Routes.admin.subscription(row.organisation_id)} className="font-medium hover:underline">
                                    {row.name}
                                </Link>
                                <span className="flex items-center gap-3 text-muted-foreground">
                                    <Badge variant="outline">{getPlanLabel(row.plan)}</Badge>
                                    <span className="tabular-nums">{formatMoney(row.price_per_month_cents, row.currency)}</span>
                                    <span>{t("failed.failedPayments", { count: row.failed_payments })}</span>
                                    {row.next_renewal_at && <span>{formatDate(row.next_renewal_at)}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
            <PaymentsTab filters={[AdminPaymentFilters.FAILED, AdminPaymentFilters.OPEN]} defaultFilter={AdminPaymentFilters.FAILED} showTotals={false} />
        </div>
    );
}

const AdminSubscriptionsPage: FC = () => {
    const { t } = useTranslation("subscriptions");
    usePageMetadata({ title: t("title") });
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (TABS as readonly string[]).includes(searchParams.get("tab") ?? "") ? (searchParams.get("tab") as Tab) : "subscriptions";

    return (
        <div className="space-y-4">
            <PageHeader title={t("title")} description={t("subtitle")} />
            <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
                <TabsList>
                    <TabsTrigger value="subscriptions">{t("tabs.subscriptions")}</TabsTrigger>
                    <TabsTrigger value="payments">{t("tabs.payments")}</TabsTrigger>
                    <TabsTrigger value="failed">{t("tabs.failed")}</TabsTrigger>
                </TabsList>
                <TabsContent value="subscriptions" className="mt-4">
                    <SubscriptionsTab />
                </TabsContent>
                <TabsContent value="payments" className="mt-4">
                    <PaymentsTab />
                </TabsContent>
                <TabsContent value="failed" className="mt-4">
                    <AtRiskTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSubscriptionsPage;
