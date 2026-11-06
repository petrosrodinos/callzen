import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/format";
import { PlanKeys, BillingIntervals, type BillingInterval, type CatalogPlan, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";
import { getPlanDescription, getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { PlanFeatureOptions } from "@/config/constants/dropdowns/billing/plan-feature.options";

// The headline price of a plan for an interval, from Stripe amounts (§2.1). Yearly is also shown per month.
export function PlanPrice({ plan, interval }: { plan: CatalogPlan; interval: BillingInterval }) {
    const { t } = useTranslation("billing");
    const amount = interval === BillingIntervals.YEAR ? plan.prices?.yearly : plan.prices?.monthly;
    if (!plan.is_paid) return <p className="text-2xl font-semibold">{t("plans.free")}</p>;
    if (!amount) return <p className="text-sm text-muted-foreground">{t("plans.priceUnavailable")}</p>;
    return (
        <div>
            <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(interval === BillingIntervals.YEAR ? Math.round(amount.amount_cents / 12) : amount.amount_cents, amount.currency)}
                <span className="text-sm font-normal text-muted-foreground"> {t("plans.perMonth")}</span>
            </p>
            {interval === BillingIntervals.YEAR && (
                <p className="text-xs text-muted-foreground">{t("plans.billedYearly", { amount: formatMoney(amount.amount_cents, amount.currency) })}</p>
            )}
            {plan.key === PlanKeys.COACH && (interval === BillingIntervals.YEAR ? plan.prices?.extra_seat_yearly : plan.prices?.extra_seat_monthly) && (
                <p className="text-xs text-muted-foreground">
                    {t("plans.extraSeatPrice", {
                        amount: formatMoney(
                            (interval === BillingIntervals.YEAR ? plan.prices?.extra_seat_yearly : plan.prices?.extra_seat_monthly)!.amount_cents,
                            plan.prices?.monthly?.currency ?? "usd",
                        ),
                        interval: interval === BillingIntervals.YEAR ? t("plans.perYear") : t("plans.perMonth"),
                    })}
                </p>
            )}
        </div>
    );
}

const amount = (value: number | null, unit: string, unlimited: string) => (value == null ? unlimited : `${formatNumber(value)} ${unit}`);

export function PlanHighlights({ plan }: { plan: CatalogPlan }) {
    const { t } = useTranslation("billing");
    const { limits, features } = plan;
    const unlimited = t("plans.unlimited");
    const rows = [
        limits.practice_shares_live_pool
            ? t("plans.sharedMinutes", { minutes: amount(limits.live_minutes_per_period, t("plans.min"), unlimited) })
            : t("plans.liveMinutes", { minutes: amount(limits.live_minutes_per_period, t("plans.min"), unlimited) }),
        !limits.practice_shares_live_pool && t("plans.practiceMinutes", { minutes: amount(limits.practice_minutes_per_period, t("plans.min"), unlimited) }),
        t("plans.seats", { count: limits.seats_included }),
        t("plans.copilots", { value: limits.copilots_max == null ? unlimited : formatNumber(limits.copilots_max) }),
        t("plans.prospects", { value: limits.practice_prospects_max == null ? unlimited : formatNumber(limits.practice_prospects_max) }),
        t("plans.uploads", { value: limits.uploads_per_period == null ? unlimited : formatNumber(limits.uploads_per_period) }),
        limits.trial_days && t("plans.trialDays", { count: limits.trial_days }),
        ...PlanFeatureOptions.filter((option) => features[option.id]).map((option) => option.label),
    ].filter(Boolean) as string[];
    return (
        <ul className="space-y-1.5 text-sm">
            {rows.map((row) => (
                <li key={row} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{row}</span>
                </li>
            ))}
        </ul>
    );
}

interface PlanCardsProps {
    plans: CatalogPlan[];
    interval: BillingInterval;
    currentPlan?: PlanKey | null;
    selectedPlan?: PlanKey | null;
    recommended?: PlanKey;
    onSelect?: (plan: PlanKey) => void;
    renderFooter?: (plan: CatalogPlan) => ReactNode;
    className?: string;
}

export function PlanCards({ plans, interval, currentPlan, selectedPlan, recommended = PlanKeys.PRO, onSelect, renderFooter, className }: PlanCardsProps) {
    const { t } = useTranslation("billing");
    return (
        <div className={cn("grid gap-3 md:grid-cols-3", className)} role={onSelect ? "radiogroup" : undefined} aria-label={onSelect ? t("plans.choose") : undefined}>
            {plans.map((plan) => {
                const selected = selectedPlan === plan.key;
                const Wrapper = onSelect ? "button" : "div";
                return (
                    <Wrapper
                        key={plan.key}
                        {...(onSelect && { type: "button" as const, role: "radio", "aria-checked": selected, onClick: () => onSelect(plan.key) })}
                        className={cn(
                            "flex flex-col gap-4 rounded-xl border bg-card p-5 text-left transition-colors",
                            onSelect && "hover:border-primary/50",
                            selected && "border-primary bg-primary/5 ring-1 ring-primary",
                        )}
                    >
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold">{getPlanLabel(plan.key)}</h3>
                                {plan.key === recommended && (
                                    <Badge className="gap-1 bg-primary/10 text-primary shadow-none hover:bg-primary/10">
                                        <Star className="size-3" /> {t("plans.popular")}
                                    </Badge>
                                )}
                                {plan.key === currentPlan && <Badge variant="outline">{t("plans.current")}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{getPlanDescription(plan.key)}</p>
                        </div>
                        <PlanPrice plan={plan} interval={interval} />
                        <PlanHighlights plan={plan} />
                        {renderFooter && <div className="mt-auto pt-2">{renderFooter(plan)}</div>}
                    </Wrapper>
                );
            })}
        </div>
    );
}

export function IntervalToggle({ value, onChange }: { value: BillingInterval; onChange: (interval: BillingInterval) => void }) {
    const { t } = useTranslation("billing");
    return (
        <div role="radiogroup" aria-label={t("plans.billingInterval")} className="inline-flex rounded-lg border bg-muted/40 p-1 text-sm">
            {[BillingIntervals.MONTH, BillingIntervals.YEAR].map((interval) => (
                <button
                    key={interval}
                    type="button"
                    role="radio"
                    aria-checked={value === interval}
                    onClick={() => onChange(interval)}
                    className={cn("rounded-md px-3 py-1.5 transition-colors", value === interval ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
                >
                    {interval === BillingIntervals.MONTH ? t("plans.monthly") : t("plans.yearly")}
                    {interval === BillingIntervals.YEAR && <span className="ml-1.5 text-xs text-primary">{t("plans.yearlySaving")}</span>}
                </button>
            ))}
        </div>
    );
}
