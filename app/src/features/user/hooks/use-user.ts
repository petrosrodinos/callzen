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
            updateUser({ full_name: user.full_name ?? user.email.split("@")[0] });
            toast({ title: "Settings saved", duration: 1500 });
        },
        onError: (error) => {
            toast({ title: "Could not save settings", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteMe = () => {
    const logout = useAuthStore((state) => state.logout);
    return useMutation({
        mutationFn: deleteMe,
        onSuccess: () => {
            toast({ title: "Account deleted", description: "All your data was permanently removed.", duration: 3000 });
            logout();
        },
        onError: (error) => {
            toast({ title: "Could not delete your account", description: error.message, variant: "error" });
        },
    });
};
