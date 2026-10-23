import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { CallStatuses, type CallQuery } from "../interfaces/calls.interfaces";
import {
    addBookmark,
    addSegments,
    askCopilot,
    createRealtimeSession,
    deleteBookmark,
    deleteCall,
    deleteRecording,
    deleteTranscript,
    endCall,
    generateSuggestion,
    getCall,
    getCalls,
    getRecording,
    practiceTurn,
    rerunAnalysis,
    startLiveCall,
    startPracticeCall,
    updateCall,
    updateSegmentSpeaker,
    updateSuggestion,
    uploadRecording,
} from "../services/calls.services";

const QUERY_KEY = "calls";

export const useCalls = (query?: CallQuery) => {
    return useQuery({
        queryKey: [QUERY_KEY, query],
        queryFn: () => getCalls(query),
        placeholderData: (previous) => previous,
    });
};

export const useCall = (id: string | undefined) => {
    return useQuery({
        queryKey: [QUERY_KEY, "detail", id],
        queryFn: () => getCall(id as string),
        enabled: !!id,
        refetchInterval: (query) => (query.state.data?.status === CallStatuses.ANALYZING ? 3000 : false),
    });
};

export const useCallRecording = (id: string | undefined, enabled: boolean) => {
    return useQuery({
        queryKey: [QUERY_KEY, "recording", id],
        queryFn: () => getRecording(id as string),
        enabled: !!id && enabled,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
    });
};

export const useStartLiveCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startLiveCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Call started", description: "The co-pilot is listening.", duration: 1500 });
        },
        onError: (error) => {
            toast({ title: "Could not start the call", description: error.message, variant: "error" });
        },
    });
};

export const useStartPracticeCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startPracticeCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Practice session ready", duration: 1500 });
        },
        onError: (error) => {
            toast({ title: "Could not start the practice session", description: error.message, variant: "error" });
        },
    });
};

export const useUpdateCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Call updated", duration: 1500 });
        },
        onError: (error) => {
            toast({ title: "Could not update the call", description: error.message, variant: "error" });
        },
    });
};

export const useEndCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: endCall,
        onSuccess: (call) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({
                title: "Call ended",
                description: call.status === CallStatuses.ANALYZING ? "Your performance report is being prepared." : "Saved to your call library.",
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: "Could not end the call", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            toast({ title: "Call permanently deleted", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the call", description: error.message, variant: "error" });
        },
    });
};

// Live-session mutations fire many times per minute. Per the "minimal distraction" principle they do
// not toast on success; failures are surfaced unobtrusively by the live panel itself.
export const useAddSegments = () => {
    return useMutation({ mutationFn: addSegments, retry: 2 });
};

export const useGenerateSuggestion = () => {
    return useMutation({ mutationFn: generateSuggestion });
};

export const useUpdateSuggestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSuggestion,
        onSuccess: (_suggestion, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            if (variables.feedback !== undefined) toast({ title: "Thanks for the feedback", duration: 1200 });
        },
        onError: (error) => {
            toast({ title: "Could not update the suggestion", description: error.message, variant: "error" });
        },
    });
};

export const useAskCopilot = () => {
    return useMutation({
        mutationFn: askCopilot,
        onError: (error) => {
            toast({ title: "No answer", description: error.message, variant: "warning", duration: 2500 });
        },
    });
};

export const useAddBookmark = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addBookmark,
        onSuccess: (_bookmark, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: "Moment bookmarked", duration: 1200 });
        },
        onError: (error) => {
            toast({ title: "Could not bookmark", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteBookmark = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBookmark,
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: "Bookmark removed", duration: 1200 });
        },
        onError: (error) => {
            toast({ title: "Could not remove the bookmark", description: error.message, variant: "error" });
        },
    });
};

export const useUpdateSegmentSpeaker = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSegmentSpeaker,
        onSuccess: (_segment, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: "Speaker updated", duration: 1200 });
        },
        onError: (error) => {
            toast({ title: "Could not update the speaker", description: error.message, variant: "error" });
        },
    });
};

export const useUploadRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["upload-recording"],
        mutationFn: uploadRecording,
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: "Recording saved", duration: 1500 });
        },
        onError: (error) => {
            toast({ title: "Recording upload failed", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteRecording,
        onSuccess: (_call, id) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            queryClient.removeQueries({ queryKey: [QUERY_KEY, "recording", id] });
            toast({ title: "Recording permanently deleted", description: "Transcript and analysis were kept.", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the recording", description: error.message, variant: "error" });
        },
    });
};

export const useDeleteTranscript = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTranscript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Transcript permanently deleted", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the transcript", description: error.message, variant: "error" });
        },
    });
};

export const useRerunAnalysis = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: rerunAnalysis,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: "Analysis started", description: "This usually takes under a minute.", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not start the analysis", description: error.message, variant: "error" });
        },
    });
};

export const useCreateRealtimeSession = () => {
    return useMutation({ mutationFn: createRealtimeSession });
};

export const usePracticeTurn = () => {
    return useMutation({ mutationFn: practiceTurn, retry: 1 });
};
