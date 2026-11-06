import { useTranslation } from "react-i18next";
import { Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useBillingInvoices } from "@/features/billing/hooks/use-billing";
import { invoiceDisplayStatus } from "@/features/billing/utils/invoice-status.utils";
import { getInvoiceDescription, getInvoiceStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";

const statusVariant = (status: string): "success" | "secondary" | "destructive" | "outline" =>
    status === "paid" ? "success" : status === "failed" || status === "uncollectible" ? "destructive" : status === "open" ? "outline" : "secondary";

export function InvoicesCard() {
    const { t } = useTranslation("billing");
    const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useBillingInvoices();
    const invoices = data?.pages.flatMap((page) => page.data) ?? [];

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("page.invoices")}</h2>
            {isPending ? (
                <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </div>
            ) : !invoices.length ? (
                <p className="text-sm text-muted-foreground">{t("page.noInvoices")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("page.invoiceDate")}</TableHead>
                                <TableHead>{t("page.invoiceDescription")}</TableHead>
                                <TableHead className="text-right">{t("page.invoiceAmount")}</TableHead>
                                <TableHead>{t("page.invoiceStatus")}</TableHead>
                                <TableHead className="text-right">
                                    <span className="sr-only">{t("page.invoiceActions")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => {
                                const status = invoiceDisplayStatus(invoice);
                                const payable = status === "open" || status === "failed";
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="whitespace-nowrap">{formatDate(invoice.created_at)}</TableCell>
                                        <TableCell>{getInvoiceDescription(invoice)}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatMoney(invoice.amount_paid_cents || invoice.amount_due_cents, invoice.currency)}
                                            {invoice.amount_refunded_cents > 0 && (
                                                <span className="block text-xs text-muted-foreground">
                                                    {t("page.refundedAmount", { amount: formatMoney(invoice.amount_refunded_cents, invoice.currency) })}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(status)}>{getInvoiceStatusLabel(status)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {payable && invoice.hosted_invoice_url && (
                                                    <Button size="sm" asChild>
                                                        <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                                                            {t("page.payNow")}
                                                        </a>
                                                    </Button>
                                                )}
                                                {invoice.invoice_pdf_url && (
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer" aria-label={t("page.download")}>
                                                            <Download />
                                                        </a>
                                                    </Button>
                                                )}
                                                {!payable && invoice.hosted_invoice_url && (
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" aria-label={t("page.view")}>
                                                            <ExternalLink />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
            {hasNextPage && (
                <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => fetchNextPage()} loading={isFetchingNextPage} disabled={isFetchingNextPage}>
                    {t("page.loadMore")}
                </Button>
            )}
        </Card>
    );
}
