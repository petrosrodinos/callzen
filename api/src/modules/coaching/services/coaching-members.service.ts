import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgAccessService } from '@/modules/organisations/services/org-access.service';
import { Permissions } from '@/shared/config/permissions/permissions.config';

export interface CoachingMember {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  role: OrgRole;
  joined_at: Date;
  // Members whose role has coaching.view are coaches; everyone else is a student.
  is_coach: boolean;
  is_owner: boolean;
}

// Members of an organisation, split into coaches and students by their role's effective permissions.
@Injectable()
export class CoachingMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrgAccessService,
  ) {}

  async list(organisationId: string): Promise<CoachingMember[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { organisation_id: organisationId },
      include: { user: { select: { id: true, full_name: true, email: true } } },
      orderBy: { created_at: 'asc' },
    });
    const coachRoles = await this.coachRoles(
      organisationId,
      [...new Set(memberships.map((m) => m.role))],
    );
    return memberships.map((membership) => ({
      membership_id: membership.id,
      user_id: membership.user_id,
      name: membership.user.full_name || membership.user.email,
      email: membership.user.email,
      role: membership.role,
      joined_at: membership.created_at,
      is_coach: coachRoles.has(membership.role),
      is_owner: membership.role === OrgRole.OWNER,
    }));
  }

  async students(organisationId: string) {
    return (await this.list(organisationId)).filter((m) => !m.is_coach);
  }

  async getMember(organisationId: string, userId: string): Promise<CoachingMember> {
    const member = (await this.list(organisationId)).find((m) => m.user_id === userId);
    // 404 rather than 403, so membership of other organisations is not leaked.
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async coachIds(organisationId: string): Promise<string[]> {
    return (await this.list(organisationId))
      .filter((m) => m.is_coach)
      .map((m) => m.user_id);
  }

  // Display names for user ids, including people who have since left the organisation.
  async names(userIds: string[]): Promise<Record<string, string>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return {};
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, full_name: true, email: true },
    });
    return Object.fromEntries(users.map((u) => [u.id, u.full_name || u.email]));
  }

  private async coachRoles(organisationId: string, roles: OrgRole[]) {
    const result = new Set<OrgRole>();
    for (const role of roles) {
      const permissions = await this.orgAccess.effectivePermissions(organisationId, role);
      if (permissions.includes(Permissions.COACHING_VIEW)) result.add(role);
    }
    return result;
  }
}
