import { useTranslation } from "react-i18next";
import { CalendarClock, CreditCard, RotateCcw, Sparkles, Undo2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useBillingPortal, useResumePlan } from "@/features/billing/hooks/use-billing";
import { SubscriptionStatuses, type BillingOverview } from "@/features/billing/interfaces/billing.interfaces";
import { getBillingIntervalLabel, getPlanLabel, getSubscriptionStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";

const statusVariant = (overview: BillingOverview): "success" | "secondary" | "destructive" | "outline" => {
    if (overview.read_only) return "destructive";
    if (overview.status === SubscriptionStatuses.PAST_DUE || overview.cancel_at_period_end) return "outline";
    if (overview.status === SubscriptionStatuses.TRIALING) return "secondary";
    return "success";
};

interface PlanCardProps {
    overview: BillingOverview;
    canManage: boolean;
    onChangePlan: () => void;
    onCancel: () => void;
}

export function PlanCard({ overview, canManage, onChangePlan, onCancel }: PlanCardProps) {
    const { t } = useTranslation("billing");
    const resume = useResumePlan();
    const portal = useBillingPortal();
    const pending = overview.pending_change;
    const hasStripe = overview.has_stripe_subscription;
    const price = overview.price.amount_cents;

    return (
        <Card className="gap-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{t("page.planName", { plan: getPlanLabel(overview.plan) })}</h2>
                        <Badge variant={statusVariant(overview)}>{getSubscriptionStatusLabel(overview.status, overview.cancel_at_period_end)}</Badge>
                    </div>
                    {overview.manual_plan && !overview.read_only ? (
                        <p className="text-sm text-muted-foreground">{t("page.manualPlan")}</p>
                    ) : price != null && overview.interval ? (
                        <p className="text-sm text-muted-foreground">
                            {t("page.priceInterval", { price: formatMoney(price, overview.price.currency), interval: getBillingIntervalLabel(overview.interval).toLowerCase() })}
                        </p>
                    ) : null}
                </div>
                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={onChangePlan}>
                            <Sparkles /> {hasStripe ? t("page.changePlan") : t("page.subscribe")}
                        </Button>
                        {hasStripe && (
                            <Button variant="outline" onClick={() => portal.mutate()} loading={portal.isPending} disabled={portal.isPending}>
                                {!portal.isPending && <CreditCard />} {t("page.updatePayment")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {overview.trial_ends_at && overview.status === SubscriptionStatuses.TRIALING && (
                    <div>
                        <dt className="text-xs text-muted-foreground">{t("page.trialEnds")}</dt>
                        <dd className="font-medium">{formatDate(overview.trial_ends_at)}</dd>
                    </div>
                )}
                {overview.next_charge && (
                    <div>
                        <dt className="text-xs text-muted-foreground">{t("page.nextCharge")}</dt>
                        <dd className="font-medium">
                            {formatDate(overview.next_charge.date)}
                            {overview.next_charge.amount_cents != null && ` · ${formatMoney(overview.next_charge.amount_cents, overview.price.currency)}`}
                        </dd>
                    </div>
                )}
                {overview.cancel_at_period_end && overview.current_period_end && (
                    <div>
                        <dt className="text-xs text-muted-foreground">{t("page.endsOn")}</dt>
                        <dd className="font-medium">{formatDate(overview.current_period_end)}</dd>
                    </div>
                )}
                {(overview.seats.total > 1 || overview.seats.extra_seats_allowed) && (
                    <div>
                        <dt className="text-xs text-muted-foreground">{t("page.seats")}</dt>
                        <dd className="font-medium">
                            {t("page.seatsUsed", { used: overview.seats.used, total: overview.seats.total })}
                            {overview.seats.extra_seat_price && (
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {t("page.extraSeatPrice", { price: formatMoney(overview.seats.extra_seat_price.amount_cents, overview.seats.extra_seat_price.currency) })}
                                </span>
                            )}
                        </dd>
                    </div>
                )}
            </dl>

            {pending && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    <span className="flex items-center gap-2">
                        <CalendarClock className="size-4 text-primary" />
                        {t("page.scheduledChange", {
                            plan: getPlanLabel(pending.plan ?? overview.plan),
                            interval: getBillingIntervalLabel(pending.interval ?? overview.interval).toLowerCase(),
                            date: formatDate(pending.effective_at),
                        })}
                    </span>
                    {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => resume.mutate()} loading={resume.isPending} disabled={resume.isPending}>
                            {!resume.isPending && <Undo2 />} {t("page.undo")}
                        </Button>
                    )}
                </div>
            )}

            {canManage && hasStripe && (
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    {overview.cancel_at_period_end ? (
                        <Button variant="outline" onClick={() => resume.mutate()} loading={resume.isPending} disabled={resume.isPending}>
                            {!resume.isPending && <RotateCcw />} {t("page.resume")}
                        </Button>
                    ) : (
                        !overview.read_only && (
                            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancel}>
                                <XCircle /> {t("page.cancelPlan")}
                            </Button>
                        )
                    )}
                </div>
            )}
        </Card>
    );
}
