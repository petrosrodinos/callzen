import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import {
    AgentKinds,
    type AgentAccessResult,
    type AgentKind,
    type ShareAgentsDto,
    type ShareAgentsResult,
    type StudentAccess,
    type UpdateAgentAccessDto,
    type UpdateStudentAccessDto,
} from "../interfaces/agent-access.interfaces";

export const updateAgentAccess = async ({ kind, id, dto }: { kind: AgentKind; id: string; dto: UpdateAgentAccessDto }): Promise<AgentAccessResult> => {
    try {
        const route = kind === AgentKinds.COPILOT ? ApiRoutes.assistant_agents.access(id) : ApiRoutes.agent_access.practice_agent(id);
        const response = await axiosInstance.put(route, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("access:errors.updateAccess"));
    }
};

export const getStudentAccess = async (userId: string): Promise<StudentAccess> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.agent_access.student(userId));
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("access:errors.loadStudentAccess"));
    }
};

export const updateStudentAccess = async ({ userId, dto }: { userId: string; dto: UpdateStudentAccessDto }): Promise<StudentAccess> => {
    try {
        const response = await axiosInstance.put(ApiRoutes.agent_access.student(userId), dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("access:errors.updateAccess"));
    }
};

export const shareAgents = async (dto: ShareAgentsDto): Promise<ShareAgentsResult> => {
    try {
        const response = await axiosInstance.post(ApiRoutes.agent_access.share, dto);
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("access:errors.share"));
    }
};
