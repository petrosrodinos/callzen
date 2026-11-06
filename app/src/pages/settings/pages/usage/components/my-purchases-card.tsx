import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes, formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/date";
import { useMyPurchases } from "@/features/billing/hooks/use-billing";

// "My purchases" (§11a): every member's own personal top-ups and receipts, paid on their own Stripe customer.
export function MyPurchasesCard() {
    const { t } = useTranslation("billing");
    const { data, isPending } = useMyPurchases();
    if (!isPending && !data?.credits.length && !data?.invoices.length) return null;

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-1 font-semibold">{t("purchases.title")}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{t("purchases.description")}</p>
            {isPending ? (
                <Skeleton className="h-16 w-full rounded-lg" />
            ) : (
                <div className="space-y-4">
                    {!!data?.credits.length && (
                        <ul className="divide-y">
                            {data.credits.map((credit) => (
                                <li key={credit.id} className="py-2 text-sm">
                                    <p className="font-medium">
                                        {[
                                            credit.live_minutes_granted ? t("purchases.liveMinutes", { minutes: formatMinutes(credit.live_minutes_granted) }) : null,
                                            credit.practice_minutes_granted
                                                ? t("purchases.practiceMinutes", { minutes: formatMinutes(credit.practice_minutes_granted) })
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(credit.created_at)} ·{" "}
                                        {t("purchases.remaining", {
                                            minutes: formatMinutes(credit.live_minutes_remaining + credit.practice_minutes_remaining),
                                        })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!!data?.invoices.length && (
                        <div>
                            <h3 className="mb-1 text-sm font-medium">{t("purchases.receipts")}</h3>
                            <ul className="divide-y">
                                {data.invoices.map((invoice) => (
                                    <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                        <span className="text-muted-foreground">{formatDate(invoice.created_at)}</span>
                                        <span className="flex items-center gap-3">
                                            <span className="tabular-nums">{formatMoney(invoice.amount_paid_cents || invoice.amount_due_cents, invoice.currency)}</span>
                                            {(invoice.invoice_pdf_url || invoice.hosted_invoice_url) && (
                                                <a
                                                    href={invoice.invoice_pdf_url ?? invoice.hosted_invoice_url ?? undefined}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                >
                                                    {t("purchases.receipt")} <ExternalLink className="size-3" />
                                                </a>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
