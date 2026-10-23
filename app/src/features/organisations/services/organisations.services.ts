import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    AcceptedInvitation,
    Invitation,
    InvitationDelivery,
    InvitationPreview,
    Member,
    MyInvitation,
    Organisation,
    OrgRole,
    PermissionDefinition,
    RoleSummary,
} from "../interfaces/organisations.interfaces";

const wrap = async <T>(request: Promise<{ data: T }>, fallback: string): Promise<T> => {
    try {
        return (await request).data;
    } catch (error) {
        throw new ApiError(error, fallback);
    }
};

export const getOrganisations = () => wrap<Organisation[]>(axiosInstance.get(ApiRoutes.organisations.prefix), "Failed to load your organisations.");

export const getPermissionCatalog = () => wrap<PermissionDefinition[]>(axiosInstance.get(ApiRoutes.organisations.permissions), "Failed to load permissions.");

export const createOrganisation = (name: string) => wrap<Organisation>(axiosInstance.post(ApiRoutes.organisations.prefix, { name }), "Failed to create the organisation.");

export const updateOrganisation = ({ orgId, name }: { orgId: string; name: string }) =>
    wrap<Organisation>(axiosInstance.patch(ApiRoutes.organisations.detail(orgId), { name }), "Failed to rename the organisation.");

export const deleteOrganisation = ({ orgId, confirmName }: { orgId: string; confirmName: string }) =>
    wrap<{ deleted: boolean }>(axiosInstance.delete(ApiRoutes.organisations.detail(orgId), { data: { confirm_name: confirmName } }), "Failed to delete the organisation.");

export const leaveOrganisation = (orgId: string) => wrap<{ left: boolean }>(axiosInstance.post(ApiRoutes.organisations.leave(orgId)), "Failed to leave the organisation.");

export const getMembers = (orgId: string) => wrap<Member[]>(axiosInstance.get(ApiRoutes.organisations.members(orgId)), "Failed to load members.");

export const updateMemberRole = ({ orgId, memberId, role }: { orgId: string; memberId: string; role: OrgRole }) =>
    wrap<{ id: string; role: OrgRole }>(axiosInstance.patch(ApiRoutes.organisations.member(orgId, memberId), { role }), "Failed to change the role.");

export const removeMember = ({ orgId, memberId }: { orgId: string; memberId: string }) =>
    wrap<{ id: string }>(axiosInstance.delete(ApiRoutes.organisations.member(orgId, memberId)), "Failed to remove the member.");

export const getRoles = (orgId: string) => wrap<RoleSummary[]>(axiosInstance.get(ApiRoutes.organisations.roles(orgId)), "Failed to load roles.");

export const updateRolePermissions = ({ orgId, role, permissions }: { orgId: string; role: OrgRole; permissions: string[] }) =>
    wrap<RoleSummary>(axiosInstance.put(ApiRoutes.organisations.role(orgId, role), { permissions }), "Failed to save permissions.");

export const resetRolePermissions = ({ orgId, role }: { orgId: string; role: OrgRole }) =>
    wrap<RoleSummary>(axiosInstance.post(ApiRoutes.organisations.role_reset(orgId, role)), "Failed to reset permissions.");

export const getInvitations = (orgId: string) => wrap<Invitation[]>(axiosInstance.get(ApiRoutes.organisations.invitations(orgId)), "Failed to load invitations.");

export const inviteMember = ({ orgId, email, role }: { orgId: string; email: string; role: OrgRole }) =>
    wrap<InvitationDelivery>(axiosInstance.post(ApiRoutes.organisations.invitations(orgId), { email, role }), "Failed to send the invitation.");

export const resendInvitation = ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
    wrap<InvitationDelivery>(axiosInstance.post(ApiRoutes.organisations.invitation_resend(orgId, invitationId)), "Failed to resend the invitation.");

export const revokeInvitation = ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
    wrap<{ invitation: Invitation }>(axiosInstance.post(ApiRoutes.organisations.invitation_revoke(orgId, invitationId)), "Failed to revoke the invitation.");

export const getInvitationPreview = (token: string) => wrap<InvitationPreview>(axiosInstance.get(ApiRoutes.invitations.preview(token)), "This invitation link is not valid.");

export const getMyInvitations = () => wrap<MyInvitation[]>(axiosInstance.get(ApiRoutes.invitations.mine), "Failed to load your invitations.");

export const acceptInvitationByToken = (token: string) => wrap<AcceptedInvitation>(axiosInstance.post(ApiRoutes.invitations.accept, { token }), "Failed to accept the invitation.");

export const acceptInvitationById = (invitationId: string) => wrap<AcceptedInvitation>(axiosInstance.post(ApiRoutes.invitations.accept_by_id(invitationId)), "Failed to accept the invitation.");
