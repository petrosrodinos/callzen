import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AssistantAgentQuery } from "../interfaces/assistant-agents.interfaces";
import {
    archiveAssistantAgent,
    createAssistantAgent,
    deleteAssistantAgent,
    duplicateAssistantAgent,
    getAssistantAgent,
    getAssistantAgents,
    setDefaultAssistantAgent,
    updateAssistantAgent,
} from "../services/assistant-agents.services";

const QUERY_KEY = "assistant-agents";

export const useAssistantAgents = (query?: AssistantAgentQuery) => {
    return useQuery({
        queryKey: [QUERY_KEY, query],
        queryFn: () => getAssistantAgents(query),
    });
};

export const useAssistantAgent = (id: string | undefined) => {
    return useQuery({
        queryKey: [QUERY_KEY, "detail", id],
        queryFn: () => getAssistantAgent(id as string),
        enabled: !!id,
    });
};

export const useCreateAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.assistantAgents.coPilotCreated"), description: i18n.t("common:toasts.assistantAgents.readyToUse", { name: agent.name }), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotCreateTheCoPilot"), description: error.message, variant: "error" });
        },
    });
};

export const useUpdateAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAssistantAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.assistantAgents.changesSaved"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotSaveChanges"), description: error.message, variant: "error" });
        },
    });
};

export const useDuplicateAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: duplicateAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.assistantAgents.coPilotDuplicated"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotDuplicate"), description: error.message, variant: "error" });
        },
    });
};

export const useSetDefaultAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setDefaultAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.assistantAgents.defaultCoPilotUpdated"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotSetDefault"), description: error.message, variant: "error" });
        },
    });
};

export const useArchiveAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archiveAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: agent.archived_at ? i18n.t("common:toasts.assistantAgents.coPilotArchived") : i18n.t("common:toasts.assistantAgents.coPilotRestored"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotUpdateTheCoPilot"), description: error.message, variant: "error" });
        },
    });
};

export const useDeleteAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAssistantAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.assistantAgents.coPilotDeleted"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.assistantAgents.couldNotDeleteTheCoPilot"), description: error.message, variant: "error" });
        },
    });
};
