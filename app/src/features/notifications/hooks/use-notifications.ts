import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { NotificationsQuery } from "../interfaces/notifications.interfaces";
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from "../services/notifications.services";

// The API has no push channel: the bell polls every 60 s and on window focus (§10.1f).
const POLL_MS = 60_000;

export const useUnreadNotificationsCount = () =>
    useQuery({
        queryKey: ["notifications-unread"],
        queryFn: getUnreadCount,
        refetchInterval: POLL_MS,
        refetchOnWindowFocus: true,
    });

export const useNotifications = (query: NotificationsQuery = {}, enabled = true) =>
    useQuery({
        queryKey: ["notifications", query],
        queryFn: () => getNotifications(query),
        enabled,
        refetchOnWindowFocus: true,
    });

const useInvalidateNotifications = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    };
};

// Marking one item read is silent on success (it happens on click); errors still surface.
export const useMarkNotificationRead = () => {
    const invalidate = useInvalidateNotifications();
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: invalidate,
        onError: (error) => {
            toast({ title: i18n.t("notifications:toasts.couldNotMarkRead"), description: error.message, variant: "error" });
        },
    });
};

export const useMarkAllNotificationsRead = () => {
    const invalidate = useInvalidateNotifications();
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("notifications:toasts.allRead"), duration: 1800 });
        },
        onError: (error) => {
            toast({ title: i18n.t("notifications:toasts.couldNotMarkRead"), description: error.message, variant: "error" });
        },
    });
};
