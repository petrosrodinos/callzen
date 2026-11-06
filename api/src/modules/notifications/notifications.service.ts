import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationsQueryType } from './dto/notifications-query.schema';

export interface NotifyInput {
  organisationId: string;
  userIds: string[];
  type: NotificationType;
  // Ids and numbers only: the app renders the text with i18n keys in the reader's language (§10.1f).
  params?: Record<string, unknown>;
  // Same key for the same person = one notification (later calls update its params and mark it unread).
  // Used to group, e.g. one ASSIGNMENT_COMPLETED per assignment per day.
  dedupeKey?: string | null;
}

// In-app notifications (bell). No display text is stored; delivery is by polling (§10.1f).
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Never breaks the feature that triggers it.
  notify(input: NotifyInput): void {
    setImmediate(async () => {
      try {
        await this.create(input);
      } catch (error) {
        this.logger.warn(`Notification ${input.type} failed: ${error?.message}`);
      }
    });
  }

  async create(input: NotifyInput) {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    const params = (input.params ?? {}) as Prisma.InputJsonValue;
    for (const userId of userIds) {
      if (!input.dedupeKey) {
        await this.prisma.notification.create({
          data: {
            organisation_id: input.organisationId,
            user_id: userId,
            type: input.type,
            params,
          },
        });
        continue;
      }
      await this.prisma.notification.upsert({
        where: { user_id_dedupe_key: { user_id: userId, dedupe_key: input.dedupeKey } },
        create: {
          organisation_id: input.organisationId,
          user_id: userId,
          type: input.type,
          params,
          dedupe_key: input.dedupeKey,
        },
        update: { params, read_at: null, created_at: new Date() },
      });
    }
  }

  async list(userId: string, organisationId: string, query: NotificationsQueryType) {
    const where: Prisma.NotificationWhereInput = {
      user_id: userId,
      organisation_id: organisationId,
      ...(query.unread && { read_at: null }),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    const totalPages = Math.ceil(total / query.limit);
    return {
      data: items,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: totalPages,
        has_next: query.page < totalPages,
        has_prev: query.page > 1,
      },
    };
  }

  // Unread count in the active organisation, plus whether another organisation has unread items.
  async unreadCount(userId: string, organisationId: string) {
    const grouped = await this.prisma.notification.groupBy({
      by: ['organisation_id'],
      where: { user_id: userId, read_at: null },
      _count: { _all: true },
    });
    const active = grouped.find((row) => row.organisation_id === organisationId);
    return {
      count: active?._count._all ?? 0,
      other_organisations: grouped
        .filter((row) => row.organisation_id !== organisationId)
        .map((row) => ({
          organisation_id: row.organisation_id,
          count: row._count._all,
        })),
    };
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { read_at: new Date() },
    });
    if (!updated.count) throw new NotFoundException('Notification not found');
    return { id, read: true };
  }

  async markAllRead(userId: string, organisationId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { user_id: userId, organisation_id: organisationId, read_at: null },
      data: { read_at: new Date() },
    });
    return { updated: updated.count };
  }
}
