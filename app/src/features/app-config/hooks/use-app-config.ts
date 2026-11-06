import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-error";
import type { AppConfigEntry } from "../interfaces/app-config.interfaces";
import { getAppConfig, getAppConfigHistory, getPricingOverview, resetAppConfig, syncPricing, updateAppConfig } from "../services/app-config.services";

export const useAppConfig = () => useQuery({ queryKey: ["app-config"], queryFn: getAppConfig });

export const useAppConfigEntry = <T,>(key: string) => {
    const query = useAppConfig();
    return { ...query, entry: query.data?.find((item) => item.key === key) as AppConfigEntry<T> | undefined };
};

export const useAppConfigHistory = (key: string | null) =>
    useQuery({ queryKey: ["app-config-history", key], queryFn: () => getAppConfigHistory(key as string), enabled: !!key });

const isConflict = (error: Error) => error instanceof ApiError && error.code === "APP_CONFIG_VERSION_CONFLICT";

export const useUpdateAppConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAppConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-config"] });
            queryClient.invalidateQueries({ queryKey: ["app-config-history"] });
            queryClient.invalidateQueries({ queryKey: ["model-pricing"] });
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            toast({ title: i18n.t("common:toasts.appConfig.saved"), duration: 1800 });
        },
        onError: (error) => {
            // Someone else saved first (optimistic version check): reload so their change is not lost.
            if (isConflict(error)) queryClient.invalidateQueries({ queryKey: ["app-config"] });
            toast({
                title: i18n.t(isConflict(error) ? "common:toasts.appConfig.conflict" : "common:toasts.appConfig.couldNotSave"),
                description: error.message,
                variant: "error",
            });
        },
    });
};

export const useResetAppConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resetAppConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-config"] });
            queryClient.invalidateQueries({ queryKey: ["app-config-history"] });
            toast({ title: i18n.t("common:toasts.appConfig.reset"), duration: 1800 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.appConfig.couldNotSave"), description: error.message, variant: "error" });
        },
    });
};

export const usePricingOverview = () => useQuery({ queryKey: ["model-pricing"], queryFn: getPricingOverview });

export const useSyncPricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: syncPricing,
        onSuccess: (data) => {
            queryClient.setQueryData(["model-pricing"], data);
            toast({
                title: i18n.t(data.sync.last_error ? "common:toasts.appConfig.syncFailed" : "common:toasts.appConfig.synced"),
                description: data.sync.last_error ?? undefined,
                variant: data.sync.last_error ? "error" : "success",
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.appConfig.syncFailed"), description: error.message, variant: "error" });
        },
    });
};
