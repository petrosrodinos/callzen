import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PERMISSION_CATALOG } from '@/shared/config/permissions/permissions.config';
import { OrgAccessService } from './org-access.service';
import { EntitlementsService } from '@/modules/billing/services/entitlements.service';
import { StripeSyncService } from '@/modules/billing/services/stripe-sync.service';
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
    private readonly entitlements: EntitlementsService,
    private readonly stripeSync: StripeSyncService,
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
        permissions: await this.access.effectivePermissions(
          membership.organisation_id,
          membership.role,
        ),
        plan: await this.planSummary(membership.organisation_id),
        // Owners are warned before deleting that members' bought minutes would be lost (§14). Count only:
        // personal balances themselves stay private.
        ...(membership.role === OrgRole.OWNER && {
          members_with_bought_minutes: await this.membersWithBoughtMinutes(
            membership.organisation_id,
          ),
        }),
        members_count: membership.organisation._count.memberships,
        joined_at: membership.created_at,
        created_at: membership.organisation.created_at,
      })),
    );
  }

  private async membersWithBoughtMinutes(organisationId: string) {
    const rows = await this.prisma.usageCredit.groupBy({
      by: ['user_id'],
      where: {
        organisation_id: organisationId,
        user_id: { not: null },
        OR: [
          { live_seconds_remaining: { gt: 0 } },
          { practice_seconds_remaining: { gt: 0 } },
        ],
      },
    });
    return rows.length;
  }

    private async planSummary(organisationId: string) {
    const entitlements = await this.entitlements.getEntitlements(organisationId);
    return {
      key: entitlements.plan,
      status: entitlements.status,
      read_only: entitlements.read_only,
      trial_ends_at: entitlements.trial_ends_at,
    };
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

  async remove(ctx: OrgContext, dto: DeleteOrganisationDto) {
    const memberships = await this.prisma.membership.count({
      where: { user_id: ctx.userId },
    });
    if (memberships <= 1)
      throw new BadRequestException('You cannot delete your only organisation');
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
    // A paid plan is cancelled in Stripe first (prorated), so nobody keeps being charged (§11).
    await this.stripeSync.cancelForDeletion(organisationId);
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
