import i18n from "@/i18n";
import { Permissions, type Permission } from "@/features/organisations/interfaces/organisations.interfaces";

// Translated names and descriptions of role permissions. The API's English catalog text is the fallback for any
// permission added later.
const KEYS: Record<Permission, string> = {
    [Permissions.AGENTS_VIEW]: "agentsView",
    [Permissions.AGENTS_MANAGE]: "agentsManage",
    [Permissions.PROSPECTS_MANAGE]: "prospectsManage",
    [Permissions.PROSPECTS_MANAGE_ALL]: "prospectsManageAll",
    [Permissions.CALLS_CREATE]: "callsCreate",
    [Permissions.CALLS_VIEW_ALL]: "callsViewAll",
    [Permissions.CALLS_MANAGE_ALL]: "callsManageAll",
    [Permissions.USAGE_VIEW]: "usageView",
    [Permissions.MEMBERS_VIEW]: "membersView",
    [Permissions.MEMBERS_INVITE]: "membersInvite",
    [Permissions.MEMBERS_MANAGE]: "membersManage",
    [Permissions.ROLES_MANAGE]: "rolesManage",
    [Permissions.ORG_UPDATE]: "orgUpdate",
    [Permissions.ORG_DELETE]: "orgDelete",
    [Permissions.BILLING_VIEW]: "billingView",
    [Permissions.BILLING_MANAGE]: "billingManage",
    [Permissions.COACHING_VIEW]: "coachingView",
    [Permissions.COACHING_MANAGE]: "coachingManage",
    [Permissions.COACHING_EXPORT]: "coachingExport",
};

const GROUP_KEYS: Record<string, string> = {
    "Co-pilots & practice": "agents",
    Calls: "calls",
    Team: "team",
    Coaching: "coaching",
    Organisation: "organisation",
    Billing: "billing",
};

export function getPermissionLabel(permission: { key: Permission | string; label: string }): string {
    const key = KEYS[permission.key as Permission];
    return key ? i18n.t(`options:permissions.${key}.label`) : permission.label;
}

export function getPermissionDescription(permission: { key: Permission | string; description: string }): string {
    const key = KEYS[permission.key as Permission];
    return key ? i18n.t(`options:permissions.${key}.description`) : permission.description;
}

export function getPermissionGroupLabel(group: string): string {
    const key = GROUP_KEYS[group];
    return key ? i18n.t(`options:permissionGroups.${key}`) : group;
}
