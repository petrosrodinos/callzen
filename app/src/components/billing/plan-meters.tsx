import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarClock, ShoppingCart, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/format";
import { formatDate } from "@/lib/date";
import type { KindMeter, PlanUsage } from "@/features/billing/interfaces/billing.interfaces";
import { SubscriptionStatuses } from "@/features/billing/interfaces/billing.interfaces";
import { getPlanLabel, getSubscriptionStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { usePlanPromptStore } from "@/stores/plan-prompt";
import { Routes } from "@/routes/routes";

const statusVariant = (usage: PlanUsage): "success" | "secondary" | "destructive" | "outline" => {
    if (usage.read_only) return "destructive";
    if (usage.status === SubscriptionStatuses.PAST_DUE || usage.cancel_at_period_end) return "outline";
    if (usage.status === SubscriptionStatuses.TRIALING) return "secondary";
    return "success";
};

function Meter({ label, meter }: { label: string; meter: KindMeter }) {
    const { t } = useTranslation("billing");
    // Students see their personal cap when it binds harder than their share of the pool (§10.1).
    const total = meter.included_minutes;
    const used = meter.used_minutes;
    const percent = total ? Math.min(100, (used / total) * 100) : 0;
    const capPercent = meter.member_cap_minutes ? Math.min(100, (meter.member_used_minutes / meter.member_cap_minutes) * 100) : null;
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums text-muted-foreground">
                    {total == null
                        ? t("meters.usedUnlimited", { used: formatMinutes(used) })
                        : t("meters.usedOf", { used: formatMinutes(used), total: formatMinutes(total) })}
                </span>
            </div>
            {total != null && <Progress value={percent} className={cn(percent >= 90 && "[&>div]:bg-destructive")} aria-label={label} />}
            {capPercent != null && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("meters.yourShare")}</span>
                        <span className="tabular-nums">
                            {t("meters.usedOf", { used: formatMinutes(meter.member_used_minutes), total: formatMinutes(meter.member_cap_minutes ?? 0) })}
                        </span>
                    </div>
                    <Progress value={capPercent} className="h-1.5" aria-label={t("meters.yourShare")} />
                </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {meter.available_minutes != null && <span>{t("meters.available", { minutes: formatMinutes(meter.available_minutes) })}</span>}
                {meter.owner_reserve_minutes != null && (
                    <span>{t("meters.ownerReserve", { left: formatMinutes(meter.owner_reserve_left_minutes ?? 0), total: formatMinutes(meter.owner_reserve_minutes) })}</span>
                )}
                {meter.team_credit_minutes > 0 && <span>{t("meters.teamBalance", { minutes: formatMinutes(meter.team_credit_minutes) })}</span>}
                {meter.personal_credit_minutes > 0 && <span>{t("meters.yourBalance", { minutes: formatMinutes(meter.personal_credit_minutes) })}</span>}
            </div>
        </div>
    );
}

export function PlanMeters({ usage, className }: { usage: PlanUsage; className?: string }) {
    const { t } = useTranslation("billing");
    const { can } = usePermissions();
    const openBuyMinutes = usePlanPromptStore((state) => state.setBuyMinutesOpen);
    const resetsAt = usage.status === SubscriptionStatuses.TRIALING ? usage.trial_ends_at : usage.period.end;

    return (
        <Card className={cn("gap-0 p-5", className)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{t("meters.title", { plan: getPlanLabel(usage.plan) })}</h2>
                        <Badge variant={statusVariant(usage)}>{getSubscriptionStatusLabel(usage.status, usage.cancel_at_period_end)}</Badge>
                    </div>
                    {resetsAt && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="size-3.5" />
                            {usage.status === SubscriptionStatuses.TRIALING
                                ? t("meters.trialEnds", { date: formatDate(resetsAt) })
                                : t("meters.resets", { date: formatDate(resetsAt) })}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {usage.can_buy_topups && (
                        <Button size="sm" variant="outline" onClick={() => openBuyMinutes(true)}>
                            <ShoppingCart /> {t("buyMinutes.button")}
                        </Button>
                    )}
                    {can(Permissions.BILLING_VIEW) && (
                        <Button size="sm" asChild>
                            <Link to={Routes.settings.billing}>
                                <Sparkles /> {usage.read_only ? t("upgrade.choosePlan") : t("meters.managePlan")}
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            {usage.read_only && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{t("upgrade.subscriptionRequired")}</p>}
            <div className="grid gap-5 md:grid-cols-2">
                {usage.practice_shares_live_pool ? (
                    <Meter label={t("meters.sharedMinutes")} meter={usage.live} />
                ) : (
                    <>
                        <Meter label={t("meters.liveMinutes")} meter={usage.live} />
                        <Meter label={t("meters.practiceMinutes")} meter={usage.practice} />
                    </>
                )}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
                {[
                    { label: t("meters.uploads"), used: usage.uploads.used, max: usage.uploads.included },
                    { label: t("meters.copilots"), used: usage.copilots.used, max: usage.copilots.max },
                    { label: t("meters.prospects"), used: usage.practice_prospects.used, max: usage.practice_prospects.max },
                    { label: t("meters.seats"), used: usage.seats.used, max: usage.seats.total },
                ].map((item) => (
                    <div key={item.label}>
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="font-medium tabular-nums">{item.max == null ? t("meters.countUnlimited", { used: item.used }) : t("meters.countOf", { used: item.used, max: item.max })}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}
