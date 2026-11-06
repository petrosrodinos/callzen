import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getStudentAccess, shareAgents, updateAgentAccess, updateStudentAccess } from "../services/agent-access.services";

const STUDENT_ACCESS_KEY = "student-access";
// Lists and details carry visibility / access_user_ids, so they are refreshed after every access change.
const AGENT_KEYS = ["assistant-agents", "practice-agents", STUDENT_ACCESS_KEY];

const useInvalidateAgents = () => {
    const queryClient = useQueryClient();
    return () => AGENT_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export const useUpdateAgentAccess = () => {
    const invalidate = useInvalidateAgents();
    return useMutation({
        mutationFn: updateAgentAccess,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("access:toasts.accessSaved"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("access:toasts.couldNotSaveAccess"), description: error.message, variant: "error" });
        },
    });
};

export const useStudentAccess = (userId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: [STUDENT_ACCESS_KEY, userId],
        queryFn: () => getStudentAccess(userId as string),
        enabled: !!userId && enabled,
    });

export const useUpdateStudentAccess = () => {
    const invalidate = useInvalidateAgents();
    return useMutation({
        mutationFn: updateStudentAccess,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("access:toasts.accessSaved"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("access:toasts.couldNotSaveAccess"), description: error.message, variant: "error" });
        },
    });
};

export const useShareAgents = () => {
    const invalidate = useInvalidateAgents();
    return useMutation({
        mutationFn: shareAgents,
        onSuccess: (result) => {
            invalidate();
            const added = result.shared.reduce((sum, item) => sum + item.added_user_ids.length, 0);
            toast({
                title: i18n.t("access:toasts.shared", { count: result.shared.length }),
                description: added ? i18n.t("access:toasts.sharedPeople", { count: added }) : i18n.t("access:toasts.alreadyShared"),
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("access:toasts.couldNotShare"), description: error.message, variant: "error" });
        },
    });
};
