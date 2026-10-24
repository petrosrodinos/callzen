import { z } from "zod";
import i18n from "@/i18n";

export const SignInSchema = z.object({
    email: z.string().min(1, { message: i18n.t("auth:validation.emailRequired") }),
    password: z
        .string()
        .min(1, {
            message: i18n.t("auth:validation.passwordRequired"),
        })
        .min(6, {
            message: i18n.t("auth:validation.passwordMin"),
        }),
});

export const SignUpSchema = z
    .object({
        full_name: z.string().min(1, { message: i18n.t("auth:validation.nameRequired") }).max(120),
        email: z
            .string()
            .min(1, { message: i18n.t("auth:validation.emailRequired") })
            .email({ message: i18n.t("auth:validation.emailInvalid") }),
        password: z
            .string()
            .min(1, {
                message: i18n.t("auth:validation.passwordRequired"),
            })
            .min(6, {
                message: i18n.t("auth:validation.passwordMin"),
            }),
        confirm_password: z.string(),
        preferred_language: z.string().min(2, { message: i18n.t("auth:validation.languageRequired") }),
    })
    .refine((data) => data.password === data.confirm_password, {
        message: i18n.t("auth:validation.passwordsMismatch"),
        path: ["confirm_password"],
    });


export type SignInFormValues = z.infer<typeof SignInSchema>;
export type SignUpFormValues = z.infer<typeof SignUpSchema>;
