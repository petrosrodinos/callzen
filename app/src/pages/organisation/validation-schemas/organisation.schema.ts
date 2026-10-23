import { z } from "zod";
import { OrgRoles } from "@/features/organisations/interfaces/organisations.interfaces";

export const organisationNameSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be 80 characters or fewer"),
});

export type OrganisationNameFormValues = z.infer<typeof organisationNameSchema>;

export const inviteMemberSchema = z.object({
    email: z.string().trim().min(1, "Enter an email address").email("Enter a valid email address"),
    role: z.enum([OrgRoles.OWNER, OrgRoles.ADMIN, OrgRoles.MEMBER]),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;
