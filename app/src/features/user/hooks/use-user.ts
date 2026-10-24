import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import { deleteMe, getMe, updateMe } from "../services/user.services";

const QUERY_KEY = "me";

export const useMe = () => {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    return useQuery({
        queryKey: [QUERY_KEY],
        queryFn: getMe,
        enabled: !!isLoggedIn,
    });
};

export const useUpdateMe = () => {
    const queryClient = useQueryClient();
    const updateUser = useAuthStore((state) => state.updateUser);
    return useMutation({
        mutationFn: updateMe,
        onSuccess: (user) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ["catalog"] });
            updateUser({ full_name: user.full_name ?? user.email.split("@")[0] });
            toast({ title: i18n.t("common:toasts.user.settingsSaved"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.user.couldNotSaveSettings"), description: error.message, variant: "error" });
        },
    });
};

export const useDeleteMe = () => {
    const logout = useAuthStore((state) => state.logout);
    return useMutation({
        mutationFn: deleteMe,
        onSuccess: () => {
            toast({ title: i18n.t("common:toasts.user.accountDeleted"), description: i18n.t("common:toasts.user.allYourDataWasPermanentlyRemoved"), duration: 3000 });
            logout();
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.user.couldNotDeleteYourAccount"), description: error.message, variant: "error" });
        },
    });
};
