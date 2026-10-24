import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    AddSegmentsDto,
    AddSegmentsResponse,
    AskCopilotResponse,
    Bookmark,
    Call,
    CallListResponse,
    CallQuery,
    CreateCallDto,
    CreatePracticeCallDto,
    EndCallDto,
    PracticeTurnDto,
    PracticeTurnResponse,
    RealtimePurpose,
    RealtimeSession,
    RerunAnalysisDto,
    Speaker,
    Suggestion,
    SuggestionFeedback,
    SuggestionResult,
    SuggestionStatus,
    TranscriptSegment,
    UpdateCallDto,
} from "../interfaces/calls.interfaces";
import type { SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const getCalls = async (query?: CallQuery): Promise<CallListResponse> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.calls.prefix, { params: query });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToLoadCalls"));
    }
};

export const getCall = async (id: string): Promise<Call> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.calls.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToLoadTheCall"));
    }
};

export const startLiveCall = async (dto: CreateCallDto): Promise<Call> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.prefix, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToStartTheCall"));
    }
};

export const startPracticeCall = async (dto: CreatePracticeCallDto): Promise<Call> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.practice, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToStartThePracticeSession"));
    }
};

export const updateCall = async ({ id, dto }: { id: string; dto: UpdateCallDto }): Promise<Call> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.calls.detail(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToUpdateTheCall"));
    }
};

export const endCall = async ({ id, dto }: { id: string; dto: EndCallDto }): Promise<Call> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.end(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToEndTheCall"));
    }
};

export const deleteCall = async (id: string): Promise<{ id: string }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.calls.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToDeleteTheCall"));
    }
};

export const addSegments = async ({ id, dto }: { id: string; dto: AddSegmentsDto }): Promise<AddSegmentsResponse> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.segments(id), dto, { timeout: 30000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToSaveTheTranscript"));
    }
};

export const updateSegmentSpeaker = async ({ id, segmentId, speaker }: { id: string; segmentId: string; speaker: Speaker }): Promise<TranscriptSegment> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.calls.segment(id, segmentId), { speaker });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToUpdateTheSpeaker"));
    }
};

export const deleteTranscript = async (id: string): Promise<Call> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.calls.transcript(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToDeleteTheTranscript"));
    }
};

export const generateSuggestion = async ({ id, elapsed_ms, frequency }: { id: string; elapsed_ms?: number; frequency?: SuggestionFrequency }): Promise<SuggestionResult> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.generate_suggestion(id), { elapsed_ms, frequency }, { timeout: 30000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToGenerateASuggestion"));
    }
};

export const updateSuggestion = async ({
    id,
    suggestionId,
    status,
    feedback,
}: {
    id: string;
    suggestionId: string;
    status?: SuggestionStatus;
    feedback?: SuggestionFeedback | null;
}): Promise<Suggestion> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.calls.suggestion(id, suggestionId), { status, feedback });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToUpdateTheSuggestion"));
    }
};

export const askCopilot = async ({ id, question, elapsed_ms }: { id: string; question: string; elapsed_ms?: number }): Promise<AskCopilotResponse> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.ask(id), { question, elapsed_ms }, { timeout: 30000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.theCoPilotCouldNotAnswer"));
    }
};

export const addBookmark = async ({ id, at_ms, label }: { id: string; at_ms: number; label?: string }): Promise<Bookmark> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.bookmarks(id), { at_ms, label });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToAddTheBookmark"));
    }
};

export const deleteBookmark = async ({ id, bookmarkId }: { id: string; bookmarkId: string }): Promise<{ id: string }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.calls.bookmark(id, bookmarkId));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToRemoveTheBookmark"));
    }
};

export const uploadRecording = async ({ id, blob }: { id: string; blob: Blob }): Promise<{ id: string; size: number }> => {
    try {
        const form = new FormData();
        const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        form.append("file", blob, `recording.${extension}`);
        const response = await axiosInstance.post(ApiRoutes.calls.recording(id), form, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 10 * 60 * 1000,
        });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToUploadTheRecording"));
    }
};

export const getRecording = async (id: string): Promise<Blob> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.calls.recording(id), { responseType: "blob", timeout: 5 * 60 * 1000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToLoadTheRecording"));
    }
};

export const deleteRecording = async (id: string): Promise<Call> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.calls.recording(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToDeleteTheRecording"));
    }
};

export const rerunAnalysis = async ({ id, dto }: { id: string; dto: RerunAnalysisDto }): Promise<{ id: string; status: string }> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.analysis(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.failedToStartTheAnalysis"));
    }
};

export const createRealtimeSession = async ({ id, purpose }: { id: string; purpose: RealtimePurpose }): Promise<RealtimeSession> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.realtime_session(id), { purpose }, { timeout: 20000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.couldNotStartTheRealtimeAudio"));
    }
};

export const practiceTurn = async ({ id, dto }: { id: string; dto: PracticeTurnDto }): Promise<PracticeTurnResponse> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.calls.practice_turn(id), dto, { timeout: 30000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.theProspectDidNotRespondTry"));
    }
};
