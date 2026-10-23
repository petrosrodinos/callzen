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
        throw new ApiError(error, "Failed to load practice prospects.");
    }
};

export const getPracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.practice_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to load the practice prospect.");
    }
};

export const createPracticeAgent = async (dto: CreatePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.prefix, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to create the practice prospect.");
    }
};

export const updatePracticeAgent = async ({ id, dto }: { id: string; dto: UpdatePracticeAgentDto }): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.practice_agents.detail(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to save the practice prospect.");
    }
};

// Returns an unsaved draft unless `save` is true, in which case the saved agent is returned.
export const generatePracticeAgent = async (dto: GeneratePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.generate, dto, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to generate the prospect. Please try again.");
    }
};

export const randomizePracticeAgent = async (dto: RandomizePracticeAgentDto): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.randomize, dto, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to generate a random prospect. Please try again.");
    }
};

export const createPracticeAgentFromCall = async (callId: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.from_call(callId), undefined, { timeout: 90000 });
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to recreate the prospect from this call.");
    }
};

export const duplicatePracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.duplicate(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to duplicate the prospect.");
    }
};

export const harderPracticeAgent = async (id: string): Promise<PracticeAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.practice_agents.harder(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to create a harder version.");
    }
};

export const archivePracticeAgent = async ({ id, archived }: { id: string; archived: boolean }): Promise<PracticeAgent> => {
    try {
        const route = archived ? ApiRoutes.practice_agents.archive(id) : ApiRoutes.practice_agents.unarchive(id);
        const response = await axiosInstance.post(route);
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to update the prospect.");
    }
};

export const deletePracticeAgent = async (id: string): Promise<{ id: string }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.practice_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, "Failed to delete the prospect.");
    }
};
