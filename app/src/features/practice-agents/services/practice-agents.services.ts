import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    CreatePracticeAgentDto,
    GeneratePracticeAgentDto,
    PracticeAgent,
    PracticeAgentQuery,
    RandomizePracticeAgentDto,
    UpdatePracticeAgentDto,
} from "../interfaces/practice-agents.interfaces";

export const getPracticeAgents = async (query?: PracticeAgentQuery): Promise<PracticeAgent[]> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.practice_agents.prefix, { params: query });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToLoadPracticeProspects"));
    }
};

export const getPracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.practice_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToLoadThePracticeProspect"));
    }
};

export const createPracticeAgent = async (dto: CreatePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.prefix, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToCreateThePracticeProspect"));
    }
};

export const updatePracticeAgent = async ({ id, dto }: { id: string; dto: UpdatePracticeAgentDto }): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.practice_agents.detail(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToSaveThePracticeProspect"));
    }
};

// Returns an unsaved draft unless `save` is true, in which case the saved agent is returned.
export const generatePracticeAgent = async (dto: GeneratePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.generate, dto, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToGenerateTheProspectPlease"));
    }
};

export const randomizePracticeAgent = async (dto: RandomizePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.randomize, dto, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToGenerateARandomProspect"));
    }
};

export const createPracticeAgentFromCall = async (callId: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.from_call(callId), undefined, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToRecreateTheProspectFrom"));
    }
};

export const duplicatePracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.duplicate(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToDuplicateTheProspect"));
    }
};

export const harderPracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.harder(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToCreateAHarderVersion"));
    }
};

export const archivePracticeAgent = async ({ id, archived }: { id: string; archived: boolean }): Promise<PracticeAgent> => {
    try {
        const route = archived ? ApiRoutes.practice_agents.archive(id) : ApiRoutes.practice_agents.unarchive(id);
        const response = await axiosInstance.post(route);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToUpdateTheProspect"));
    }
};

export const deletePracticeAgent = async (id: string): Promise<{ id: string }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.practice_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.practiceAgents.failedToDeleteTheProspect"));
    }
};
