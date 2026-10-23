export const OrgRoles = {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MEMBER: "MEMBER",
} as const;
export type OrgRole = (typeof OrgRoles)[keyof typeof OrgRoles];

// Mirrors the permission keys defined by the API.
export const Permissions = {
    AGENTS_VIEW: "agents.view",
    AGENTS_MANAGE: "agents.manage",
    PROSPECTS_MANAGE: "prospects.manage",
    CALLS_CREATE: "calls.create",
    CALLS_VIEW_ALL: "calls.view_all",
    CALLS_MANAGE_ALL: "calls.manage_all",
    USAGE_VIEW: "usage.view",
    MEMBERS_VIEW: "members.view",
    MEMBERS_INVITE: "members.invite",
    MEMBERS_MANAGE: "members.manage",
    ROLES_MANAGE: "roles.manage",
    ORG_UPDATE: "org.update",
    ORG_DELETE: "org.delete",
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const InvitationStatuses = {
    PENDING: "PENDING",
    EXPIRED: "EXPIRED",
    ACCEPTED: "ACCEPTED",
    REVOKED: "REVOKED",
} as const;
export type InvitationStatus = (typeof InvitationStatuses)[keyof typeof InvitationStatuses];

export interface Organisation {
    id: string;
    name: string;
    role: OrgRole;
    permissions: Permission[];
    members_count: number;
    joined_at: string;
    created_at: string;
}

export interface PermissionDefinition {
    key: Permission;
    label: string;
    description: string;
    group: string;
    owner_only: boolean;
}

export interface Member {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    role: OrgRole;
    joined_at: string;
    is_you: boolean;
    can_change_role: boolean;
    can_remove: boolean;
}

export interface RoleSummary {
    role: OrgRole;
    permissions: Permission[];
    editable: boolean;
    customised: boolean;
    members_count: number;
}

export interface Invitation {
    id: string;
    organisation_id: string;
    email: string;
    role: OrgRole;
    status: InvitationStatus;
    invited_by: string | null;
    expires_at: string;
    last_sent_at: string;
    send_count: number;
    created_at: string;
}

export interface InvitationDelivery {
    invitation: Invitation;
    invite_url: string;
    email_sent: boolean;
}

export interface InvitationPreview {
    organisation_name: string;
    email: string;
    role: OrgRole;
    status: InvitationStatus;
    invited_by: string | null;
    expires_at: string;
    account_exists: boolean;
}

export interface MyInvitation {
    id: string;
    organisation_name: string;
    role: OrgRole;
    invited_by: string | null;
    expires_at: string;
}

export interface AcceptedInvitation {
    organisation_id: string;
    organisation_name: string;
    role: OrgRole;
}
