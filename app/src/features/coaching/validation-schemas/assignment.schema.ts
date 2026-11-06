import { z } from "zod";
import i18n from "@/i18n";

const optionalNumber = (min: number, max: number) =>
    z
        .string()
        .optional()
        .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max), {
            message: i18n.t("coaching:validation.range", { min, max }),
        });

export const assignmentSchema = z
    .object({
        practice_agent_id: z.string().min(1, i18n.t("coaching:validation.prospectRequired")),
        title: z.string().trim().min(1, i18n.t("coaching:validation.titleRequired")).max(200),
        instructions: z.string().max(4000).optional(),
        // yyyy-mm-dd from a date input; sent as the end of that day.
        due_date: z.string().optional(),
        target_score: optionalNumber(0, 100),
        required_attempts: z
            .string()
            .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 50, {
                message: i18n.t("coaching:validation.range", { min: 1, max: 50 }),
            }),
        all_members: z.boolean(),
        user_ids: z.array(z.string()),
    })
    .refine((values) => values.all_members || values.user_ids.length > 0, {
        path: ["user_ids"],
        message: i18n.t("coaching:validation.studentsRequired"),
    })
    .refine((values) => !values.due_date || new Date(`${values.due_date}T23:59:59`) > new Date(), {
        path: ["due_date"],
        message: i18n.t("coaching:validation.dueInPast"),
    });

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export const commentSchema = z.object({
    body: z.string().trim().min(1, i18n.t("coaching:validation.commentRequired")).max(2000, i18n.t("coaching:validation.commentTooLong")),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
