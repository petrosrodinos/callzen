import { Injectable } from '@nestjs/common';
import { Prisma, OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import {
  Permission,
  Permissions,
  ROLE_PRESETS,
  sanitizePermissions,
} from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import {
  PlanFeature,
  PlanFeatures,
} from '@/shared/config/plans/plans.config';
import { EntitlementsService } from '@/modules/billing/services/entitlements.service';
import { SubscriptionsService } from '@/modules/billing/services/subscriptions.service';

// Permissions that only take effect when the plan includes the matching feature: plan limits apply on top of
// role permissions (§10.1a). Stored role permissions are never changed by a plan change.
const FEATURE_GATED_PERMISSIONS: Partial<Record<Permission, PlanFeature>> = {
  [Permissions.CALLS_VIEW_ALL]: PlanFeatures.VIEW_ALL_MEMBER_CALLS,
  [Permissions.CALLS_MANAGE_ALL]: PlanFeatures.VIEW_ALL_MEMBER_CALLS,
};

type Tx = Prisma.TransactionClient | PrismaService;

// Resolves who a user is inside an organisation and what they may do. Also owns organisation creation,
// because sign-up and the guard both need it.
@Injectable()
export class OrgAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // What the role may do right now: its permissions, minus those the organisation's plan does not include.
  async effectivePermissions(
    organisationId: string,
    role: OrgRole,
  ): Promise<Permission[]> {
    const [permissions, entitlements] = await Promise.all([
      this.resolvePermissions(organisationId, role),
      this.entitlements.getEntitlements(organisationId),
    ]);
    return permissions.filter((permission) => {
      const feature = FEATURE_GATED_PERMISSIONS[permission];
      return !feature || entitlements.features[feature];
    });
  }

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
      permissions: await this.effectivePermissions(
        membership.organisation_id,
        membership.role,
      ),
    };
  }

  // Creates the organisation with the preset role permissions and makes the user its owner. The owner's first
  // organisation starts the trial (§8.5).
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
    await this.subscriptions.createForNewOrganisation(organisation.id, userId, db);
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
