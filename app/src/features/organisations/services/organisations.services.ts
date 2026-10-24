import i18n from "@/i18n";
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

export const getOrganisations = () => wrap<Organisation[]>(axiosInstance.get(ApiRoutes.organisations.prefix), i18n.t("common:errors.organisations.failedToLoadYourOrganisations"));

export const getPermissionCatalog = () => wrap<PermissionDefinition[]>(axiosInstance.get(ApiRoutes.organisations.permissions), i18n.t("common:errors.organisations.failedToLoadPermissions"));

export const createOrganisation = (name: string) => wrap<Organisation>(axiosInstance.post(ApiRoutes.organisations.prefix, { name }), i18n.t("common:errors.organisations.failedToCreateTheOrganisation"));

export const updateOrganisation = ({ orgId, name }: { orgId: string; name: string }) =>
    wrap<Organisation>(axiosInstance.patch(ApiRoutes.organisations.detail(orgId), { name }), i18n.t("common:errors.organisations.failedToRenameTheOrganisation"));

export const deleteOrganisation = ({ orgId, confirmName }: { orgId: string; confirmName: string }) =>
    wrap<{ deleted: boolean }>(axiosInstance.delete(ApiRoutes.organisations.detail(orgId), { data: { confirm_name: confirmName } }), i18n.t("common:errors.organisations.failedToDeleteTheOrganisation"));

export const getMembers = (orgId: string) => wrap<Member[]>(axiosInstance.get(ApiRoutes.organisations.members(orgId)), i18n.t("common:errors.organisations.failedToLoadMembers"));

export const updateMemberRole = ({ orgId, memberId, role }: { orgId: string; memberId: string; role: OrgRole }) =>
    wrap<{ id: string; role: OrgRole }>(axiosInstance.patch(ApiRoutes.organisations.member(orgId, memberId), { role }), i18n.t("common:errors.organisations.failedToChangeTheRole"));

export const removeMember = ({ orgId, memberId }: { orgId: string; memberId: string }) =>
    wrap<{ id: string }>(axiosInstance.delete(ApiRoutes.organisations.member(orgId, memberId)), i18n.t("common:errors.organisations.failedToRemoveTheMember"));

export const getRoles = (orgId: string) => wrap<RoleSummary[]>(axiosInstance.get(ApiRoutes.organisations.roles(orgId)), i18n.t("common:errors.organisations.failedToLoadRoles"));

export const updateRolePermissions = ({ orgId, role, permissions }: { orgId: string; role: OrgRole; permissions: string[] }) =>
    wrap<RoleSummary>(axiosInstance.put(ApiRoutes.organisations.role(orgId, role), { permissions }), i18n.t("common:errors.organisations.failedToSavePermissions"));

export const resetRolePermissions = ({ orgId, role }: { orgId: string; role: OrgRole }) =>
    wrap<RoleSummary>(axiosInstance.post(ApiRoutes.organisations.role_reset(orgId, role)), i18n.t("common:errors.organisations.failedToResetPermissions"));

export const getInvitations = (orgId: string) => wrap<Invitation[]>(axiosInstance.get(ApiRoutes.organisations.invitations(orgId)), i18n.t("common:errors.organisations.failedToLoadInvitations"));

export const inviteMember = ({ orgId, email, role }: { orgId: string; email: string; role: OrgRole }) =>
    wrap<InvitationDelivery>(axiosInstance.post(ApiRoutes.organisations.invitations(orgId), { email, role }), i18n.t("common:errors.organisations.failedToSendTheInvitation"));

export const resendInvitation = ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
    wrap<InvitationDelivery>(axiosInstance.post(ApiRoutes.organisations.invitation_resend(orgId, invitationId)), i18n.t("common:errors.organisations.failedToResendTheInvitation"));

export const revokeInvitation = ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
    wrap<{ invitation: Invitation }>(axiosInstance.post(ApiRoutes.organisations.invitation_revoke(orgId, invitationId)), i18n.t("common:errors.organisations.failedToRevokeTheInvitation"));

export const getInvitationPreview = (token: string) => wrap<InvitationPreview>(axiosInstance.get(ApiRoutes.invitations.preview(token)), i18n.t("common:errors.organisations.thisInvitationLinkIsNotValid"));

export const getMyInvitations = () => wrap<MyInvitation[]>(axiosInstance.get(ApiRoutes.invitations.mine), i18n.t("common:errors.organisations.failedToLoadYourInvitations"));

export const acceptInvitationByToken = (token: string) => wrap<AcceptedInvitation>(axiosInstance.post(ApiRoutes.invitations.accept, { token }), i18n.t("common:errors.organisations.failedToAcceptTheInvitation"));

export const acceptInvitationById = (invitationId: string) => wrap<AcceptedInvitation>(axiosInstance.post(ApiRoutes.invitations.accept_by_id(invitationId)), i18n.t("common:errors.organisations.failedToAcceptTheInvitation"));
