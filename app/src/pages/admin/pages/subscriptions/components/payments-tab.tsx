import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { formatDateTime } from "@/lib/date";
import { useAdminPayments } from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import { AdminPaymentFilters, type AdminPaymentFilter } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import { getInvoiceDescription, getInvoiceStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { PaymentFilterOptions } from "@/config/constants/dropdowns/billing/admin-billing.options";
import { invoiceDisplayStatus } from "@/features/billing/utils/invoice-status.utils";
import { Routes } from "@/routes/routes";

const PAGE_SIZE = 25;
const toIso = (date: string, endOfDay = false) => (date ? new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);

interface PaymentsTabProps {
    filters?: AdminPaymentFilter[];
    defaultFilter?: AdminPaymentFilter;
    showTotals?: boolean;
}

// Every invoice and payment across customers (§11b "Payments"); the Failed tab reuses it with fewer filters.
export function PaymentsTab({ filters = Object.values(AdminPaymentFilters), defaultFilter = AdminPaymentFilters.ALL, showTotals = true }: PaymentsTabProps) {
    const { t } = useTranslation("subscriptions");
    const [filter, setFilter] = useState<AdminPaymentFilter>(defaultFilter);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const { data, isPending } = useAdminPayments({ page, limit: PAGE_SIZE, filter, from: toIso(from), to: toIso(to, true) });
    const options = PaymentFilterOptions.filter((option) => filters.includes(option.id));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <Select
                    value={filter}
                    onValueChange={(value) => {
                        setFilter(value as AdminPaymentFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44" aria-label={t("payments.filter")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="space-y-1">
                    <Label htmlFor="payments-from">{t("payments.from")}</Label>
                    <Input id="payments-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="payments-to">{t("payments.to")}</Label>
                    <Input id="payments-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-40" />
                </div>
            </div>

            {showTotals && data && (
                <div className="grid grid-cols-3 gap-3">
                    <StatCard label={t("payments.collected")} value={formatMoney(data.totals.collected_cents)} />
                    <StatCard label={t("payments.refunded")} value={formatMoney(data.totals.refunded_cents)} />
                    <StatCard label={t("payments.failedTotal")} value={formatMoney(data.totals.failed_cents)} />
                </div>
            )}

            <Card className="gap-0 p-0">
                {isPending ? (
                    <div className="space-y-2 p-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : !data?.data.length ? (
                    <p className="p-6 text-sm text-muted-foreground">{t("payments.empty")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("payments.date")}</TableHead>
                                    <TableHead>{t("payments.organisation")}</TableHead>
                                    <TableHead>{t("payments.description")}</TableHead>
                                    <TableHead className="text-right">{t("payments.amount")}</TableHead>
                                    <TableHead>{t("payments.status")}</TableHead>
                                    <TableHead>
                                        <span className="sr-only">{t("payments.links")}</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((payment) => {
                                    const status = invoiceDisplayStatus(payment);
                                    return (
                                        <TableRow key={payment.id}>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(payment.created_at)}</TableCell>
                                            <TableCell>
                                                <Link to={Routes.admin.subscription(payment.organisation.id)} className="font-medium hover:underline">
                                                    {payment.organisation.name}
                                                </Link>
                                                {payment.buyer && <p className="text-xs text-muted-foreground">{payment.buyer.email}</p>}
                                            </TableCell>
                                            <TableCell>
                                                {getInvoiceDescription(payment)}
                                                {payment.scope && (
                                                    <Badge variant="outline" className="ml-2 text-[10px]">
                                                        {payment.scope === "personal" ? t("payments.personal") : t("payments.team")}
                                                    </Badge>
                                                )}
                                                {payment.last_error && <p className="text-xs text-destructive">{payment.last_error}</p>}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatMoney(payment.amount_paid_cents || payment.amount_due_cents, payment.currency)}
                                                {payment.currency !== "usd" && (
                                                    <Badge variant="destructive" className="ml-1 text-[10px]">
                                                        {payment.currency.toUpperCase()}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={status === "paid" ? "success" : status === "failed" ? "destructive" : "secondary"}>{getInvoiceStatusLabel(status)}</Badge>
                                                {payment.attempt_count > 0 && status !== "paid" && (
                                                    <p className="text-xs text-muted-foreground">{t("payments.attempts", { count: payment.attempt_count })}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 text-xs">
                                                    {payment.hosted_invoice_url && (
                                                        <a href={payment.hosted_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                                            {t("payments.invoice")} <ExternalLink className="size-3" />
                                                        </a>
                                                    )}
                                                    <a href={payment.stripe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                                        {t("payments.stripe")} <ExternalLink className="size-3" />
                                                    </a>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
            {data && data.pagination.total_pages > 1 && <Pagination currentPage={page} totalPages={data.pagination.total_pages} onPageChange={setPage} />}
        </div>
    );
}
