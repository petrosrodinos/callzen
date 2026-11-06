import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { AssignmentQuery, CallsExportQuery } from "../interfaces/coaching.interfaces";
import {
    createAssignment,
    createCallComment,
    deleteAssignment,
    deleteCallComment,
    exportCallsCsv,
    exportStudentsCsv,
    getAssignment,
    getAssignments,
    getCallComments,
    getCohort,
    getMyAssignments,
    getReport,
    getReports,
    getStudent,
    updateAssignment,
    updateCallComment,
} from "../services/coaching.services";

const toastError = (titleKey: string) => (error: Error) =>
    toast({ title: i18n.t(`coaching:toasts.${titleKey}`), description: error.message, variant: "error" });

export const useCohort = (days: number) => useQuery({ queryKey: ["coaching-cohort", days], queryFn: () => getCohort(days) });

export const useStudent = (userId: string | undefined, days: number) =>
    useQuery({ queryKey: ["coaching-student", userId, days], queryFn: () => getStudent(userId as string, days), enabled: !!userId });

export const useAssignments = (query: AssignmentQuery = {}) =>
    useQuery({ queryKey: ["coaching-assignments", query], queryFn: () => getAssignments(query) });

export const useAssignment = (id: string | undefined) =>
    useQuery({ queryKey: ["coaching-assignment", id], queryFn: () => getAssignment(id as string), enabled: !!id });

export const useMyAssignments = (enabled = true) =>
    useQuery({ queryKey: ["my-assignments"], queryFn: () => getMyAssignments("open"), enabled, staleTime: 30_000 });

const useInvalidateAssignments = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["coaching-assignments"] });
        queryClient.invalidateQueries({ queryKey: ["coaching-assignment"] });
        queryClient.invalidateQueries({ queryKey: ["coaching-student"] });
        queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
    };
};

export const useCreateAssignment = () => {
    const invalidate = useInvalidateAssignments();
    return useMutation({
        mutationFn: createAssignment,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("coaching:toasts.assignmentCreated"), duration: 2000 });
        },
        onError: toastError("couldNotSaveAssignment"),
    });
};

export const useUpdateAssignment = () => {
    const invalidate = useInvalidateAssignments();
    return useMutation({
        mutationFn: updateAssignment,
        onSuccess: (_data, variables) => {
            invalidate();
            const key =
                variables.dto.archived === true ? "assignmentArchived" : variables.dto.archived === false ? "assignmentRestored" : "assignmentSaved";
            toast({ title: i18n.t(`coaching:toasts.${key}`), duration: 2000 });
        },
        onError: toastError("couldNotSaveAssignment"),
    });
};

export const useDeleteAssignment = () => {
    const invalidate = useInvalidateAssignments();
    return useMutation({
        mutationFn: deleteAssignment,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("coaching:toasts.assignmentDeleted"), duration: 2000 });
        },
        onError: toastError("couldNotDeleteAssignment"),
    });
};

export const useCallComments = (callId: string | undefined) =>
    useQuery({ queryKey: ["call-comments", callId], queryFn: () => getCallComments(callId as string), enabled: !!callId });

const useInvalidateComments = () => {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["call-comments"] });
        queryClient.invalidateQueries({ queryKey: ["coaching-student"] });
    };
};

export const useCreateCallComment = () => {
    const invalidate = useInvalidateComments();
    return useMutation({
        mutationFn: createCallComment,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("coaching:toasts.commentAdded"), duration: 1800 });
        },
        onError: toastError("couldNotSaveComment"),
    });
};

export const useUpdateCallComment = () => {
    const invalidate = useInvalidateComments();
    return useMutation({
        mutationFn: updateCallComment,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("coaching:toasts.commentUpdated"), duration: 1800 });
        },
        onError: toastError("couldNotSaveComment"),
    });
};

export const useDeleteCallComment = () => {
    const invalidate = useInvalidateComments();
    return useMutation({
        mutationFn: deleteCallComment,
        onSuccess: () => {
            invalidate();
            toast({ title: i18n.t("coaching:toasts.commentDeleted"), duration: 1800 });
        },
        onError: toastError("couldNotDeleteComment"),
    });
};

export const useReports = (page = 1) => useQuery({ queryKey: ["coaching-reports", page], queryFn: () => getReports(page) });

export const useReport = (id: string | undefined) =>
    useQuery({ queryKey: ["coaching-report", id], queryFn: () => getReport(id as string), enabled: !!id });

export const useExportStudents = () =>
    useMutation({
        mutationFn: exportStudentsCsv,
        onSuccess: () => toast({ title: i18n.t("coaching:toasts.exported"), duration: 1800 }),
        onError: toastError("couldNotExport"),
    });

export const useExportCalls = () =>
    useMutation({
        mutationFn: (query: CallsExportQuery) => exportCallsCsv(query),
        onSuccess: () => toast({ title: i18n.t("coaching:toasts.exported"), duration: 1800 }),
        onError: toastError("couldNotExport"),
    });
