import { Injectable } from '@nestjs/common';
import { Prisma, OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  Permission,
  ROLE_PRESETS,
  sanitizePermissions,
} from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';

type Tx = Prisma.TransactionClient | PrismaService;

// Resolves who a user is inside an organisation and what they may do. Also owns organisation creation,
// because sign-up and the guard both need it.
@Injectable()
export class OrgAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePermissions(
    organisationId: string,
    role: OrgRole,
    db: Tx = this.prisma,
  ): Promise<Permission[]> {
    if (role === OrgRole.OWNER) return ROLE_PRESETS[OrgRole.OWNER];
    const stored = await db.rolePermission.findUnique({
      where: {
        organisation_id_role: { organisation_id: organisationId, role },
      },
    });
    return sanitizePermissions(role, stored?.permissions ?? ROLE_PRESETS[role]);
  }

  async getContext(
    userId: string,
    organisationId?: string,
  ): Promise<OrgContext | null> {
    const membership = organisationId
      ? await this.prisma.membership.findUnique({
          where: {
            organisation_id_user_id: {
              organisation_id: organisationId,
              user_id: userId,
            },
          },
        })
      : await this.prisma.membership.findFirst({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        });

    if (!membership) return null;
    return {
      userId,
      organisationId: membership.organisation_id,
      role: membership.role,
      permissions: await this.resolvePermissions(
        membership.organisation_id,
        membership.role,
      ),
    };
  }

  // Creates the organisation with the preset role permissions and makes the user its owner.
  async createOrganisation(userId: string, name: string, db: Tx = this.prisma) {
    const organisation = await db.organisation.create({
      data: {
        name,
        memberships: { create: { user_id: userId, role: OrgRole.OWNER } },
        role_permissions: {
          create: [OrgRole.ADMIN, OrgRole.MEMBER].map((role) => ({
            role,
            permissions: ROLE_PRESETS[role],
          })),
        },
      },
    });
    return organisation;
  }

  async createPersonalOrganisation(
    user: { id: string; email: string; full_name?: string | null },
    db: Tx = this.prisma,
  ) {
    const base = user.full_name?.trim() || user.email.split('@')[0];
    return this.createOrganisation(user.id, `${base}'s workspace`, db);
  }
}
