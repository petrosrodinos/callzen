import { OrgRole } from 'generated/prisma';
import { OrganisationsService } from '@/modules/organisations/services/organisations.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { DeleteAccountDto, UpdateUserDto } from './dto/update-user.dto';
import { getTemplateTranslation } from '@/shared/config/templates/i18n';
import { DEFAULT_CONSENT_LINE } from '@/shared/config/templates/analysis-criteria.config';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recordingStorage: RecordingStorageService,
    private readonly organisations: OrganisationsService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async update(userId: string, dto: UpdateUserDto) {
    const { consent_acknowledged, ...rest } = dto;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(consent_acknowledged && { consent_acknowledged_at: new Date() }),
      },
    });
    return this.sanitize(user);
  }

  async remove(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Incorrect password');

    // Organisations this user solely owns must be resolved first: delete the ones nobody else is in,
    // and refuse while teammates would be left without an owner.
    const owned = await this.prisma.membership.findMany({
      where: { user_id: userId, role: OrgRole.OWNER },
      include: { organisation: { select: { id: true, name: true } } },
    });
    const soleOwned = [];
    for (const membership of owned) {
      const otherOwners = await this.prisma.membership.count({
        where: {
          organisation_id: membership.organisation_id,
          role: OrgRole.OWNER,
          user_id: { not: userId },
        },
      });
      if (otherOwners === 0) soleOwned.push(membership.organisation);
    }
    const blocking = [];
    for (const organisation of soleOwned) {
      const others = await this.prisma.membership.count({
        where: { organisation_id: organisation.id, user_id: { not: userId } },
      });
      if (others > 0) blocking.push(organisation.name);
    }
    if (blocking.length) {
      throw new BadRequestException({
        message: `Make someone else an owner (or delete the organisation) before deleting your account: ${blocking.join(', ')}`,
        code: 'OWNS_ORGANISATIONS',
      });
    }
    for (const organisation of soleOwned)
      await this.organisations.deleteWithData(organisation.id);

    const recordings = await this.prisma.call.findMany({
      where: { user_id: userId, recording_path: { not: null } },
      select: { recording_path: true },
    });
    await Promise.all(
      recordings.map((call) =>
        this.recordingStorage
          .remove(call.recording_path)
          .catch((error) =>
            this.logger.warn(`Recording cleanup failed: ${error?.message}`),
          ),
      ),
    );

    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  private sanitize<T extends { password?: string }>(user: T) {
    const { password, ...rest } = user;
    const translation = getTemplateTranslation(
      (user as { preferred_language?: string }).preferred_language,
    );
    return {
      ...rest,
      default_consent_line: translation?.consent_line ?? DEFAULT_CONSENT_LINE,
    };
  }
}
