import { OrgRoles, type OrgRole } from "@/features/organisations/interfaces/organisations.interfaces";

const RANK: Record<OrgRole, number> = { [OrgRoles.MEMBER]: 1, [OrgRoles.ADMIN]: 2, [OrgRoles.OWNER]: 3 };

// Mirrors the API rule: owners can hand out any role, everyone else only roles below their own.
export const assignableRoles = (actor: OrgRole | undefined): OrgRole[] => {
    if (!actor) return [];
    if (actor === OrgRoles.OWNER) return [OrgRoles.OWNER, OrgRoles.ADMIN, OrgRoles.MEMBER];
    return (Object.keys(RANK) as OrgRole[]).filter((role) => RANK[role] < RANK[actor]).sort((a, b) => RANK[b] - RANK[a]);
};
