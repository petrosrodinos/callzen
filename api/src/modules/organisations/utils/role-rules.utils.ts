import { OrgRole } from 'generated/prisma';
import { ROLE_RANK } from '@/shared/config/permissions/permissions.config';

// Owners can act on anyone. Everyone else only on roles strictly below their own.
export const canActOnRole = (actor: OrgRole, target: OrgRole): boolean =>
  actor === OrgRole.OWNER || ROLE_RANK[target] < ROLE_RANK[actor];

// A role can only be handed out if the actor could also manage someone holding it.
export const canAssignRole = canActOnRole;
