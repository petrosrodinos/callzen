import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IntervalToggle, PlanCards } from "@/components/billing/plan-cards";
import { formatMoney, createClientId } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api-error";
import { useChangePlan, usePlans, usePreviewPlanChange } from "@/features/billing/hooks/use-billing";
import {
    BillingIntervals,
    PlanKeys,
    type BillingInterval,
    type BillingOverview,
    type PlanKey,
    type SeatsInUseDetails,
} from "@/features/billing/interfaces/billing.interfaces";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";

interface ChangePlanDialogProps {
    overview: BillingOverview;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Upgrades apply immediately (prorated), downgrades and yearly → monthly at the end of the period (§11a). The
// price is always previewed before anything is charged.
export function ChangePlanDialog({ overview, open, onOpenChange }: ChangePlanDialogProps) {
    const { t } = useTranslation("billing");
    const { data: catalog, isPending } = usePlans();
    const preview = usePreviewPlanChange();
    const change = useChangePlan();
    const isPaidCurrent = overview.plan !== PlanKeys.TRIAL && !overview.read_only;
    const [plan, setPlan] = useState<PlanKey>(isPaidCurrent ? overview.plan : PlanKeys.PRO);
    const [interval, setInterval] = useState<BillingInterval>(overview.interval ?? BillingIntervals.MONTH);
    const [extraSeats, setExtraSeats] = useState(overview.seats.extra);

    const paidPlans = useMemo(() => catalog?.plans.filter((item) => item.is_paid) ?? [], [catalog]);
    const selected = paidPlans.find((item) => item.key === plan);
    const seatsAllowed = !!selected?.limits.extra_seats_allowed;
    // Debounced as a primitive key so the preview only runs when the selection really changes.
    const selectionKey = useDebouncedValue(`${plan}|${interval}|${seatsAllowed ? extraSeats : 0}`, 300);
    const selection = useMemo(() => {
        const [keyPlan, keyInterval, keySeats] = selectionKey.split("|");
        return { plan: keyPlan as PlanKey, interval: keyInterval as BillingInterval, extra_seats: Number(keySeats) };
    }, [selectionKey]);
    // One key per selection (and per opening): a double click never double-charges.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new key is wanted exactly when these change
    const idempotencyKey = useMemo(() => createClientId(), [selectionKey, open]);
    const unchanged =
        isPaidCurrent &&
        selection.plan === overview.plan &&
        selection.interval === (overview.interval ?? BillingIntervals.MONTH) &&
        selection.extra_seats === overview.seats.extra;

    const { mutate: runPreview, reset: resetPreview } = preview;
    useEffect(() => {
        if (!open) return;
        if (unchanged) {
            resetPreview();
            return;
        }
        runPreview(selection);
    }, [open, selection, unchanged, runPreview, resetPreview]);

    const seatsError = preview.error instanceof ApiError && preview.error.code === "SEATS_IN_USE" ? (preview.error.details as unknown as SeatsInUseDetails) : null;
    const result = preview.data;

    return (
        <Dialog open={open} onOpenChange={(next) => !change.isPending && onOpenChange(next)}>
            <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>{t("change.title")}</DialogTitle>
                    <DialogDescription>{t("change.description")}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <IntervalToggle value={interval} onChange={setInterval} />
                    {seatsAllowed && (
                        <div className="flex items-center gap-2 text-sm">
                            <span>{t("change.extraSeats")}</span>
                            <Button type="button" size="icon" variant="outline" className="size-8" aria-label={t("change.removeSeat")} onClick={() => setExtraSeats((n) => Math.max(0, n - 1))}>
                                <Minus />
                            </Button>
                            <span className="w-8 text-center font-medium tabular-nums">{extraSeats}</span>
                            <Button type="button" size="icon" variant="outline" className="size-8" aria-label={t("change.addSeat")} onClick={() => setExtraSeats((n) => Math.min(500, n + 1))}>
                                <Plus />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {t("change.totalSeats", { count: (selected?.limits.seats_included ?? 0) + extraSeats })}
                            </span>
                        </div>
                    )}
                </div>

                {isPending ? (
                    <div className="grid gap-3 md:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-80 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <PlanCards plans={paidPlans} interval={interval} currentPlan={isPaidCurrent ? overview.plan : null} selectedPlan={plan} onSelect={setPlan} />
                )}

                <div className="min-h-16 rounded-lg border bg-muted/30 p-3 text-sm" aria-live="polite">
                    {unchanged ? (
                        <p className="text-muted-foreground">{t("change.sameAsCurrent")}</p>
                    ) : preview.isPending ? (
                        <Skeleton className="h-5 w-2/3" />
                    ) : seatsError ? (
                        <div className="flex gap-2 text-destructive">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <div>
                                <p className="font-medium">{t("change.seatsBlockedTitle")}</p>
                                <ul className="mt-1 list-disc pl-4 text-foreground">
                                    <li>{t("change.seatsBlockedAfter", { count: seatsError.seats_after })}</li>
                                    <li>{t("change.seatsBlockedUsed", { members: seatsError.members, invitations: seatsError.pending_invitations })}</li>
                                    <li>{t("change.seatsBlockedRemove", { count: seatsError.to_remove })}</li>
                                </ul>
                            </div>
                        </div>
                    ) : preview.error ? (
                        <p className="text-destructive">{preview.error.message}</p>
                    ) : result ? (
                        <p>
                            {result.mode === "checkout"
                                ? t("change.previewCheckout", { amount: formatMoney(result.next_amount_cents ?? 0, result.currency) })
                                : result.mode === "scheduled"
                                  ? t("change.previewScheduled", {
                                        plan: getPlanLabel(plan),
                                        date: formatDate(result.effective_at ?? result.next_charge_at ?? new Date()),
                                        amount: formatMoney(result.next_amount_cents ?? 0, result.currency),
                                    })
                                  : result.next_charge_at
                                    ? t("change.previewImmediate", {
                                          now: formatMoney(result.amount_due_now_cents, result.currency),
                                          next: formatMoney(result.next_amount_cents ?? 0, result.currency),
                                          date: formatDate(result.next_charge_at),
                                      })
                                    : t("change.previewImmediateNoDate", { now: formatMoney(result.amount_due_now_cents, result.currency) })}
                        </p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>
                        {t("actions.cancel")}
                    </Button>
                    <Button
                        disabled={unchanged || !result || preview.isPending || !!preview.error || change.isPending}
                        loading={change.isPending}
                        onClick={() =>
                            change.mutate(
                                { ...selection, idempotency_key: idempotencyKey },
                                { onSuccess: (outcome) => outcome.mode !== "checkout" && onOpenChange(false) },
                            )
                        }
                    >
                        {result?.mode === "checkout"
                            ? t("change.continueToPayment")
                            : result?.mode === "scheduled"
                              ? t("change.confirmScheduled")
                              : t("change.confirmNow")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
