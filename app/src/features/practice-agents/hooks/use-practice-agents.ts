import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { PracticeAgentQuery } from "../interfaces/practice-agents.interfaces";
import {
    archivePracticeAgent,
    createPracticeAgent,
    createPracticeAgentFromCall,
    deletePracticeAgent,
    duplicatePracticeAgent,
    generatePracticeAgent,
    getPracticeAgent,
    getPracticeAgents,
    harderPracticeAgent,
    randomizePracticeAgent,
    updatePracticeAgent,
} from "../services/practice-agents.services";

const QUERY_KEY = "practice-agents";

export const usePracticeAgents = (query?: PracticeAgentQuery) => {
    return useQuery({
        queryKey: [QUERY_KEY, query],
        queryFn: () => getPracticeAgents(query),
    });
};

export const usePracticeAgent = (id: string | undefined) => {
    return useQuery({
        queryKey: [QUERY_KEY, "detail", id],
        queryFn: () => getPracticeAgent(id as string),
        enabled: !!id,
    });
};

export const useCreatePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Prospect created", description: agent.name, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not create the prospect", description: error.message, variant: "error" });
        },
    });
};

export const useUpdatePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePracticeAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Changes saved", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not save changes", description: error.message, variant: "error" });
        },
    });
};

export const useGeneratePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generatePracticeAgent,
        onSuccess: (agent, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({
                title: variables.save ? "Prospect created" : "Prospect generated",
                description: variables.save ? agent.name : "Review and adjust the details, then save.",
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: "Could not generate the prospect", description: error.message, variant: "error" });
        },
    });
};

export const useRandomizePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: randomizePracticeAgent,
        onSuccess: (agent, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Random prospect ready", description: variables.save ? agent.name : "Review it, then save.", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not generate a random prospect", description: error.message, variant: "error" });
        },
    });
};

export const useCreatePracticeAgentFromCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPracticeAgentFromCall,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Prospect recreated from the call", description: agent.name, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not recreate the prospect", description: error.message, variant: "error" });
        },
    });
};

export const useDuplicatePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: duplicatePracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Prospect duplicated", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not duplicate", description: error.message, variant: "error" });
        },
    });
};

export const useHarderPracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: harderPracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Harder version created", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not create a harder version", description: error.message, variant: "error" });
        },
    });
};

export const useArchivePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archivePracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: agent.archived_at ? "Prospect archived" : "Prospect restored", description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not update the prospect", description: error.message, variant: "error" });
        },
    });
};

export const useDeletePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePracticeAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Prospect deleted", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the prospect", description: error.message, variant: "error" });
        },
    });
};
