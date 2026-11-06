import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useAuthStore } from "@/stores/auth";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import { useRefundInvoice } from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import type { AdminSubscriptionDetail } from "@/features/admin-subscriptions/interfaces/admin-subscriptions.interfaces";
import { invoiceDisplayStatus } from "@/features/billing/utils/invoice-status.utils";
import { getInvoiceDescription, getInvoiceStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { AdminActionDialog } from "../../../components/admin-action-dialog";

type Invoice = AdminSubscriptionDetail["invoices"][number];

// Refunds are SUPER_ADMIN only; a refunded top-up has its remaining minutes zeroed (§11b).
export function DetailInvoices({ detail }: { detail: AdminSubscriptionDetail }) {
    const { t } = useTranslation("subscriptions");
    const isSuperAdmin = useAuthStore((state) => state.role) === RoleTypes.SUPER_ADMIN;
    const refund = useRefundInvoice();
    const [target, setTarget] = useState<Invoice | null>(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const refundable = (invoice: Invoice) => invoice.amount_paid_cents - invoice.amount_refunded_cents;

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("detail.invoices")}</h2>
            {!detail.invoices.length ? (
                <p className="text-sm text-muted-foreground">{t("detail.noInvoices")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("payments.date")}</TableHead>
                                <TableHead>{t("payments.description")}</TableHead>
                                <TableHead className="text-right">{t("payments.amount")}</TableHead>
                                <TableHead>{t("payments.status")}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t("payments.links")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detail.invoices.map((invoice) => {
                                const status = invoiceDisplayStatus(invoice);
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="whitespace-nowrap">{formatDate(invoice.created_at)}</TableCell>
                                        <TableCell>
                                            {getInvoiceDescription(invoice)}
                                            {invoice.user_id && (
                                                <Badge variant="outline" className="ml-2 text-[10px]">
                                                    {t("payments.personal")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {formatMoney(invoice.amount_paid_cents || invoice.amount_due_cents, invoice.currency)}
                                            {invoice.amount_refunded_cents > 0 && (
                                                <span className="block text-xs text-muted-foreground">
                                                    {t("detail.refundedAmount", { amount: formatMoney(invoice.amount_refunded_cents, invoice.currency) })}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={status === "paid" ? "success" : status === "failed" ? "destructive" : "secondary"}>{getInvoiceStatusLabel(status)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2 text-xs">
                                                <a href={invoice.stripe_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                                    {t("payments.stripe")} <ExternalLink className="size-3" />
                                                </a>
                                                {isSuperAdmin && refundable(invoice) > 0 && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setAmount((refundable(invoice) / 100).toFixed(2));
                                                            setNote("");
                                                            setTarget(invoice);
                                                        }}
                                                    >
                                                        <Undo2 /> {t("actions.refund")}
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

            {target && (
                <AdminActionDialog
                    open
                    onOpenChange={(next) => !next && setTarget(null)}
                    title={t("actions.refundTitle")}
                    description={t("actions.refundHint", {
                        amount: formatMoney(refundable(target), target.currency),
                        invoice: getInvoiceDescription(target),
                    })}
                    confirmLabel={t("actions.refund")}
                    destructive
                    confirmName={detail.organisation.name}
                    canConfirm={Number(amount) > 0 && Math.round(Number(amount) * 100) <= refundable(target)}
                    isPending={refund.isPending}
                    onConfirm={(confirmName) => {
                        const cents = Math.round(Number(amount) * 100);
                        refund.mutate(
                            {
                                invoiceId: target.id,
                                dto: {
                                    amount_cents: cents === refundable(target) ? undefined : cents,
                                    confirm_name: confirmName,
                                    note: note.trim() || undefined,
                                },
                            },
                            { onSuccess: () => setTarget(null) },
                        );
                    }}
                >
                    <div className="space-y-1">
                        <Label htmlFor="refund-amount">{t("actions.refundAmount", { currency: target.currency.toUpperCase() })}</Label>
                        <Input id="refund-amount" type="number" min={0} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="refund-note">{t("actions.note")}</Label>
                        <Input id="refund-note" value={note} onChange={(event) => setNote(event.target.value)} />
                    </div>
                </AdminActionDialog>
            )}
        </Card>
    );
}
