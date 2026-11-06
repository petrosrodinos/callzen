import i18n from "@/i18n";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import type { ChangePlanDto, CheckoutDto, TopupDto } from "../interfaces/billing.interfaces";
import {
    cancelPlan,
    changePlan,
    getBillingEvents,
    getBillingInvoices,
    getBillingOverview,
    getMyPurchases,
    getPlans,
    getPublicPlans,
    getPlanUsage,
    openBillingPortal,
    previewPlanChange,
    resumePlan,
    startCheckout,
    startTopup,
} from "../services/billing.services";

const BILLING_KEYS = ["billing", "plan-usage", "billing-invoices", "billing-events", "organisations"];

// Leaves the app for a Stripe-hosted page (Checkout or the Customer Portal).
const redirectTo = (url: string) => window.location.assign(url);

export const usePlans = () => {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    return useQuery({ queryKey: ["plans"], queryFn: getPlans, enabled: !!isLoggedIn, staleTime: 5 * 60 * 1000 });
};

export const usePublicPlans = () =>
    useQuery({ queryKey: ["public-plans"], queryFn: getPublicPlans, staleTime: 10 * 60 * 1000, retry: 1 });

// Entitlements and consumption of the active organisation for the caller (GET /usage/plan).
export const useEntitlements = (enabled = true) =>
    useQuery({ queryKey: ["plan-usage"], queryFn: getPlanUsage, enabled, staleTime: 30 * 1000 });

export const useSubscription = (enabled = true) =>
    useQuery({ queryKey: ["billing"], queryFn: getBillingOverview, enabled, staleTime: 30 * 1000 });

export const useBillingInvoices = (enabled = true) =>
    useInfiniteQuery({
        queryKey: ["billing-invoices"],
        queryFn: ({ pageParam }) => getBillingInvoices(pageParam),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.next_cursor ?? undefined,
        enabled,
    });

export const useBillingEvents = (enabled = true) => useQuery({ queryKey: ["billing-events"], queryFn: getBillingEvents, enabled });

export const useMyPurchases = () => useQuery({ queryKey: ["my-purchases"], queryFn: getMyPurchases });

// Re-reads everything billing-related, e.g. after returning from Stripe Checkout.
export const useRefreshBilling = () => {
    const queryClient = useQueryClient();
    return () => [...BILLING_KEYS, "my-purchases"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export const usePreviewPlanChange = () => useMutation({ mutationFn: previewPlanChange });

const useInvalidateBilling = () => {
    const queryClient = useQueryClient();
    return () => BILLING_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export const useChangePlan = () => {
    const invalidate = useInvalidateBilling();
    return useMutation({
        mutationFn: (dto: ChangePlanDto) => changePlan(dto),
        onSuccess: (result) => {
            if (result.mode === "checkout" && result.url) {
                redirectTo(result.url);
                return;
            }
            invalidate();
            toast({
                title: i18n.t(result.mode === "scheduled" ? "common:toasts.billing.changeScheduled" : "common:toasts.billing.planChanged"),
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotChangePlan"), description: error.message, variant: "error" });
        },
    });
};

export const useCancelPlan = () => {
    const invalidate = useInvalidateBilling();
    return useMutation({
        mutationFn: cancelPlan,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("common:toasts.billing.cancelScheduled"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotCancel"), description: error.message, variant: "error" });
        },
    });
};

export const useResumePlan = () => {
    const invalidate = useInvalidateBilling();
    return useMutation({
        mutationFn: resumePlan,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("common:toasts.billing.resumed"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotResume"), description: error.message, variant: "error" });
        },
    });
};

export const useBillingPortal = () =>
    useMutation({
        mutationFn: openBillingPortal,
        onSuccess: ({ url }) => {
            toast({ title: i18n.t("common:toasts.billing.redirecting"), duration: 1500 });
            redirectTo(url);
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotOpenPortal"), description: error.message, variant: "error" });
        },
    });

export const useCheckout = () =>
    useMutation({
        mutationFn: (dto: CheckoutDto) => startCheckout(dto),
        onSuccess: ({ url }) => {
            toast({ title: i18n.t("common:toasts.billing.redirecting"), duration: 1500 });
            redirectTo(url);
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotStartCheckout"), description: error.message, variant: "error" });
        },
    });

export const useTopup = () =>
    useMutation({
        mutationFn: (dto: TopupDto) => startTopup(dto),
        onSuccess: ({ url }) => {
            toast({ title: i18n.t("common:toasts.billing.redirecting"), duration: 1500 });
            redirectTo(url);
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.billing.couldNotStartCheckout"), description: error.message, variant: "error" });
        },
    });
