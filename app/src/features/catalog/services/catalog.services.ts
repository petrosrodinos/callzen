import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { Catalog } from "../interfaces/catalog.interfaces";

export const getCatalog = async (): Promise<Catalog> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.catalog.prefix);
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to load models and templates.");
    }
};
