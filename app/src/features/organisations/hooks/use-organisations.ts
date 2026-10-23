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
    leaveOrganisation,
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
            toast({ title: "Organisation created", description: `You are now working in ${organisation.name}.`, duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not create the organisation", description: error.message, variant: "error" });
        },
    });
};

export const useUpdateOrganisation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateOrganisation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organisations"] });
            toast({ title: "Organisation renamed", duration: 1800 });
        },
        onError: (error) => {
            toast({ title: "Could not rename the organisation", description: error.message, variant: "error" });
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
            toast({ title: "Organisation permanently deleted", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not delete the organisation", description: error.message, variant: "error" });
        },
    });
};

export const useLeaveOrganisation = () => {
    const cleanup = useLeaveOrDeleteCleanup();
    return useMutation({
        mutationFn: leaveOrganisation,
        onSuccess: async () => {
            await cleanup();
            toast({ title: "You left the organisation", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not leave the organisation", description: error.message, variant: "error" });
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
            toast({ title: "Role updated", duration: 1800 });
        },
        onError: (error) => {
            toast({ title: "Could not change the role", description: error.message, variant: "error" });
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
            toast({ title: "Member removed", duration: 1800 });
        },
        onError: (error) => {
            toast({ title: "Could not remove the member", description: error.message, variant: "error" });
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
            toast({ title: "Permissions saved", description: "The change applies to everyone with this role right away.", duration: 2500 });
        },
        onError: (error) => {
            toast({ title: "Could not save permissions", description: error.message, variant: "error" });
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
            toast({ title: "Permissions reset to the preset", duration: 2000 });
        },
        onError: (error) => {
            toast({ title: "Could not reset permissions", description: error.message, variant: "error" });
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
                title: result.email_sent ? "Invitation sent" : "Invitation created",
                description: result.email_sent ? `We emailed ${result.invitation.email}.` : "Email isn't available right now. Copy the invite link and share it yourself.",
                variant: result.email_sent ? "success" : "warning",
                duration: 3500,
            });
        },
        onError: (error) => {
            toast({ title: "Could not send the invitation", description: error.message, variant: "error" });
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
                title: result.email_sent ? "Invitation resent" : "New link created",
                description: result.email_sent ? `We emailed ${result.invitation.email} a fresh link.` : "Email isn't available right now. Copy the new link and share it yourself.",
                variant: result.email_sent ? "success" : "warning",
                duration: 3500,
            });
        },
        onError: (error) => {
            toast({ title: "Could not resend the invitation", description: error.message, variant: "error" });
        },
    });
};

export const useRevokeInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: revokeInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: "Invitation revoked", description: "The link no longer works.", duration: 2200 });
        },
        onError: (error) => {
            toast({ title: "Could not revoke the invitation", description: error.message, variant: "error" });
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
        toast({ title: `Welcome to ${accepted.organisation_name}`, description: "You can switch organisations from the sidebar at any time.", duration: 3000 });
    };
};

export const useAcceptInvitationByToken = () => {
    const onAccepted = useAcceptSuccess();
    return useMutation({
        mutationFn: acceptInvitationByToken,
        onSuccess: onAccepted,
        onError: (error) => {
            toast({ title: "Could not accept the invitation", description: error.message, variant: "error" });
        },
    });
};

export const useAcceptInvitationById = () => {
    const onAccepted = useAcceptSuccess();
    return useMutation({
        mutationFn: acceptInvitationById,
        onSuccess: onAccepted,
        onError: (error) => {
            toast({ title: "Could not accept the invitation", description: error.message, variant: "error" });
        },
    });
};
