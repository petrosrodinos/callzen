import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { CallStatuses, isCallProcessing, type Call, type CallQuery, type UploadCallDto } from "../interfaces/calls.interfaces";
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
    retryTranscription,
    startLiveCall,
    uploadCall,
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
        refetchInterval: (query) => (isCallProcessing(query.state.data?.status) ? 3000 : false),
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
            toast({ title: i18n.t("common:toasts.calls.callStarted"), description: i18n.t("common:toasts.calls.theCoPilotIsListening"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotStartTheCall"), description: error.message, variant: "error" });
        },
    });
};

export interface UploadBatchItemPatch {
    status?: "pending" | "uploading" | "done" | "error";
    percent?: number;
    error?: string;
}

export interface UploadBatchResult {
    id: string;
    call?: Call;
    error?: string;
}

// Each recording becomes its own call. Files go up one at a time (the API buffers a whole file in
// memory) and a failed file never stops the rest.
export const useUploadCalls = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ files, dto, onItem }: { files: { id: string; file: File }[]; dto: UploadCallDto; onItem?: (id: string, patch: UploadBatchItemPatch) => void }): Promise<UploadBatchResult[]> => {
            const results: UploadBatchResult[] = [];
            for (const { id, file } of files) {
                onItem?.(id, { status: "uploading", percent: 0, error: undefined });
                try {
                    const call = await uploadCall({ file, dto, onProgress: (percent) => onItem?.(id, { percent }) });
                    results.push({ id, call });
                    onItem?.(id, { status: "done", percent: 100 });
                } catch (error) {
                    const message = (error as Error).message;
                    results.push({ id, error: message });
                    onItem?.(id, { status: "error", error: message });
                }
            }
            return results;
        },
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            const uploaded = results.filter((result) => result.call).length;
            const failed = results.length - uploaded;
            if (failed === 0) {
                toast(
                    uploaded === 1
                        ? { title: i18n.t("common:toasts.calls.recordingUploadedForAnalysis"), description: i18n.t("common:toasts.calls.weAreTranscribingIt"), duration: 2500 }
                        : { title: i18n.t("common:toasts.calls.recordingsUploadedForAnalysis"), description: i18n.t("common:toasts.calls.weAreTranscribingThem", { count: uploaded }), duration: 2500 },
                );
            } else if (uploaded === 0) {
                toast({ title: i18n.t("common:toasts.calls.couldNotUploadTheRecording"), description: results[0]?.error, variant: "error" });
            } else {
                toast({ title: i18n.t("common:toasts.calls.someRecordingsFailed"), description: i18n.t("common:toasts.calls.someRecordingsFailedHint", { count: failed }), variant: "error" });
            }
        },
    });
};

export const useRetryTranscription = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: retryTranscription,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.calls.transcriptionRestarted"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotRetryTheTranscription"), description: error.message, variant: "error" });
        },
    });
};

export const useStartPracticeCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startPracticeCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.calls.practiceSessionReady"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotStartThePracticeSession"), description: error.message, variant: "error" });
        },
    });
};

export const useUpdateCall = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCall,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.calls.callUpdated"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotUpdateTheCall"), description: error.message, variant: "error" });
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
                title: i18n.t("common:toasts.calls.callEnded"),
                description: call.status === CallStatuses.ANALYZING ? i18n.t("common:toasts.calls.yourPerformanceReportIsBeingPrepared") : i18n.t("common:toasts.calls.savedToYourCallLibrary"),
                duration: 2500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotEndTheCall"), description: error.message, variant: "error" });
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
            toast({ title: i18n.t("common:toasts.calls.callPermanentlyDeleted"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotDeleteTheCall"), description: error.message, variant: "error" });
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
            if (variables.feedback !== undefined) toast({ title: i18n.t("common:toasts.calls.thanksForTheFeedback"), duration: 1200 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotUpdateTheSuggestion"), description: error.message, variant: "error" });
        },
    });
};

export const useAskCopilot = () => {
    return useMutation({
        mutationFn: askCopilot,
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.noAnswer"), description: error.message, variant: "warning", duration: 2500 });
        },
    });
};

export const useAddBookmark = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addBookmark,
        onSuccess: (_bookmark, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: i18n.t("common:toasts.calls.momentBookmarked"), duration: 1200 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotBookmark"), description: error.message, variant: "error" });
        },
    });
};

export const useDeleteBookmark = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBookmark,
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: i18n.t("common:toasts.calls.bookmarkRemoved"), duration: 1200 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotRemoveTheBookmark"), description: error.message, variant: "error" });
        },
    });
};

export const useUpdateSegmentSpeaker = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSegmentSpeaker,
        onSuccess: (_segment, variables) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, "detail", variables.id] });
            toast({ title: i18n.t("common:toasts.calls.speakerUpdated"), duration: 1200 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotUpdateTheSpeaker"), description: error.message, variant: "error" });
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
            toast({ title: i18n.t("common:toasts.calls.recordingSaved"), duration: 1500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.recordingUploadFailed"), description: error.message, variant: "error" });
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
            toast({ title: i18n.t("common:toasts.calls.recordingPermanentlyDeleted"), description: i18n.t("common:toasts.calls.transcriptAndAnalysisWereKept"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotDeleteTheRecording"), description: error.message, variant: "error" });
        },
    });
};

export const useDeleteTranscript = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTranscript,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.calls.transcriptPermanentlyDeleted"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotDeleteTheTranscript"), description: error.message, variant: "error" });
        },
    });
};

export const useRerunAnalysis = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: rerunAnalysis,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: i18n.t("common:toasts.calls.analysisStarted"), description: i18n.t("common:toasts.calls.thisUsuallyTakesUnderAMinute"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.calls.couldNotStartTheAnalysis"), description: error.message, variant: "error" });
        },
    });
};

export const useCreateRealtimeSession = () => {
    return useMutation({ mutationFn: createRealtimeSession });
};

export const usePracticeTurn = () => {
    return useMutation({ mutationFn: practiceTurn, retry: 1 });
};
