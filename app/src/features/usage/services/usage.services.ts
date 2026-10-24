import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { UsageSummary } from "../interfaces/usage.interfaces";

export const getUsageSummary = async (days: number): Promise<UsageSummary> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.usage.summary, { params: { days } });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.usage.failedToLoadUsage"));
    }
};
