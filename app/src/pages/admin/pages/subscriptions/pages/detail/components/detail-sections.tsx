import { useTranslation } from "react-i18next";
import { Check, ExternalLink, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCost, formatMinutes, formatMoney, formatNumber } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/date";
import type { AdminKindConsumption, AdminSubscriptionDetail } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import {
    getBillingIntervalLabel,
    getPlanLabel,
    getSubscriptionEventTypeLabel,
    getSubscriptionSourceLabel,
    getSubscriptionStatusLabel,
    SubscriptionEventTypeOptions,
} from "@/config/constants/dropdowns/billing/plan.options";
import { getActorKindLabel } from "@/config/constants/dropdowns/billing/admin-billing.options";
import { PlanFeatureOptions, PlanLimitOptions } from "@/config/constants/dropdowns/billing/plan-feature.options";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";

const ALL = "all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium">{children ?? "—"}</dd>
        </div>
    );
}

export function SummarySection({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const { organisation, subscription, stripe_links: links } = detail;
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-4 font-semibold">{t("detail.summary")}</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Field label={t("detail.owner")}>{organisation.owner ? `${organisation.owner.name} · ${organisation.owner.email}` : "—"}</Field>
                <Field label={t("detail.members")}>{organisation.members_count}</Field>
                <Field label={t("detail.plan")}>
                    {getPlanLabel(detail.entitlements.plan)}{" "}
                    <Badge variant="outline">{getSubscriptionStatusLabel(detail.entitlements.status, subscription?.cancel_at_period_end)}</Badge>
                </Field>
                <Field label={t("detail.source")}>{subscription ? getSubscriptionSourceLabel(subscription.source) : t("detail.noSubscription")}</Field>
                <Field label={t("detail.interval")}>{subscription?.billing_interval ? getBillingIntervalLabel(subscription.billing_interval) : "—"}</Field>
                <Field label={t("detail.pricePerMonth")}>{subscription ? formatMoney(subscription.price_per_month_cents, subscription.currency) : "—"}</Field>
                <Field label={t("detail.period")}>
                    {formatDate(detail.entitlements.period.start)} – {formatDate(detail.entitlements.period.end)}
                </Field>
                <Field label={t("detail.trialEnds")}>{subscription?.trial_ends_at ? formatDate(subscription.trial_ends_at) : "—"}</Field>
                {subscription?.pending_plan && subscription.pending_change_at && (
                    <Field label={t("detail.scheduledChange")}>
                        {getPlanLabel(subscription.pending_plan)} · {formatDate(subscription.pending_change_at)}
                    </Field>
                )}
                {subscription?.cancel_at_period_end && <Field label={t("detail.cancelsOn")}>{formatDate(subscription.current_period_end)}</Field>}
                {subscription?.cancel_reason && <Field label={t("detail.cancelReason")}>{subscription.cancel_reason}</Field>}
                <Field label={t("detail.created")}>{formatDate(organisation.created_at)}</Field>
            </dl>
            {(links.customer || links.subscription || subscription?.drift_detected_at) && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
                    {links.customer && (
                        <a href={links.customer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            {t("detail.stripeCustomer")} <ExternalLink className="size-3" />
                        </a>
                    )}
                    {links.subscription && (
                        <a href={links.subscription} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            {t("detail.stripeSubscription")} <ExternalLink className="size-3" />
                        </a>
                    )}
                    {subscription?.drift_detected_at && <Badge variant="destructive">{t("detail.driftDetected", { date: formatDateTime(subscription.drift_detected_at) })}</Badge>}
                </div>
            )}
        </Card>
    );
}

function PoolRow({ label, consumption }: { label: string; consumption: AdminKindConsumption }) {
    const { t } = useTranslation("subscriptions");
    return (
        <TableRow>
            <TableCell className="font-medium">{label}</TableCell>
            <TableCell className="text-right tabular-nums">
                {formatMinutes(consumption.used_minutes)} / {consumption.pool_minutes == null ? t("detail.unlimited") : formatMinutes(consumption.pool_minutes)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMinutes(consumption.owners_minutes)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMinutes(consumption.others_minutes)}</TableCell>
            <TableCell className="text-right tabular-nums">{consumption.owner_reserve_minutes == null ? "—" : formatMinutes(consumption.owner_reserve_minutes)}</TableCell>
            <TableCell className="text-right tabular-nums">{consumption.member_cap_minutes == null ? "—" : formatMinutes(consumption.member_cap_minutes)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMinutes(consumption.team_credit_minutes_used)}</TableCell>
        </TableRow>
    );
}

export function LimitsSection({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const { limits, features } = detail.entitlements;
    const value = (id: string) => {
        const raw = (limits as unknown as Record<string, number | boolean | null>)[id];
        if (typeof raw === "boolean") return raw ? t("detail.yes") : t("detail.no");
        return raw == null ? t("detail.unlimited") : formatNumber(raw);
    };
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-1 font-semibold">{t("detail.limits")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("detail.limitsHint")}</p>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("detail.minutes")}</TableHead>
                            <TableHead className="text-right">{t("detail.usedOfPool")}</TableHead>
                            <TableHead className="text-right">{t("detail.owners")}</TableHead>
                            <TableHead className="text-right">{t("detail.others")}</TableHead>
                            <TableHead className="text-right">{t("detail.reserve")}</TableHead>
                            <TableHead className="text-right">{t("detail.memberCap")}</TableHead>
                            <TableHead className="text-right">{t("detail.teamCreditsUsed")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <PoolRow label={t("detail.live")} consumption={detail.consumption.live} />
                        {!limits.practice_shares_live_pool && <PoolRow label={t("detail.practice")} consumption={detail.consumption.practice} />}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {PlanLimitOptions.map((option) => (
                        <div key={option.id} className="contents">
                            <dt className="text-muted-foreground">{option.label}</dt>
                            <dd className="text-right font-medium tabular-nums">{value(option.id)}</dd>
                        </div>
                    ))}
                    <dt className="text-muted-foreground">{t("detail.seatsTotal")}</dt>
                    <dd className="text-right font-medium tabular-nums">{detail.entitlements.seats_total}</dd>
                    <dt className="text-muted-foreground">{t("detail.usage")}</dt>
                    <dd className="text-right font-medium tabular-nums">
                        {t("detail.usageCounts", {
                            uploads: detail.consumption.uploads,
                            copilots: detail.consumption.copilots,
                            prospects: detail.consumption.practice_prospects,
                        })}
                    </dd>
                </dl>
                <ul className="space-y-1.5 text-sm">
                    {PlanFeatureOptions.map((option) => (
                        <li key={option.id} className={cn("flex items-center gap-2", !features[option.id] && "text-muted-foreground")}>
                            {features[option.id] ? <Check className="size-4 text-primary" /> : <Minus className="size-4" />} {option.label}
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
}

export function CreditsAndPeriodsSection({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gap-0 p-5">
                <h2 className="mb-3 font-semibold">{t("detail.credits")}</h2>
                <dl className="space-y-3 text-sm">
                    <Field label={t("detail.teamBalance")}>
                        {t("detail.balance", { live: formatMinutes(detail.credits.team.live_minutes), practice: formatMinutes(detail.credits.team.practice_minutes) })}
                    </Field>
                    <Field label={t("detail.personalTotal")}>
                        {t("detail.balance", {
                            live: formatMinutes(detail.credits.personal_total.live_minutes),
                            practice: formatMinutes(detail.credits.personal_total.practice_minutes),
                        })}
                    </Field>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">{t("detail.personalPrivate")}</p>
            </Card>
            <Card className="gap-0 p-5 lg:col-span-2">
                <h2 className="mb-3 font-semibold">{t("detail.periods")}</h2>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("detail.periodColumn")}</TableHead>
                                <TableHead className="text-right">{t("detail.minutes")}</TableHead>
                                <TableHead className="text-right">{t("detail.charged")}</TableHead>
                                <TableHead className="text-right">{t("detail.base")}</TableHead>
                                <TableHead className="text-right">{t("detail.revenue")}</TableHead>
                                <TableHead className="text-right">{t("detail.margin")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detail.periods.map((period) => {
                                const revenue = period.revenue_cents / 100;
                                const margin = revenue - period.base_cost_usd;
                                return (
                                    <TableRow key={period.start}>
                                        <TableCell className="whitespace-nowrap">{formatDate(period.start)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatMinutes(period.live_minutes)} / {formatMinutes(period.practice_minutes)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCost(period.charged_cost_usd)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatCost(period.base_cost_usd)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMoney(period.revenue_cents)}</TableCell>
                                        <TableCell className={cn("text-right tabular-nums", margin < 0 && "text-destructive")}>{formatCost(margin)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("detail.periodsHint")}</p>
            </Card>
        </div>
    );
}

export function MembersSection({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const withCap = (used: number, cap: number | null) => (cap == null ? formatMinutes(used) : `${formatMinutes(used)} / ${formatMinutes(cap)}`);
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("detail.membersTitle")}</h2>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("detail.member")}</TableHead>
                            <TableHead>{t("detail.role")}</TableHead>
                            <TableHead className="text-right">{t("detail.live")}</TableHead>
                            <TableHead className="text-right">{t("detail.practice")}</TableHead>
                            <TableHead className="text-right">{t("detail.personalCredits")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {detail.members.map((member) => (
                            <TableRow key={member.user_id}>
                                <TableCell>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                </TableCell>
                                <TableCell>{getOrgRoleLabel(member.role)}</TableCell>
                                <TableCell className="text-right tabular-nums">{withCap(member.live_minutes, member.live_cap_minutes)}</TableCell>
                                <TableCell className="text-right tabular-nums">{withCap(member.practice_minutes, member.practice_cap_minutes)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatMinutes(member.personal_credit_minutes.live)} / {formatMinutes(member.personal_credit_minutes.practice)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

export function TimelineSection({ detail, eventType, onEventTypeChange }: { detail: AdminSubscriptionDetail; eventType: string; onEventTypeChange: (type: string) => void }) {
    const { t } = useTranslation("subscriptions");
    return (
        <Card className="gap-0 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t("detail.timeline")}</h2>
                <Select value={eventType || ALL} onValueChange={(value) => onEventTypeChange(value === ALL ? "" : value)}>
                    <SelectTrigger className="w-56" aria-label={t("detail.eventType")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>{t("detail.allEvents")}</SelectItem>
                        {SubscriptionEventTypeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {!detail.timeline.length ? (
                <p className="text-sm text-muted-foreground">{t("detail.noEvents")}</p>
            ) : (
                <ol className="relative space-y-4 border-l pl-4">
                    {detail.timeline.map((event) => (
                        <li key={event.id} className="text-sm">
                            <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                            <p className="font-medium">
                                {getSubscriptionEventTypeLabel(event.type)}
                                {event.to_plan && event.from_plan !== event.to_plan && (
                                    <span className="font-normal text-muted-foreground">
                                        {" "}
                                        · {event.from_plan ? `${getPlanLabel(event.from_plan)} → ` : ""}
                                        {getPlanLabel(event.to_plan)}
                                    </span>
                                )}
                            </p>
                            {event.note && <p className="text-muted-foreground">{event.note}</p>}
                            {Object.keys(event.data ?? {}).length > 0 && (
                                <p className="break-all font-mono text-[11px] text-muted-foreground">{JSON.stringify(event.data)}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(event.created_at)} · {getActorKindLabel(event.actor_kind)}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

export function NotesSection({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const { manual_note: manualNote, log } = detail.notes;
    if (!manualNote && !log.length) return null;
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("detail.notes")}</h2>
            {manualNote && <p className="mb-3 rounded-lg bg-muted/40 p-3 text-sm">{manualNote}</p>}
            <ul className="space-y-2 text-sm">
                {log.map((entry) => (
                    <li key={`${entry.created_at}-${entry.type}`}>
                        <p>{entry.note}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDateTime(entry.created_at)} · {getSubscriptionEventTypeLabel(entry.type)} · {getActorKindLabel(entry.actor_kind)}
                        </p>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
