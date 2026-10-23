import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import {
  ROLE_PRESETS,
  sanitizePermissions,
} from '@/shared/config/permissions/permissions.config';
import { OrgAccessService } from './org-access.service';

const ROLE_ORDER: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER];

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OrgAccessService,
  ) {}

  async list(ctx: OrgContext) {
    const counts = await this.prisma.membership.groupBy({
      by: ['role'],
      where: { organisation_id: ctx.organisationId },
      _count: { _all: true },
    });

    return Promise.all(
      ROLE_ORDER.map(async (role) => {
        const permissions = await this.access.resolvePermissions(
          ctx.organisationId,
          role,
        );
        const preset = ROLE_PRESETS[role];
        return {
          role,
          permissions,
          // Owners always hold everything; only admin and member can be customised.
          editable: role !== OrgRole.OWNER,
          customised:
            permissions.length !== preset.length ||
            permissions.some((p) => !preset.includes(p)),
          members_count: counts.find((c) => c.role === role)?._count._all ?? 0,
        };
      }),
    );
  }

  async update(ctx: OrgContext, role: OrgRole, permissions: string[]) {
    this.assertEditable(role);
    const clean = sanitizePermissions(role, permissions);
    await this.prisma.rolePermission.upsert({
      where: {
        organisation_id_role: { organisation_id: ctx.organisationId, role },
      },
      create: { organisation_id: ctx.organisationId, role, permissions: clean },
      update: { permissions: clean },
    });
    return (await this.list(ctx)).find((item) => item.role === role);
  }

  async reset(ctx: OrgContext, role: OrgRole) {
    this.assertEditable(role);
    return this.update(ctx, role, ROLE_PRESETS[role]);
  }

  private assertEditable(role: OrgRole) {
    if (role === OrgRole.OWNER)
      throw new BadRequestException('Owners always have every permission');
  }
}
