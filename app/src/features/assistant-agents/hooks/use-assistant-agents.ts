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
            toast({ title: "Co-pilot created", description: `${agent.name} is ready to use.`, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not create the co-pilot", description: error.message, variant: "error" });
        },
    });
};

export const useUpdateAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateAssistantAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Changes saved", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not save changes", description: error.message, variant: "error" });
        },
    });
};

export const useDuplicateAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: duplicateAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Co-pilot duplicated", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not duplicate", description: error.message, variant: "error" });
        },
    });
};

export const useSetDefaultAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setDefaultAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Default co-pilot updated", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not set default", description: error.message, variant: "error" });
        },
    });
};

export const useArchiveAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archiveAssistantAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: agent.archived_at ? "Co-pilot archived" : "Co-pilot restored", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not update the co-pilot", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteAssistantAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAssistantAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Co-pilot deleted", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the co-pilot", description: error.message, variant: "error" });
        },
    });
};
