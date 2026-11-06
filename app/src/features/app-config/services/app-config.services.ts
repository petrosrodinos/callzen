import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { AppConfigEntry, AppConfigHistoryEntry, PricingOverview, UpdateAppConfigDto } from "../interfaces/app-config.interfaces";

export const getAppConfig = async (): Promise<AppConfigEntry[]> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.app_config.prefix)).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.load"));
    }
};

export const updateAppConfig = async ({ key, value, version }: UpdateAppConfigDto): Promise<AppConfigEntry> => {
    try {
        return (await axiosInstance.put(ApiRoutes.admin.app_config.detail(key), { value, version })).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.save"));
    }
};

export const resetAppConfig = async ({ key, version }: { key: string; version: number }): Promise<AppConfigEntry> => {
    try {
        return (await axiosInstance.post(ApiRoutes.admin.app_config.reset(key), { version })).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.reset"));
    }
};

export const getAppConfigHistory = async (key: string): Promise<AppConfigHistoryEntry[]> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.app_config.history(key))).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.history"));
    }
};

export const getPricingOverview = async (): Promise<PricingOverview> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.model_pricing.prefix)).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.pricing"));
    }
};

export const syncPricing = async (): Promise<PricingOverview> => {
    try {
        return (await axiosInstance.post(ApiRoutes.admin.model_pricing.sync)).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.appConfig.sync"));
    }
};
