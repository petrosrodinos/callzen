import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { DashboardOverview } from "../interfaces/dashboard.interfaces";

export const getDashboardOverview = async (days: number, scope: "me" | "team"): Promise<DashboardOverview> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.dashboard.overview, { params: { days, scope } });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.dashboard.failedToLoadYourProgress"));
    }
};
