import { OrgRoles, type OrgRole } from "@/features/organisations/interfaces/organisations.interfaces";

export const OrgRoleFormOptions: { id: OrgRole; label: string }[] = [
    { id: OrgRoles.OWNER, label: "Owner" },
    { id: OrgRoles.ADMIN, label: "Admin" },
    { id: OrgRoles.MEMBER, label: "Member" },
];

export function getOrgRoleLabel(value: OrgRole | string | null | undefined): string {
    return OrgRoleFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const OrgRoleDescriptionOptions: Record<OrgRole, string> = {
    [OrgRoles.OWNER]: "Full control. Can change role permissions, delete the organisation and manage every member. Always has every permission.",
    [OrgRoles.ADMIN]: "Runs the team day to day: manages co-pilots, members and invitations within the permissions the owner grants.",
    [OrgRoles.MEMBER]: "Sells and practices. Sees only their own calls unless the owner grants more.",
};
