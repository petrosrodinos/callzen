import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useRefreshBilling } from "@/features/billing/hooks/use-billing";

// Handles the return from Stripe Checkout (?checkout= or ?topup= success|canceled). Webhooks may still be in
// flight, so billing data is refetched now and again a few seconds later.
export const useCheckoutReturn = () => {
    const { t } = useTranslation("billing");
    const refresh = useRefreshBilling();
    const [searchParams, setSearchParams] = useSearchParams();
    const result = searchParams.get("checkout") ?? searchParams.get("topup");
    const isTopup = searchParams.has("topup");

    useEffect(() => {
        if (!result) return;
        setSearchParams({}, { replace: true });
        if (result !== "success") {
            toast({ title: t("page.checkoutCanceled"), variant: "info", duration: 3000 });
            return;
        }
        toast({
            title: isTopup ? t("page.topupSuccess") : t("page.checkoutSuccess"),
            description: t("page.checkoutSuccessHint"),
            duration: 4000,
        });
        refresh();
        const timer = window.setTimeout(refresh, 4000);
        return () => window.clearTimeout(timer);
    }, [result, isTopup, refresh, setSearchParams, t]);
};
