import { useTranslation } from "react-i18next";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBillingPortal } from "@/features/billing/hooks/use-billing";
import type { BillingOverview } from "@/features/billing/interfaces/billing.interfaces";

const isExpired = (month: number, year: number) => {
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
};

// Card details are managed in Stripe's portal (payment methods and billing details only, §11).
export function PaymentMethodCard({ overview, canManage }: { overview: BillingOverview; canManage: boolean }) {
    const { t } = useTranslation("billing");
    const portal = useBillingPortal();
    const method = overview.payment_method;
    const expired = method ? isExpired(method.exp_month, method.exp_year) : false;
    const failed = !!overview.banners.past_due;

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("page.paymentMethod")}</h2>
            {method ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <CreditCard className="size-5 text-muted-foreground" />
                        <div className="text-sm">
                            <p className="font-medium capitalize">{t("page.cardEnding", { brand: method.brand, last4: method.last4 })}</p>
                            <p className="text-xs text-muted-foreground">
                                {t("page.cardExpires", { month: String(method.exp_month).padStart(2, "0"), year: method.exp_year })}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button variant="outline" size="sm" onClick={() => portal.mutate()} loading={portal.isPending} disabled={portal.isPending}>
                            {t("page.updatePayment")}
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t("page.noPaymentMethod")}</p>
            )}
            {(expired || failed) && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    {failed ? t("page.paymentFailedWarning") : t("page.cardExpiredWarning")}
                </p>
            )}
        </Card>
    );
}
