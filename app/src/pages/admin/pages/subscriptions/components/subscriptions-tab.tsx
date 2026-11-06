import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Download, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCost, formatMoney, formatNumber } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminSubscriptions, useExportAdminSubscriptions } from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import {
    AdminSubscriptionSortKeys,
    type AdminSubscriptionSortKey,
    type AdminSubscriptionsQuery,
} from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import type { PlanKey, SubscriptionSource, SubscriptionStatus } from "@/features/billing/interfaces/billing.interfaces";
import {
    getPlanLabel,
    getSubscriptionSourceLabel,
    getSubscriptionStatusLabel,
    PlanFilterOptions,
    SubscriptionSourceOptions,
    SubscriptionStatusFilterOptions,
} from "@/config/constants/dropdowns/billing/plan.options";
import { Routes } from "@/routes/routes";
import { SummaryTiles } from "./summary-tiles";

const ALL = "all";
const PAGE_SIZE = 25;

export function SubscriptionsTab() {
    const { t } = useTranslation("subscriptions");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<AdminSubscriptionsQuery>({
        page: 1,
        order_by: AdminSubscriptionSortKeys.CREATED_AT,
        order_direction: "desc",
    });
    const debouncedSearch = useDebouncedValue(search, 300);
    const query: AdminSubscriptionsQuery = { ...filters, limit: PAGE_SIZE, search: debouncedSearch || undefined };
    const { data, isPending, isFetching, refetch } = useAdminSubscriptions(query);
    const exportCsv = useExportAdminSubscriptions();
    const set = (patch: Partial<AdminSubscriptionsQuery>) => setFilters((current) => ({ ...current, page: 1, ...patch }));

    const sortHeader = (key: AdminSubscriptionSortKey, label: string, className?: string) => (
        <TableHead className={className}>
            <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground"
                onClick={() =>
                    set({ order_by: key, order_direction: filters.order_by === key && filters.order_direction === "desc" ? "asc" : "desc" })
                }
            >
                {label}
                {filters.order_by === key && (filters.order_direction === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
            </button>
        </TableHead>
    );

    return (
        <div className="space-y-4">
            {data ? <SummaryTiles summary={data.summary} /> : <Skeleton className="h-24 w-full rounded-xl" />}

            <Card className="gap-3 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-56 flex-1 space-y-1">
                        <Label htmlFor="subscription-search">{t("filters.search")}</Label>
                        <Input id="subscription-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("filters.searchPlaceholder")} />
                    </div>
                    <Select value={filters.plan ?? ALL} onValueChange={(value) => set({ plan: value === ALL ? undefined : (value as PlanKey) })}>
                        <SelectTrigger className="w-36" aria-label={t("filters.plan")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PlanFilterOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status ?? ALL} onValueChange={(value) => set({ status: value === ALL ? undefined : (value as SubscriptionStatus) })}>
                        <SelectTrigger className="w-40" aria-label={t("filters.status")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SubscriptionStatusFilterOptions.filter((option) => option.id !== "NONE").map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.source ?? ALL} onValueChange={(value) => set({ source: value === ALL ? undefined : (value as SubscriptionSource) })}>
                        <SelectTrigger className="w-36" aria-label={t("filters.source")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>{t("filters.allSources")}</SelectItem>
                            {SubscriptionSourceOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="w-32 space-y-1">
                        <Label htmlFor="trial-ending">{t("filters.trialEndingDays")}</Label>
                        <Input
                            id="trial-ending"
                            type="number"
                            min={1}
                            value={filters.trial_ending_days ?? ""}
                            onChange={(event) => set({ trial_ending_days: event.target.value ? Number(event.target.value) : undefined })}
                        />
                    </div>
                    <div className="w-32 space-y-1">
                        <Label htmlFor="margin-below">{t("filters.marginBelow")}</Label>
                        <Input
                            id="margin-below"
                            type="number"
                            value={filters.margin_below ?? ""}
                            onChange={(event) => set({ margin_below: event.target.value === "" ? undefined : Number(event.target.value) })}
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    {(
                        [
                            ["cancelling", t("filters.cancelling")],
                            ["past_due", t("filters.pastDue")],
                            ["no_subscription", t("filters.noSubscription")],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2">
                            <Switch checked={!!filters[key]} onCheckedChange={(checked) => set({ [key]: checked })} /> {label}
                        </label>
                    ))}
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                            <RefreshCcw className={cn(isFetching && "animate-spin")} /> {t("actions.refresh")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportCsv.mutate(query)} loading={exportCsv.isPending} disabled={exportCsv.isPending}>
                            {!exportCsv.isPending && <Download />} {t("actions.exportCsv")}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="gap-0 p-0">
                {isPending ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : !data?.data.length ? (
                    <p className="p-6 text-sm text-muted-foreground">{t("list.empty")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {sortHeader(AdminSubscriptionSortKeys.NAME, t("list.organisation"))}
                                    <TableHead>{t("list.plan")}</TableHead>
                                    <TableHead>{t("list.seats")}</TableHead>
                                    {sortHeader(AdminSubscriptionSortKeys.MRR, t("list.pricePerMonth"), "text-right")}
                                    <TableHead>{t("list.renewal")}</TableHead>
                                    {sortHeader(AdminSubscriptionSortKeys.MINUTES_USED, t("list.minutesUsed"), "text-right")}
                                    {sortHeader(AdminSubscriptionSortKeys.AI_COST, t("list.aiCost"), "text-right")}
                                    {sortHeader(AdminSubscriptionSortKeys.MARGIN, t("list.margin"), "text-right")}
                                    <TableHead className="text-right">{t("list.failed")}</TableHead>
                                    {sortHeader(AdminSubscriptionSortKeys.CREATED_AT, t("list.created"))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((row) => (
                                    <TableRow key={row.organisation_id}>
                                        <TableCell className="min-w-48">
                                            <Link to={Routes.admin.subscription(row.organisation_id)} className="font-medium hover:underline">
                                                {row.name}
                                            </Link>
                                            {row.owner && <p className="text-xs text-muted-foreground">{row.owner.email}</p>}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <span className="font-medium">{getPlanLabel(row.plan)}</span>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <Badge variant={row.status === "ACTIVE" ? "success" : row.status === "PAST_DUE" || row.status === "CANCELED" ? "destructive" : "secondary"}>
                                                    {getSubscriptionStatusLabel(row.status, row.cancelling)}
                                                </Badge>
                                                {row.source && <Badge variant="outline">{getSubscriptionSourceLabel(row.source)}</Badge>}
                                                {row.out_of_sync && <Badge variant="destructive">{t("list.outOfSync")}</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="tabular-nums">{`${row.seats.used} / ${row.seats.total}`}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMoney(row.price_per_month_cents, row.currency)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">
                                            {row.next_renewal_at
                                                ? formatDate(row.next_renewal_at)
                                                : row.trial_ends_at
                                                  ? t("list.trialEnds", { date: formatDate(row.trial_ends_at) })
                                                  : "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{row.minutes_used_percent == null ? "—" : `${formatNumber(row.minutes_used_percent)}%`}</TableCell>
                                        <TableCell className="text-right tabular-nums" title={t("list.baseCost", { cost: formatCost(row.ai_cost.base_usd) })}>
                                            {formatCost(row.ai_cost.charged_usd)}
                                        </TableCell>
                                        <TableCell className={cn("text-right tabular-nums", row.margin_usd < 0 && "text-destructive")}>{formatCost(row.margin_usd)}</TableCell>
                                        <TableCell className={cn("text-right tabular-nums", row.failed_payments > 0 && "font-medium text-destructive")}>{row.failed_payments}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
            {data && data.pagination.total_pages > 1 && (
                <Pagination currentPage={data.pagination.page} totalPages={data.pagination.total_pages} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
            )}
        </div>
    );
}
