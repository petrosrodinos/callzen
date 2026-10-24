import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { UpdateUserDto, User } from "../interfaces/user.interface";

export const getMe = async (): Promise<User> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.users.me);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.user.failedToLoadYourProfile"));
    }
};

export const updateMe = async (dto: UpdateUserDto): Promise<User> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.users.me, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.user.failedToSaveYourSettings"));
    }
};

export const deleteMe = async (password: string): Promise<{ deleted: boolean }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.users.me, { data: { password } });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.user.failedToDeleteYourAccount"));
    }
};
