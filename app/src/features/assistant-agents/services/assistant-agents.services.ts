import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    AssistantAgent,
    AssistantAgentQuery,
    CreateAssistantAgentDto,
    UpdateAssistantAgentDto,
} from "../interfaces/assistant-agents.interfaces";

export const getAssistantAgents = async (query?: AssistantAgentQuery): Promise<AssistantAgent[]> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.assistant_agents.prefix, { params: query });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToLoadAssistantAgents"));
    }
};

export const getAssistantAgent = async (id: string): Promise<AssistantAgent> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.assistant_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToLoadTheAssistantAgent"));
    }
};

export const createAssistantAgent = async (dto: CreateAssistantAgentDto): Promise<AssistantAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.assistant_agents.prefix, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToCreateTheAssistantAgent"));
    }
};

export const updateAssistantAgent = async ({ id, dto }: { id: string; dto: UpdateAssistantAgentDto }): Promise<AssistantAgent> => {
    try {
        const response = await axiosInstance.patch(ApiRoutes.assistant_agents.detail(id), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToSaveTheAssistantAgent"));
    }
};

export const duplicateAssistantAgent = async (id: string): Promise<AssistantAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.assistant_agents.duplicate(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToDuplicateTheAssistantAgent"));
    }
};

export const setDefaultAssistantAgent = async (id: string): Promise<AssistantAgent> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.assistant_agents.set_default(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToSetTheDefaultAgent"));
    }
};

export const archiveAssistantAgent = async ({ id, archived }: { id: string; archived: boolean }): Promise<AssistantAgent> => {
    try {
        const route = archived ? ApiRoutes.assistant_agents.archive(id) : ApiRoutes.assistant_agents.unarchive(id);
        const response = await axiosInstance.post(route);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToUpdateTheAgent"));
    }
};

export const deleteAssistantAgent = async (id: string): Promise<{ id: string }> => {
    try {
        const response = await axiosInstance.delete(ApiRoutes.assistant_agents.detail(id));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.assistantAgents.failedToDeleteTheAssistantAgent"));
    }
};
