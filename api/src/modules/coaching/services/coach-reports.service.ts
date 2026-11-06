import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { EntitlementsService } from '@/modules/billing/services/entitlements.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { ReportsQueryType } from '../dto/coaching-query.schema';
import { CoachingMembersService } from './coaching-members.service';
import { CoachingStatsService, minutes } from './coaching-stats.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const TOP = 3;

// The previous full week, ending at 00:00 UTC on the day the report runs.
export const reportWeek = (now: Date) => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { start: new Date(end.getTime() - WEEK_MS), end };
};

// Weekly coach report, inside the app only (§10.1e). Computed from the database (no AI cost); `data` holds
// numbers and ids, and the app turns them into sentences in the reader's language.
@Injectable()
export class CoachReportsService {
  private readonly logger = new Logger(CoachReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly members: CoachingMembersService,
    private readonly stats: CoachingStatsService,
  ) {}

  async list(ctx: OrgContext, query: ReportsQueryType) {
    const where = { organisation_id: ctx.organisationId };
    const [rows, total] = await Promise.all([
      this.prisma.coachDigest.findMany({
        where,
        orderBy: { period_start: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.coachDigest.count({ where }),
    ]);
    const totalPages = Math.ceil(total / query.limit);
    return {
      data: rows.map((row) => {
        const data = row.data as { empty?: boolean; totals?: Record<string, number> };
        return {
          id: row.id,
          period_start: row.period_start,
          period_end: row.period_end,
          created_at: row.created_at,
          empty: data.empty ?? false,
          totals: data.totals ?? null,
        };
      }),
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

  async findOne(ctx: OrgContext, id: string) {
    const row = await this.prisma.coachDigest.findFirst({
      where: { id, organisation_id: ctx.organisationId },
    });
    if (!row) throw new NotFoundException('Report not found');
    const data = row.data as { user_ids?: string[]; assignment_ids?: string[] };
    const [users, assignments] = await Promise.all([
      this.members.names(data.user_ids ?? []),
      this.prisma.practiceAssignment.findMany({
        where: { id: { in: data.assignment_ids ?? [] } },
        select: { id: true, title: true },
      }),
    ]);
    return {
      id: row.id,
      period_start: row.period_start,
      period_end: row.period_end,
      created_at: row.created_at,
      data: row.data,
      // Names for the ids in `data`; people who left are still named.
      users,
      assignments: Object.fromEntries(assignments.map((a) => [a.id, a.title])),
    };
  }

  // Hourly tick: generates reports when the configured weekday/hour (UTC) comes round.
  async runIfDue(now: Date = new Date()) {
    const config = this.appConfig.get('coaching.digest');
    if (!config.enabled) return 0;
    if (now.getUTCDay() !== config.weekday || now.getUTCHours() !== config.hour_utc) return 0;
    return this.generateAll(now);
  }

  async generateAll(now: Date = new Date()) {
    const week = reportWeek(now);
    const subscriptions = await this.prisma.subscription.findMany({
      select: { organisation_id: true },
    });
    let created = 0;
    for (const { organisation_id } of subscriptions) {
      try {
        const entitlements = await this.entitlements.getEntitlements(organisation_id);
        if (!entitlements.features[PlanFeatures.COACH_REPORTS] || entitlements.read_only) continue;
        if (await this.generateForOrganisation(organisation_id, week)) created += 1;
      } catch (error) {
        this.logger.warn(`Coach report for ${organisation_id} failed: ${error?.message}`);
      }
    }
    return created;
  }

  // Idempotent: the unique (organisation_id, period_start) makes a second run a no-op.
  async generateForOrganisation(
    organisationId: string,
    week: { start: Date; end: Date },
  ): Promise<boolean> {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { created_at: true },
    });
    // The first report appears after the organisation's first full week.
    if (!organisation || organisation.created_at > week.start) return false;
    const existing = await this.prisma.coachDigest.findUnique({
      where: { organisation_id_period_start: { organisation_id: organisationId, period_start: week.start } },
    });
    if (existing) return false;

    const data = await this.buildData(organisationId, week);
    try {
      const digest = await this.prisma.coachDigest.create({
        data: {
          organisation_id: organisationId,
          period_start: week.start,
          period_end: week.end,
          data: data as unknown as Prisma.InputJsonValue,
        },
      });
      this.notifications.notify({
        organisationId,
        userIds: await this.members.coachIds(organisationId),
        type: NotificationType.COACH_REPORT,
        params: { report_id: digest.id, period_start: week.start.toISOString() },
      });
      return true;
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') return false;
      throw error;
    }
  }

  private async buildData(organisationId: string, week: { start: Date; end: Date }) {
    const config = this.appConfig.get('coaching.digest');
    const inactiveDays = this.appConfig.get('coaching.inactive_days');
    const students = await this.members.students(organisationId);
    const userIds = students.map((s) => s.user_id);
    const previous = { from: new Date(week.start.getTime() - WEEK_MS), to: week.start };
    const now = new Date();

    const [thisWeek, lastWeek, lastPractice, period, completedTargets, openTargets] =
      await Promise.all([
        this.stats.memberStats(organisationId, userIds, { from: week.start, to: week.end }),
        this.stats.memberStats(organisationId, userIds, previous),
        this.stats.lastPractice(organisationId, userIds),
        this.stats.periodMinutes(organisationId),
        this.prisma.assignmentTarget.findMany({
          where: {
            assignment: { organisation_id: organisationId },
            completed_at: { gte: week.start, lt: week.end },
          },
          select: { assignment_id: true, user_id: true },
        }),
        // Removed students' open assignments stop counting (§14).
        this.prisma.assignmentTarget.findMany({
          where: {
            assignment: { organisation_id: organisationId, archived_at: null },
            completed_at: null,
            user_id: { in: userIds },
          },
          select: {
            assignment_id: true,
            user_id: true,
            assignment: { select: { due_at: true } },
          },
        }),
      ]);

    const rows = students.map((student) => {
      const current = thisWeek.get(student.user_id);
      const before = lastWeek.get(student.user_id);
      return {
        user_id: student.user_id,
        sessions: current.sessions,
        sessions_prev: before.sessions,
        practice_minutes: minutes(current.practice_seconds),
        practice_minutes_prev: minutes(before.practice_seconds),
        live_minutes: minutes(current.live_seconds),
        average_score: current.average_score,
        average_score_prev: before.average_score,
      };
    });

    const sum = (key: keyof (typeof rows)[number]) =>
      rows.reduce((total, row) => total + ((row[key] as number) ?? 0), 0);
    const improved = rows
      .filter(
        (r) =>
          r.average_score != null &&
          r.average_score_prev != null &&
          r.average_score - r.average_score_prev >= config.improved_threshold,
      )
      .map((r) => ({ user_id: r.user_id, from: r.average_score_prev, to: r.average_score }));
    const needsAttention = rows.flatMap((r) => {
      const last = lastPractice.get(r.user_id) ?? null;
      const inactive = !last || week.end.getTime() - last.getTime() > inactiveDays * DAY_MS;
      const dropped =
        r.average_score != null &&
        r.average_score_prev != null &&
        r.average_score_prev - r.average_score >= config.improved_threshold;
      if (dropped)
        return [{ user_id: r.user_id, reason: 'SCORE_DROP', from: r.average_score_prev, to: r.average_score, last_practice_at: last }];
      if (inactive)
        return [{ user_id: r.user_id, reason: 'INACTIVE', from: null, to: null, last_practice_at: last }];
      return [];
    });

    const overdue = openTargets.filter((t) => t.assignment.due_at && t.assignment.due_at < now);
    const dueSoon = openTargets.filter(
      (t) =>
        t.assignment.due_at &&
        t.assignment.due_at >= now &&
        t.assignment.due_at.getTime() <= now.getTime() + WEEK_MS,
    );
    const dueSoonByAssignment = new Map<string, { due_at: Date; open_targets: number }>();
    for (const target of dueSoon) {
      const entry = dueSoonByAssignment.get(target.assignment_id) ?? {
        due_at: target.assignment.due_at,
        open_targets: 0,
      };
      entry.open_targets += 1;
      dueSoonByAssignment.set(target.assignment_id, entry);
    }

    const totals = {
      students: rows.length,
      active_students: rows.filter((r) => r.sessions > 0).length,
      sessions: sum('sessions'),
      sessions_prev: sum('sessions_prev'),
      practice_minutes: Math.round(sum('practice_minutes') * 10) / 10,
      practice_minutes_prev: Math.round(sum('practice_minutes_prev') * 10) / 10,
      live_minutes: Math.round(sum('live_minutes') * 10) / 10,
    };
    const userIdsInData = new Set([
      ...rows.map((r) => r.user_id),
      ...completedTargets.map((t) => t.user_id),
    ]);
    const assignmentIds = new Set([
      ...completedTargets.map((t) => t.assignment_id),
      ...overdue.map((t) => t.assignment_id),
      ...dueSoonByAssignment.keys(),
    ]);

    return {
      // An empty week still has a report that says so (§10.1e).
      empty: totals.sessions === 0,
      totals,
      students: rows,
      improved,
      needs_attention: needsAttention,
      assignments: {
        completed_count: completedTargets.length,
        completed: completedTargets,
        overdue_count: overdue.length,
        overdue: overdue.map((t) => ({ assignment_id: t.assignment_id, user_id: t.user_id })),
        due_next_7_days: [...dueSoonByAssignment.entries()].map(([assignment_id, v]) => ({
          assignment_id,
          due_at: v.due_at,
          open_targets: v.open_targets,
        })),
      },
      top_by_score: rows
        .filter((r) => r.average_score != null)
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, TOP)
        .map((r) => ({ user_id: r.user_id, value: r.average_score })),
      top_by_practice_minutes: rows
        .filter((r) => r.practice_minutes > 0)
        .sort((a, b) => b.practice_minutes - a.practice_minutes)
        .slice(0, TOP)
        .map((r) => ({ user_id: r.user_id, value: r.practice_minutes })),
      pool: { live: period.live, practice: period.practice },
      improved_threshold: config.improved_threshold,
      inactive_days: inactiveDays,
      user_ids: [...userIdsInData],
      assignment_ids: [...assignmentIds],
    };
  }
}
