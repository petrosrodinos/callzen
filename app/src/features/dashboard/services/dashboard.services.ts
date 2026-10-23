import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { DashboardOverview } from "../interfaces/dashboard.interfaces";

export const getDashboardOverview = async (days: number): Promise<DashboardOverview> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.dashboard.overview, { params: { days } });
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to load your progress.");
    }
};
