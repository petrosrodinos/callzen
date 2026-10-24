import i18n from "@/i18n";
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
            toast({ title: i18n.t("common:toasts.practiceAgents.prospectCreated"), description: agent.name, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotCreateTheProspect"), description: error.message, variant: "error" });
        },
    });
};

export const useUpdatePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePracticeAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.changesSaved"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotSaveChanges"), description: error.message, variant: "error" });
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
                title: variables.save ? i18n.t("common:toasts.practiceAgents.prospectCreated") : i18n.t("common:toasts.practiceAgents.prospectGenerated"),
                description: variables.save ? agent.name : i18n.t("common:toasts.practiceAgents.reviewAndAdjustTheDetailsThen"),
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotGenerateTheProspect"), description: error.message, variant: "error" });
        },
    });
};

export const useRandomizePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: randomizePracticeAgent,
        onSuccess: (agent, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.randomProspectReady"), description: variables.save ? agent.name : i18n.t("common:toasts.practiceAgents.reviewItThenSave"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotGenerateARandomProspect"), description: error.message, variant: "error" });
        },
    });
};

export const useCreatePracticeAgentFromCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPracticeAgentFromCall,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.prospectRecreatedFromTheCall"), description: agent.name, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotRecreateTheProspect"), description: error.message, variant: "error" });
        },
    });
};

export const useDuplicatePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: duplicatePracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.prospectDuplicated"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotDuplicate"), description: error.message, variant: "error" });
        },
    });
};

export const useHarderPracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: harderPracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.harderVersionCreated"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotCreateAHarderVersion"), description: error.message, variant: "error" });
        },
    });
};

export const useArchivePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: archivePracticeAgent,
        onSuccess: (agent) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: agent.archived_at ? i18n.t("common:toasts.practiceAgents.prospectArchived") : i18n.t("common:toasts.practiceAgents.prospectRestored"), description: agent.name, duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotUpdateTheProspect"), description: error.message, variant: "error" });
        },
    });
};

export const useDeletePracticeAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePracticeAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.practiceAgents.prospectDeleted"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.practiceAgents.couldNotDeleteTheProspect"), description: error.message, variant: "error" });
        },
    });
};
