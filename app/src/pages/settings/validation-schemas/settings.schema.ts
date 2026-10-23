import { z } from "zod";
import { OutputLanguageModes } from "@/features/user/interfaces/user.interface";

export const preferencesSchema = z.object({
    full_name: z.string().trim().min(1, "Enter your name").max(120),
    interface_language: z.string().min(2),
    output_language_mode: z.enum([OutputLanguageModes.CONVERSATION, OutputLanguageModes.INTERFACE]),
    consent_line: z.string().max(1000),
    keep_recordings: z.boolean(),
});

export type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export const deleteAccountSchema = z.object({
    password: z.string().min(1, "Enter your password"),
    confirmation: z.literal("DELETE", { message: 'Type "DELETE" to confirm' }),
});

export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
