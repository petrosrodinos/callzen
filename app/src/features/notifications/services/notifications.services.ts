import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type { NotificationList, NotificationsQuery, UnreadCount } from "../interfaces/notifications.interfaces";

export const getNotifications = async (query: NotificationsQuery = {}): Promise<NotificationList> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.notifications.prefix, {
            params: { page: query.page, limit: query.limit, unread: query.unread ? "true" : undefined },
        });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("notifications:errors.load"));
    }
};

export const getUnreadCount = async (): Promise<UnreadCount> => {
    try {
        return (await axiosInstance.get(ApiRoutes.notifications.unread_count)).data;
    } catch (error) {
        throw new ApiError(error, i18n.t("notifications:errors.load"));
    }
};

export const markNotificationRead = async (id: string): Promise<void> => {
    try {
        await axiosInstance.post(ApiRoutes.notifications.read(id));
    } catch (error) {
        throw new ApiError(error, i18n.t("notifications:errors.markRead"));
    }
};

export const markAllNotificationsRead = async (): Promise<void> => {
    try {
        await axiosInstance.post(ApiRoutes.notifications.read_all);
    } catch (error) {
        throw new ApiError(error, i18n.t("notifications:errors.markRead"));
    }
};
