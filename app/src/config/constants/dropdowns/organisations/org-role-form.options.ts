import { OrgRoles, type OrgRole } from "@/features/organisations/interfaces/organisations.interfaces";
import i18n from "@/i18n";

export const OrgRoleFormOptions: { id: OrgRole; label: string }[] = [
    { id: OrgRoles.OWNER, label: i18n.t("options:organisations.role.owner") },
    { id: OrgRoles.ADMIN, label: i18n.t("options:organisations.role.admin") },
    { id: OrgRoles.MEMBER, label: i18n.t("options:organisations.role.member") },
];

export function getOrgRoleLabel(value: OrgRole | string | null | undefined): string {
    return OrgRoleFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const OrgRoleDescriptionOptions: Record<OrgRole, string> = {
    [OrgRoles.OWNER]: i18n.t("options:organisations.roleDescription.owner"),
    [OrgRoles.ADMIN]: i18n.t("options:organisations.roleDescription.admin"),
    [OrgRoles.MEMBER]: i18n.t("options:organisations.roleDescription.member"),
};
