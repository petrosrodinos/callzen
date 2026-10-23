import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ROLE_RANK } from '@/shared/config/permissions/permissions.config';
import { canActOnRole, canAssignRole } from '../utils/role-rules.utils';
import { OrganisationsService } from './organisations.service';
import { UpdateMemberRoleDto } from '../dto/organisation.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organisations: OrganisationsService,
  ) {}

  async list(ctx: OrgContext) {
    const memberships = await this.prisma.membership.findMany({
      where: { organisation_id: ctx.organisationId },
      include: { user: { select: { id: true, email: true, full_name: true } } },
    });

    return memberships
      .sort(
        (a, b) =>
          ROLE_RANK[b.role] - ROLE_RANK[a.role] ||
          a.created_at.getTime() - b.created_at.getTime(),
      )
      .map((membership) => ({
        id: membership.id,
        user_id: membership.user_id,
        email: membership.user.email,
        full_name: membership.user.full_name,
        role: membership.role,
        joined_at: membership.created_at,
        is_you: membership.user_id === ctx.userId,
        // What the current user may do with this specific member; the UI uses it to show or hide actions.
        can_change_role:
          membership.user_id !== ctx.userId &&
          canActOnRole(ctx.role, membership.role),
        can_remove:
          membership.user_id !== ctx.userId &&
          canActOnRole(ctx.role, membership.role),
      }));
  }

  async updateRole(
    ctx: OrgContext,
    membershipId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const target = await this.getTarget(ctx, membershipId);
    if (target.user_id === ctx.userId)
      throw new ForbiddenException('You cannot change your own role');
    if (target.role === dto.role) return { id: target.id, role: target.role };

    if (!canActOnRole(ctx.role, target.role))
      throw new ForbiddenException({
        message:
          'You cannot change the role of someone with an equal or higher role',
        code: 'ROLE_HIERARCHY',
      });
    if (!canAssignRole(ctx.role, dto.role))
      throw new ForbiddenException({
        message: 'You cannot assign a role equal to or higher than your own',
        code: 'ROLE_HIERARCHY',
      });
    if (target.role === OrgRole.OWNER)
      await this.organisations.assertAnotherOwner(
        ctx.organisationId,
        target.user_id,
      );

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
    });
    return { id: updated.id, role: updated.role };
  }

  async remove(ctx: OrgContext, membershipId: string) {
    const target = await this.getTarget(ctx, membershipId);
    if (target.user_id === ctx.userId)
      throw new BadRequestException(
        'You cannot remove yourself from the organisation',
      );
    if (!canActOnRole(ctx.role, target.role))
      throw new ForbiddenException({
        message: 'You cannot remove someone with an equal or higher role',
        code: 'ROLE_HIERARCHY',
      });
    if (target.role === OrgRole.OWNER)
      await this.organisations.assertAnotherOwner(
        ctx.organisationId,
        target.user_id,
      );

    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { id: membershipId, removed: true };
  }

  private async getTarget(ctx: OrgContext, membershipId: string) {
    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, organisation_id: ctx.organisationId },
    });
    if (!target) throw new NotFoundException('Member not found');
    return target;
  }
}
