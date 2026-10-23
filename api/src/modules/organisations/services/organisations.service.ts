import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PERMISSION_CATALOG } from '@/shared/config/permissions/permissions.config';
import { OrgAccessService } from './org-access.service';
import {
  CreateOrganisationDto,
  DeleteOrganisationDto,
  UpdateOrganisationDto,
} from '../dto/organisation.dto';

@Injectable()
export class OrganisationsService {
  private readonly logger = new Logger(OrganisationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: OrgAccessService,
    private readonly recordingStorage: RecordingStorageService,
  ) {}

  permissionCatalog() {
    return PERMISSION_CATALOG;
  }

  // Every organisation the user belongs to, with their role and effective permissions in each.
  async listMine(userId: string) {
    // A user without any organisation (e.g. their only one was deleted) gets a fresh personal workspace.
    if (!(await this.prisma.membership.count({ where: { user_id: userId } }))) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) await this.access.createPersonalOrganisation(user);
    }
    const memberships = await this.prisma.membership.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      include: {
        organisation: {
          include: { _count: { select: { memberships: true } } },
        },
      },
    });

    return Promise.all(
      memberships.map(async (membership) => ({
        id: membership.organisation_id,
        name: membership.organisation.name,
        role: membership.role,
        permissions: await this.access.resolvePermissions(
          membership.organisation_id,
          membership.role,
        ),
        members_count: membership.organisation._count.memberships,
        joined_at: membership.created_at,
        created_at: membership.organisation.created_at,
      })),
    );
  }

  async create(userId: string, dto: CreateOrganisationDto) {
    const organisation = await this.access.createOrganisation(userId, dto.name);
    return (await this.listMine(userId)).find(
      (item) => item.id === organisation.id,
    );
  }

  async update(ctx: OrgContext, dto: UpdateOrganisationDto) {
    await this.prisma.organisation.update({
      where: { id: ctx.organisationId },
      data: { name: dto.name },
    });
    return (await this.listMine(ctx.userId)).find(
      (item) => item.id === ctx.organisationId,
    );
  }

  async leave(ctx: OrgContext) {
    if (ctx.role === OrgRole.OWNER)
      await this.assertAnotherOwner(ctx.organisationId, ctx.userId);
    await this.prisma.membership.delete({
      where: {
        organisation_id_user_id: {
          organisation_id: ctx.organisationId,
          user_id: ctx.userId,
        },
      },
    });
    return { left: true };
  }

  async remove(ctx: OrgContext, dto: DeleteOrganisationDto) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: ctx.organisationId },
    });
    if (!organisation || organisation.name !== dto.confirm_name) {
      throw new BadRequestException(
        'The name you typed does not match the organisation name',
      );
    }
    await this.deleteWithData(ctx.organisationId);
    return { deleted: true };
  }

  // Deletes the organisation (cascading to calls, agents, members and invitations) and its stored recordings.
  async deleteWithData(organisationId: string) {
    const recordings = await this.prisma.call.findMany({
      where: { organisation_id: organisationId, recording_path: { not: null } },
      select: { recording_path: true },
    });
    await this.prisma.organisation.delete({ where: { id: organisationId } });
    await Promise.all(
      recordings.map((call) =>
        this.recordingStorage
          .remove(call.recording_path)
          .catch((error) =>
            this.logger.warn(`Recording cleanup failed: ${error?.message}`),
          ),
      ),
    );
  }

  async assertAnotherOwner(organisationId: string, excludingUserId: string) {
    const others = await this.prisma.membership.count({
      where: {
        organisation_id: organisationId,
        role: OrgRole.OWNER,
        user_id: { not: excludingUserId },
      },
    });
    if (!others) {
      throw new BadRequestException({
        message:
          'An organisation needs at least one owner. Make someone else an owner first, or delete the organisation.',
        code: 'LAST_OWNER',
      });
    }
  }
}
