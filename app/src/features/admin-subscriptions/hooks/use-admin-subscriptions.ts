import i18n from "@/i18n";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AdminPaymentsQuery, AdminSubscriptionsQuery } from "../interfaces/admin-subscriptions.interfaces";
import {
    adminCancelSubscription,
    adminResumeSubscription,
    applyDiscount,
    assignManualPlan,
    exportAdminSubscriptionsCsv,
    extendTrial,
    getAdminPayments,
    getAdminSubscription,
    getAdminSubscriptions,
    grantCredits,
    refundInvoice,
    syncSubscription,
} from "../services/admin-subscriptions.services";

export const useAdminSubscriptions = (query: AdminSubscriptionsQuery) =>
    useQuery({ queryKey: ["admin-subscriptions", query], queryFn: () => getAdminSubscriptions(query), placeholderData: keepPreviousData });

export const useAdminSubscription = (organisationId: string | undefined, eventType?: string) =>
    useQuery({
        queryKey: ["admin-subscription", organisationId, eventType],
        queryFn: () => getAdminSubscription(organisationId as string, eventType),
        enabled: !!organisationId,
        placeholderData: keepPreviousData,
    });

export const useAdminPayments = (query: AdminPaymentsQuery) =>
    useQuery({ queryKey: ["admin-payments", query], queryFn: () => getAdminPayments(query), placeholderData: keepPreviousData });

export const useExportAdminSubscriptions = () =>
    useMutation({
        mutationFn: exportAdminSubscriptionsCsv,
        onSuccess: (blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast({ title: i18n.t("common:toasts.adminSubscriptions.exported"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.adminSubscriptions.actionFailed"), description: error.message, variant: "error" });
        },
    });

// Every admin action refreshes the list, the detail page and the payments tab.
const useAdminAction = <TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>, successKey: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => {
            ["admin-subscriptions", "admin-subscription", "admin-payments"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            toast({ title: i18n.t(`common:toasts.adminSubscriptions.${successKey}`), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.adminSubscriptions.actionFailed"), description: error.message, variant: "error" });
        },
    });
};

export const useAssignManualPlan = () => useAdminAction(assignManualPlan, "planAssigned");
export const useGrantCredits = () => useAdminAction(grantCredits, "minutesGranted");
export const useExtendTrial = () => useAdminAction(extendTrial, "trialExtended");
export const useApplyDiscount = () => useAdminAction(applyDiscount, "discountApplied");
export const useAdminCancelSubscription = () => useAdminAction(adminCancelSubscription, "canceled");
export const useAdminResumeSubscription = () => useAdminAction(adminResumeSubscription, "resumed");
export const useSyncSubscription = () => useAdminAction(syncSubscription, "synced");
export const useRefundInvoice = () => useAdminAction(refundInvoice, "refunded");
