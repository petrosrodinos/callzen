import i18n from "@/i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useOrganisationStore } from "@/stores/organisation";
import { OrgRoles, type Organisation, type Permission } from "../interfaces/organisations.interfaces";
import {
    acceptInvitationById,
    acceptInvitationByToken,
    createOrganisation,
    deleteOrganisation,
    getInvitationPreview,
    getInvitations,
    getMembers,
    getMyInvitations,
    getOrganisations,
    getPermissionCatalog,
    getRoles,
    inviteMember,
    removeMember,
    resendInvitation,
    resetRolePermissions,
    revokeInvitation,
    updateMemberRole,
    updateOrganisation,
    updateRolePermissions,
} from "../services/organisations.services";
import { useAuthStore } from "@/stores/auth";

// Queries that belong to the signed-in user rather than to one organisation.
const USER_SCOPED_KEYS = new Set(["organisations", "me", "catalog", "my-invitations", "invitation-preview", "permission-catalog"]);

export const useOrganisations = () => {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    return useQuery({ queryKey: ["organisations"], queryFn: getOrganisations, enabled: !!isLoggedIn, staleTime: 1000 * 30 });
};

// The organisation the user is currently working in, with their role and permissions.
export const useActiveOrganisation = () => {
    const { data: organisations, isPending } = useOrganisations();
    const activeId = useOrganisationStore((state) => state.activeOrganisationId);
    const organisation = organisations?.find((item) => item.id === activeId) ?? organisations?.[0];
    return { organisation, organisations: organisations ?? [], isPending };
};

export const usePermissions = () => {
    const { organisation, isPending } = useActiveOrganisation();
    const permissions = organisation?.permissions ?? [];
    return {
        isPending,
        organisation,
        role: organisation?.role,
        isOwner: organisation?.role === OrgRoles.OWNER,
        permissions,
        can: (permission: Permission) => permissions.includes(permission),
    };
};

export const useSwitchOrganisation = () => {
    const queryClient = useQueryClient();
    const setActive = useOrganisationStore((state) => state.setActiveOrganisationId);
    return (organisationId: string) => {
        setActive(organisationId);
        // Everything cached for the previous organisation is irrelevant now.
        queryClient.removeQueries({ predicate: (query) => !USER_SCOPED_KEYS.has(String(query.queryKey[0])) });
    };
};

export const usePermissionCatalog = () => useQuery({ queryKey: ["permission-catalog"], queryFn: getPermissionCatalog, staleTime: Infinity });

export const useCreateOrganisation = () => {
    const queryClient = useQueryClient();
    const switchOrganisation = useSwitchOrganisation();
    return useMutation({
        mutationFn: createOrganisation,
        onSuccess: async (organisation: Organisation) => {
            await queryClient.invalidateQueries({ queryKey: ["organisations"] });
            switchOrganisation(organisation.id);
            toast({ title: i18n.t("common:toasts.organisations.organisationCreated"), description: i18n.t("common:toasts.organisations.workingIn", { name: organisation.name }), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotCreateTheOrganisation"), description: error.message, variant: "error" });
        },
    });
};

export const useUpdateOrganisation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateOrganisation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: i18n.t("common:toasts.organisations.organisationRenamed"), duration: 1800 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotRenameTheOrganisation"), description: error.message, variant: "error" });
        },
    });
};

const useLeaveOrDeleteCleanup = () => {
    const queryClient = useQueryClient();
    const setActive = useOrganisationStore((state) => state.setActiveOrganisationId);
    return async () => {
        setActive(null);
        queryClient.removeQueries({ predicate: (query) => !USER_SCOPED_KEYS.has(String(query.queryKey[0])) });
        await queryClient.invalidateQueries({ queryKey: ["organisations"] });
    };
};

export const useDeleteOrganisation = () => {
    const cleanup = useLeaveOrDeleteCleanup();
    return useMutation({
        mutationFn: deleteOrganisation,
        onSuccess: async () => {
            await cleanup();
            toast({ title: i18n.t("common:toasts.organisations.organisationPermanentlyDeleted"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotDeleteTheOrganisation"), description: error.message, variant: "error" });
        },
    });
};

export const useMembers = (orgId: string | undefined, enabled = true) =>
    useQuery({ queryKey: ["members", orgId], queryFn: () => getMembers(orgId as string), enabled: !!orgId && enabled });

export const useUpdateMemberRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMemberRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["members"] });
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: i18n.t("common:toasts.organisations.roleUpdated"), duration: 1800 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotChangeTheRole"), description: error.message, variant: "error" });
        },
    });
};

export const useRemoveMember = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["members"] });
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: i18n.t("common:toasts.organisations.memberRemoved"), duration: 1800 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotRemoveTheMember"), description: error.message, variant: "error" });
        },
    });
};

export const useRoles = (orgId: string | undefined, enabled = true) =>
    useQuery({ queryKey: ["roles", orgId], queryFn: () => getRoles(orgId as string), enabled: !!orgId && enabled });

export const useUpdateRolePermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRolePermissions,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: i18n.t("common:toasts.organisations.permissionsSaved"), description: i18n.t("common:toasts.organisations.theChangeAppliesToEveryoneWith"), duration: 2500 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotSavePermissions"), description: error.message, variant: "error" });
        },
    });
};

export const useResetRolePermissions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resetRolePermissions,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: i18n.t("common:toasts.organisations.permissionsResetToThePreset"), duration: 2000 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotResetPermissions"), description: error.message, variant: "error" });
        },
    });
};

export const useInvitations = (orgId: string | undefined, enabled = true) =>
    useQuery({ queryKey: ["invitations", orgId], queryFn: () => getInvitations(orgId as string), enabled: !!orgId && enabled });

export const useInviteMember = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: inviteMember,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({
                title: result.email_sent ? i18n.t("common:toasts.organisations.invitationSent") : i18n.t("common:toasts.organisations.invitationCreated"),
                description: result.email_sent ? i18n.t("common:toasts.organisations.emailedTo", { email: result.invitation.email }) : i18n.t("common:toasts.organisations.emailUnavailableInvite"),
                variant: result.email_sent ? "success" : "warning",
                duration: 3500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotSendTheInvitation"), description: error.message, variant: "error" });
        },
    });
};

export const useResendInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resendInvitation,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({
                title: result.email_sent ? i18n.t("common:toasts.organisations.invitationResent") : i18n.t("common:toasts.organisations.newLinkCreated"),
                description: result.email_sent ? i18n.t("common:toasts.organisations.emailedFresh", { email: result.invitation.email }) : i18n.t("common:toasts.organisations.emailUnavailableLink"),
                variant: result.email_sent ? "success" : "warning",
                duration: 3500,
            });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotResendTheInvitation"), description: error.message, variant: "error" });
        },
    });
};

export const useRevokeInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: revokeInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: i18n.t("common:toasts.organisations.invitationRevoked"), description: i18n.t("common:toasts.organisations.theLinkNoLongerWorks"), duration: 2200 });
        },
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotRevokeTheInvitation"), description: error.message, variant: "error" });
        },
    });
};

export const useInvitationPreview = (token: string | undefined) =>
    useQuery({ queryKey: ["invitation-preview", token], queryFn: () => getInvitationPreview(token as string), enabled: !!token, retry: false });

export const useMyInvitations = () => {
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    return useQuery({ queryKey: ["my-invitations"], queryFn: getMyInvitations, enabled: !!isLoggedIn, staleTime: 1000 * 30 });
};

const useAcceptSuccess = () => {
    const queryClient = useQueryClient();
    const switchOrganisation = useSwitchOrganisation();
    return async (accepted: { organisation_id: string; organisation_name: string }) => {
        await queryClient.invalidateQueries({ queryKey: ["organisations"] });
        queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
        switchOrganisation(accepted.organisation_id);
        toast({ title: i18n.t("common:toasts.organisations.welcomeTo", { name: accepted.organisation_name }), description: i18n.t("common:toasts.organisations.youCanSwitchOrganisationsFromThe"), duration: 3000 });
    };
};

export const useAcceptInvitationByToken = () => {
    const onAccepted = useAcceptSuccess();
    return useMutation({
        mutationFn: acceptInvitationByToken,
        onSuccess: onAccepted,
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotAcceptTheInvitation"), description: error.message, variant: "error" });
        },
    });
};

export const useAcceptInvitationById = () => {
    const onAccepted = useAcceptSuccess();
    return useMutation({
        mutationFn: acceptInvitationById,
        onSuccess: onAccepted,
        onError: (error) => {
            toast({ title: i18n.t("common:toasts.organisations.couldNotAcceptTheInvitation"), description: error.message, variant: "error" });
        },
    });
};
