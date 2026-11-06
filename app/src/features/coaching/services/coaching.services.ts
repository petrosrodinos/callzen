import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    AssignmentDetail,
    AssignmentListItem,
    AssignmentQuery,
    CallComment,
    CallCommentsResponse,
    CallsExportQuery,
    Cohort,
    CreateAssignmentDto,
    CreateCommentDto,
    MyAssignment,
    Paginated,
    ReportDetail,
    ReportListItem,
    StudentDetail,
    UpdateAssignmentDto,
} from "../interfaces/coaching.interfaces";

const failed = (key: string) => i18n.t(`coaching:errors.${key}`);

export const getCohort = async (days: number): Promise<Cohort> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.cohort, { params: { days } })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadCohort"));
    }
};

export const getStudent = async (userId: string, days: number): Promise<StudentDetail> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.student(userId), { params: { days } })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadStudent"));
    }
};

export const getAssignments = async (query: AssignmentQuery = {}): Promise<Paginated<AssignmentListItem>> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.assignments, { params: query })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadAssignments"));
    }
};

export const getAssignment = async (id: string): Promise<AssignmentDetail> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.assignment(id))).data;
    } catch (error) {
        throw new ApiError(error, failed("loadAssignment"));
    }
};

export const createAssignment = async (dto: CreateAssignmentDto): Promise<AssignmentDetail> => {
    try {
        return (await axiosInstance.post(ApiRoutes.coaching.assignments, dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("createAssignment"));
    }
};

export const updateAssignment = async ({ id, dto }: { id: string; dto: UpdateAssignmentDto }): Promise<AssignmentDetail> => {
    try {
        return (await axiosInstance.patch(ApiRoutes.coaching.assignment(id), dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("updateAssignment"));
    }
};

export const deleteAssignment = async (id: string): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.coaching.assignment(id));
    } catch (error) {
        throw new ApiError(error, failed("deleteAssignment"));
    }
};

export const getMyAssignments = async (status: "open" | "all" = "open"): Promise<MyAssignment[]> => {
    try {
        return (await axiosInstance.get(ApiRoutes.assignments.mine, { params: { status } })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadMyAssignments"));
    }
};

export const getCallComments = async (callId: string): Promise<CallCommentsResponse> => {
    try {
        return (await axiosInstance.get(ApiRoutes.call_comments.list(callId))).data;
    } catch (error) {
        throw new ApiError(error, failed("loadComments"));
    }
};

export const createCallComment = async ({ callId, dto }: { callId: string; dto: CreateCommentDto }): Promise<CallComment> => {
    try {
        return (await axiosInstance.post(ApiRoutes.call_comments.list(callId), dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("saveComment"));
    }
};

export const updateCallComment = async ({ callId, commentId, body }: { callId: string; commentId: string; body: string }): Promise<CallComment> => {
    try {
        return (await axiosInstance.patch(ApiRoutes.call_comments.detail(callId, commentId), { body })).data;
    } catch (error) {
        throw new ApiError(error, failed("saveComment"));
    }
};

export const deleteCallComment = async ({ callId, commentId }: { callId: string; commentId: string }): Promise<void> => {
    try {
        await axiosInstance.delete(ApiRoutes.call_comments.detail(callId, commentId));
    } catch (error) {
        throw new ApiError(error, failed("deleteComment"));
    }
};

export const getReports = async (page = 1, limit = 20): Promise<Paginated<ReportListItem>> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.reports, { params: { page, limit } })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadReports"));
    }
};

export const getReport = async (id: string): Promise<ReportDetail> => {
    try {
        return (await axiosInstance.get(ApiRoutes.coaching.report(id))).data;
    } catch (error) {
        throw new ApiError(error, failed("loadReport"));
    }
};

// Streams the CSV from the API and saves it with the browser's download.
const downloadCsv = async (url: string, filename: string, params?: Record<string, string | undefined>) => {
    try {
        const response = await axiosInstance.get(url, { params, responseType: "blob" });
        const href = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
    } catch (error) {
        throw new ApiError(error, failed("export"));
    }
};

export const exportStudentsCsv = () => downloadCsv(ApiRoutes.coaching.export_students, "students.csv");

export const exportCallsCsv = (query: CallsExportQuery = {}) =>
    downloadCsv(ApiRoutes.coaching.export_calls, "calls.csv", { from: query.from, to: query.to, user_id: query.user_id });
