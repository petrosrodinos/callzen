import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Clock, DollarSign, Headphones, PhoneCall } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanMeters } from "@/components/billing/plan-meters";
import { useUsageSummary } from "@/features/usage/hooks/use-usage";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useEntitlements } from "@/features/billing/hooks/use-billing";
import { UsagePeriodOptions } from "@/config/constants/dropdowns/usage/usage-period.options";
import { formatCost, formatMinutes } from "@/lib/format";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useIsPlatformAdmin } from "@/hooks/use-platform-admin";
import { SettingsNav } from "../../components/settings-nav";
import { useCheckoutReturn } from "../../hooks/use-checkout-return";
import { SessionsTable } from "./components/sessions-table";
import { MemberMinutesTable } from "./components/member-minutes-table";
import { AdminCostBreakdown } from "./components/admin-cost-breakdown";
import { MyPurchasesCard } from "./components/my-purchases-card";

// Everyone sees minutes and counts; only platform admins see AI costs (§6.1, §6.2).
const UsagePage: FC = () => {
    const { t } = useTranslation("settings");
    usePageMetadata({ title: t("nav.usage") });
    // Personal top-ups return here from Stripe Checkout.
    useCheckoutReturn();
    const [days, setDays] = useState("30");
    const { data, isPending } = useUsageSummary(Number(days));
    const { data: planUsage, isPending: planPending } = useEntitlements();
    const isAdmin = useIsPlatformAdmin();
    const { data: catalog } = useCatalog();
    const { can } = usePermissions();
    const orgWide = can(Permissions.USAGE_VIEW);
    const showCosts = isAdmin && data?.estimated_cost_usd != null;

    return (
        <div className="mx-auto max-w-5xl">
            <PageHeader
                title={t("title")}
                actions={
                    <Select value={days} onValueChange={setDays}>
                        <SelectTrigger className="w-44" aria-label={t("usage.period")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {UsagePeriodOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            />
            <SettingsNav />

            <div className="space-y-4">
                {planPending ? <Skeleton className="h-56 w-full rounded-xl" /> : planUsage && <PlanMeters usage={planUsage} />}

                <p className="text-sm text-muted-foreground">{orgWide ? t("usage.scopeOrg") : t("usage.scopeMine")}</p>

                {isPending || !data ? (
                    <DashboardSkeleton />
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard label={t("usage.liveMinutes")} value={formatMinutes(data.live_minutes)} icon={Clock} />
                            <StatCard label={t("usage.practiceMinutes")} value={formatMinutes(data.practice_minutes)} icon={Headphones} />
                            <StatCard
                                label={t("usage.calls")}
                                value={data.calls_count}
                                icon={PhoneCall}
                                hint={t("usage.averageSession", { minutes: formatMinutes(data.average_session_minutes) })}
                            />
                            {showCosts ? (
                                <StatCard
                                    label={t("usage.admin.totalCost")}
                                    value={formatCost(data.estimated_cost_usd ?? 0)}
                                    icon={DollarSign}
                                    hint={t("usage.admin.baseCost", { cost: formatCost(data.base_cost_usd ?? 0) })}
                                />
                            ) : (
                                <StatCard
                                    label={t("usage.analyses")}
                                    value={data.analyses_count}
                                    icon={BarChart3}
                                    hint={t("usage.suggestions", { count: data.suggestions_count })}
                                />
                            )}
                        </div>

                        {planUsage?.members && planUsage.members.length > 1 && <MemberMinutesTable members={planUsage.members} />}
                        <SessionsTable summary={data} showOwner={orgWide} />
                        {showCosts && <AdminCostBreakdown summary={data} catalog={catalog} />}
                    </>
                )}

                {!can(Permissions.BILLING_VIEW) && <MyPurchasesCard />}
            </div>
        </div>
    );
};

export default UsagePage;
