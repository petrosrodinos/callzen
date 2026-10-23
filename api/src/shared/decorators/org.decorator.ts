import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Permission } from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';

export const PERMISSIONS_KEY = 'required_permissions';

// All listed permissions are required. Enforced by OrgGuard.
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// The organisation context (organisation, role, permissions) resolved for this request.
export const Org = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    return ctx.switchToHttp().getRequest().org;
  },
);
