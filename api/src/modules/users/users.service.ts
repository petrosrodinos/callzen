import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RecordingStorageService } from '@/integrations/storage/recordings/recording-storage.service';
import { DeleteAccountDto, UpdateUserDto } from './dto/update-user.dto';
import { DEFAULT_CONSENT_LINE } from '@/shared/config/templates/analysis-criteria.config';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recordingStorage: RecordingStorageService,
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
    return { ...rest, default_consent_line: DEFAULT_CONSENT_LINE };
  }
}
