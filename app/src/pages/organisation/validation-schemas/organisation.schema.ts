import { z } from "zod";
import i18n from "@/i18n";
import { OrgRoles } from "@/features/organisations/interfaces/organisations.interfaces";

export const organisationNameSchema = z.object({
    name: z.string().trim().min(2, i18n.t("organisation:validation.nameMin", { min: 2 })).max(80, i18n.t("organisation:validation.nameMax", { max: 80 })),
});

export type OrganisationNameFormValues = z.infer<typeof organisationNameSchema>;

export const inviteMemberSchema = z.object({
    email: z.string().trim().min(1, i18n.t("organisation:validation.emailRequired")).email(i18n.t("organisation:validation.emailInvalid")),
    role: z.enum([OrgRoles.OWNER, OrgRoles.ADMIN, OrgRoles.MEMBER]),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
