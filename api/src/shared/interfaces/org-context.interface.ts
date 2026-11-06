import { AuthRole, OrgRole } from 'generated/prisma';
import { Permission } from '@/shared/config/permissions/permissions.config';

// Resolved for every organisation-scoped request by the OrgGuard.
export interface OrgContext {
  userId: string;
  organisationId: string;
  role: OrgRole;
  permissions: Permission[];
  // The signed-in user's platform role (from the JWT), e.g. ADMIN for CallZen staff.
  platformRole?: AuthRole | string | null;
}

export const can = (ctx: OrgContext, permission: Permission): boolean =>
  ctx.permissions.includes(permission);

// Platform ADMIN / SUPER_ADMIN: the only people who ever see AI costs, model choices and browser voice.
export const isPlatformAdminRole = (role: string | null | undefined): boolean =>
  role === AuthRole.ADMIN || role === AuthRole.SUPER_ADMIN;

export const isPlatformAdmin = (ctx: Pick<OrgContext, 'platformRole'>): boolean =>
  isPlatformAdminRole(ctx.platformRole);
