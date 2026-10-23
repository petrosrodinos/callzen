import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { OrgAccessService } from '@/modules/organisations/services/org-access.service';
import { PERMISSIONS_KEY } from '@/shared/decorators/org.decorator';
import { Permission } from '@/shared/config/permissions/permissions.config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';

// Runs after JwtGuard. Resolves the active organisation from the :orgId route param or the
// X-Organisation-Id header (falling back to the user's oldest membership), verifies membership,
// loads the role's permissions and enforces @RequirePermissions().
@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: OrgAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) throw new ForbiddenException('Authentication required');

    const requested =
      (request.params?.orgId as string | undefined) ??
      (request.headers['x-organisation-id'] as string | undefined);
    if (requested && !isUUID(requested))
      throw new ForbiddenException({
        message: 'Invalid organisation',
        code: 'INVALID_ORGANISATION',
      });

    let ctx = await this.access.getContext(userId, requested);

    if (!ctx && !requested) {
      // Legacy or imported accounts without an organisation get a personal one on first use.
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.access.createPersonalOrganisation(user);
        ctx = await this.access.getContext(userId);
      }
    }

    if (!ctx)
      throw new ForbiddenException({
        message: 'You are not a member of this organisation',
        code: 'NOT_A_MEMBER',
      });

    const required =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const missing = required.filter(
      (permission) => !ctx.permissions.includes(permission),
    );
    if (missing.length) {
      throw new ForbiddenException({
        message: 'Your role does not allow this action',
        code: 'PERMISSION_DENIED',
        missing,
      });
    }

    request.org = ctx;
    return true;
  }
}
