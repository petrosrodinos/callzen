import { z } from "zod";
import i18n from "@/i18n";
import { OutputLanguageModes } from "@/features/user/interfaces/user.interface";

export const preferencesSchema = z.object({
  full_name: z.string().trim().min(1, i18n.t("settings:validation.enterName")).max(120),
  interface_language: z.string().min(2),
  preferred_language: z.string().min(2),
  output_language_mode: z.enum([
    OutputLanguageModes.CONVERSATION,
    OutputLanguageModes.INTERFACE,
  ]),
  consent_line: z.string().max(1000),
  keep_recordings: z.boolean(),
});

export type PreferencesFormValues = z.infer<typeof preferencesSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, i18n.t("settings:validation.enterPassword")),
  confirmation: z.literal("DELETE", { message: i18n.t("settings:validation.typeDelete") }),
});

export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;
