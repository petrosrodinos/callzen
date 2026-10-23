import { OrgRole } from 'generated/prisma';
import { Permission } from '@/shared/config/permissions/permissions.config';

// Resolved for every organisation-scoped request by the OrgGuard.
export interface OrgContext {
  userId: string;
  organisationId: string;
  role: OrgRole;
  permissions: Permission[];
}

export const can = (ctx: OrgContext, permission: Permission): boolean =>
  ctx.permissions.includes(permission);
