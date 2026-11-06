import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgePercent, CalendarPlus, Clock, Crown, MoreHorizontal, RefreshCcw, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import {
    useAdminCancelSubscription,
    useAdminResumeSubscription,
    useApplyDiscount,
    useAssignManualPlan,
    useExtendTrial,
    useGrantCredits,
    useSyncSubscription,
} from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import type { AdminSubscriptionDetail } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import { PlanKeys, SubscriptionSources, SubscriptionStatuses, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";
import { PlanFormOptions } from "@/config/constants/dropdowns/billing/plan.options";
import { AdminCancelModeOptions } from "@/config/constants/dropdowns/billing/admin-billing.options";
import { AdminActionDialog } from "../../../components/admin-action-dialog";

type Action = "assign" | "trial" | "credits" | "discount" | "cancel" | "resume" | "sync" | null;
const TEAM = "team";

// Admin actions (§11b). Each one is recorded as a SubscriptionEvent by the API; destructive ones need the
// organisation name typed in.
export function SubscriptionActions({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const isSuperAdmin = useAuthStore((state) => state.role) === RoleTypes.SUPER_ADMIN;
    const [action, setAction] = useState<Action>(null);
    const organisationId = detail.organisation.id;
    const name = detail.organisation.name;
    const subscription = detail.subscription;
    const isStripe = subscription?.source === SubscriptionSources.STRIPE && !!subscription.stripe_subscription_id;
    const isActiveStripe = isStripe && subscription?.status !== SubscriptionStatuses.CANCELED;
    const close = () => setAction(null);

    const assign = useAssignManualPlan();
    const trial = useExtendTrial();
    const credits = useGrantCredits();
    const discount = useApplyDiscount();
    const cancel = useAdminCancelSubscription();
    const resume = useAdminResumeSubscription();
    const sync = useSyncSubscription();

    const [plan, setPlan] = useState<PlanKey>(PlanKeys.COACH);
    const [extraSeats, setExtraSeats] = useState("0");
    const [periodEnd, setPeriodEnd] = useState("");
    const [note, setNote] = useState("");
    const [days, setDays] = useState("14");
    const [liveMinutes, setLiveMinutes] = useState("0");
    const [practiceMinutes, setPracticeMinutes] = useState("0");
    const [creditTarget, setCreditTarget] = useState<string>(TEAM);
    const [coupon, setCoupon] = useState("");
    const [cancelMode, setCancelMode] = useState<"at_period_end" | "immediate">("at_period_end");
    const [refund, setRefund] = useState(false);

    const open = (next: Action) => {
        setNote("");
        setAction(next);
    };
    const onSuccess = { onSuccess: close };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {!isActiveStripe && (
                    <Button size="sm" onClick={() => open("assign")}>
                        <Crown /> {t("actions.assignPlan")}
                    </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => open("credits")}>
                    <Clock /> {t("actions.grantMinutes")}
                </Button>
                {isStripe && (
                    <Button size="sm" variant="outline" onClick={() => sync.mutate(organisationId)} loading={sync.isPending} disabled={sync.isPending}>
                        {!sync.isPending && <RefreshCcw />} {t("actions.sync")}
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" aria-label={t("actions.more")}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!subscription?.trial_ends_at} onSelect={() => open("trial")}>
                            <CalendarPlus /> {t("actions.extendTrial")}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!isActiveStripe} onSelect={() => open("discount")}>
                            <BadgePercent /> {t("actions.discount")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {subscription?.cancel_at_period_end ? (
                            <DropdownMenuItem onSelect={() => open("resume")}>
                                <RotateCcw /> {t("actions.resume")}
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem disabled={!isActiveStripe} className="text-destructive" onSelect={() => open("cancel")}>
                                <XCircle /> {t("actions.cancelSubscription")}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AdminActionDialog
                open={action === "assign"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.assignPlan")}
                description={t("actions.assignPlanHint")}
                confirmLabel={t("actions.assign")}
                canConfirm={!!note.trim()}
                isPending={assign.isPending}
                onConfirm={() =>
                    assign.mutate(
                        {
                            organisationId,
                            dto: {
                                plan,
                                extra_seats: plan === PlanKeys.COACH ? Number(extraSeats) || 0 : undefined,
                                period_end: periodEnd ? new Date(`${periodEnd}T23:59:59`).toISOString() : undefined,
                                note: note.trim(),
                            },
                        },
                        onSuccess,
                    )
                }
            >
                <Select value={plan} onValueChange={(value) => setPlan(value as PlanKey)}>
                    <Label>{t("actions.plan")}</Label>
                    <SelectTrigger aria-label={t("actions.plan")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PlanFormOptions.filter((option) => option.id !== PlanKeys.TRIAL).map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {plan === PlanKeys.COACH && (
                    <div className="space-y-1">
                        <Label htmlFor="extra-seats">{t("actions.extraSeats")}</Label>
                        <Input id="extra-seats" type="number" min={0} value={extraSeats} onChange={(event) => setExtraSeats(event.target.value)} />
                    </div>
                )}
                <div className="space-y-1">
                    <Label htmlFor="period-end">{t("actions.periodEnd")}</Label>
                    <Input id="period-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("actions.periodEndHint")}</p>
                </div>
                <NoteField value={note} onChange={setNote} required />
            </AdminActionDialog>

            <AdminActionDialog
                open={action === "trial"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.extendTrial")}
                confirmLabel={t("actions.extend")}
                canConfirm={Number(days) > 0}
                isPending={trial.isPending}
                onConfirm={() => trial.mutate({ organisationId, dto: { days: Number(days), note: note.trim() || undefined } }, onSuccess)}
            >
                <div className="space-y-1">
                    <Label htmlFor="trial-days">{t("actions.days")}</Label>
                    <Input id="trial-days" type="number" min={1} max={365} value={days} onChange={(event) => setDays(event.target.value)} />
                </div>
                <NoteField value={note} onChange={setNote} />
            </AdminActionDialog>

            <AdminActionDialog
                open={action === "credits"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.grantMinutes")}
                description={t("actions.grantMinutesHint")}
                confirmLabel={t("actions.grant")}
                canConfirm={Number(liveMinutes) > 0 || Number(practiceMinutes) > 0}
                isPending={credits.isPending}
                onConfirm={() =>
                    credits.mutate(
                        {
                            organisationId,
                            dto: {
                                live_minutes: Number(liveMinutes) || 0,
                                practice_minutes: Number(practiceMinutes) || 0,
                                user_id: creditTarget === TEAM ? undefined : creditTarget,
                                note: note.trim() || undefined,
                            },
                        },
                        onSuccess,
                    )
                }
            >
                <Select value={creditTarget} onValueChange={setCreditTarget}>
                    <Label>{t("actions.grantTo")}</Label>
                    <SelectTrigger aria-label={t("actions.grantTo")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TEAM}>{t("actions.teamPool")}</SelectItem>
                        {detail.members.map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id}>
                                {member.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="grant-live">{t("actions.liveMinutes")}</Label>
                        <Input id="grant-live" type="number" min={0} value={liveMinutes} onChange={(event) => setLiveMinutes(event.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="grant-practice">{t("actions.practiceMinutes")}</Label>
                        <Input id="grant-practice" type="number" min={0} value={practiceMinutes} onChange={(event) => setPracticeMinutes(event.target.value)} />
                    </div>
                </div>
                <NoteField value={note} onChange={setNote} />
            </AdminActionDialog>

            <AdminActionDialog
                open={action === "discount"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.discount")}
                description={t("actions.discountHint")}
                confirmLabel={t("actions.apply")}
                canConfirm={!!coupon.trim()}
                isPending={discount.isPending}
                onConfirm={() => discount.mutate({ organisationId, couponId: coupon.trim() }, onSuccess)}
            >
                <div className="space-y-1">
                    <Label htmlFor="coupon-id">{t("actions.couponId")}</Label>
                    <Input id="coupon-id" value={coupon} onChange={(event) => setCoupon(event.target.value)} autoComplete="off" />
                </div>
            </AdminActionDialog>

            <AdminActionDialog
                open={action === "cancel"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.cancelTitle")}
                description={cancelMode === "immediate" ? t("actions.cancelImmediateHint") : t("actions.cancelAtPeriodEndHint")}
                confirmLabel={t("actions.cancelConfirm")}
                destructive
                confirmName={name}
                isPending={cancel.isPending}
                onConfirm={(confirmName) =>
                    cancel.mutate(
                        {
                            organisationId,
                            dto: { mode: cancelMode, refund: cancelMode === "immediate" ? refund : undefined, confirm_name: confirmName, note: note.trim() || undefined },
                        },
                        onSuccess,
                    )
                }
            >
                <Select value={cancelMode} onValueChange={(value) => setCancelMode(value as typeof cancelMode)}>
                    <Label>{t("actions.cancelMode")}</Label>
                    <SelectTrigger aria-label={t("actions.cancelMode")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {AdminCancelModeOptions.filter((option) => isSuperAdmin || option.id !== "immediate").map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {cancelMode === "immediate" && (
                    <label className="flex items-center gap-2 text-sm">
                        <Switch checked={refund} onCheckedChange={setRefund} /> {t("actions.proratedRefund")}
                    </label>
                )}
                <NoteField value={note} onChange={setNote} />
            </AdminActionDialog>

            <AdminActionDialog
                open={action === "resume"}
                onOpenChange={(next) => !next && close()}
                title={t("actions.resume")}
                description={t("actions.resumeHint")}
                confirmLabel={t("actions.resume")}
                isPending={resume.isPending}
                onConfirm={() => resume.mutate(organisationId, onSuccess)}
            />
        </>
    );
}

function NoteField({ value, onChange, required }: { value: string; onChange: (value: string) => void; required?: boolean }) {
    const { t } = useTranslation("subscriptions");
    return (
        <div className="space-y-1">
            <Label htmlFor="admin-note">{required ? t("actions.noteRequired") : t("actions.note")}</Label>
            <Textarea id="admin-note" rows={2} maxLength={1000} value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}
