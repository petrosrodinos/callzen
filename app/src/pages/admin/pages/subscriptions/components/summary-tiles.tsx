import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarX, Hourglass, LineChart, TrendingDown, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney, formatNumber } from "@/lib/format";
import type { AdminSubscriptionsSummary } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import { PlanFormOptions } from "@/config/constants/dropdowns/billing/plan.options";

export function SummaryTiles({ summary }: { summary: AdminSubscriptionsSummary }) {
    const { t } = useTranslation("subscriptions");
    const byPlan = PlanFormOptions.filter((option) => summary.active_by_plan[option.id])
        .map((option) => `${option.label} ${summary.active_by_plan[option.id]}`)
        .join(" · ");
    const active = Object.values(summary.active_by_plan).reduce((sum, count) => sum + (count ?? 0), 0);

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard label={t("summary.active")} value={formatNumber(active)} icon={LineChart} hint={byPlan || undefined} />
            <StatCard label={t("summary.mrr")} value={formatMoney(summary.mrr_cents)} icon={Wallet} hint={t("summary.arr", { amount: formatMoney(summary.arr_cents) })} />
            <StatCard label={t("summary.trials")} value={formatNumber(summary.trials_running)} icon={Hourglass} />
            <StatCard
                label={t("summary.pastDue")}
                value={formatNumber(summary.past_due.count)}
                icon={AlertTriangle}
                hint={t("summary.atRisk", { amount: formatMoney(summary.past_due.amount_at_risk_cents) })}
            />
            <StatCard label={t("summary.cancelling")} value={formatNumber(summary.cancellations_scheduled)} icon={CalendarX} />
            <StatCard
                label={t("summary.churn")}
                value={`${formatNumber(summary.churn_this_month_percent)}%`}
                icon={TrendingDown}
                hint={summary.non_usd_subscriptions ? t("summary.nonUsd", { count: summary.non_usd_subscriptions }) : undefined}
            />
        </div>
    );
}
