import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { SlidingWindowLimiter } from '@/shared/utils/rate-limit/sliding-window-limiter';
import { CallsExportQueryType } from '../dto/coaching-query.schema';
import { CSV_BOM, toCsvRow } from '../utils/csv.utils';
import { targetStatus } from '../utils/assignment-progress.utils';
import { CoachingMembersService } from './coaching-members.service';
import { CoachingStatsService, minutes } from './coaching-stats.service';

const MAX_ROWS = 50_000;
const BATCH = 1000;
const ALL_TIME = new Date(0);

// CSV exports for coaches (§10.1g): no AI costs or money amounts, no transcripts, no personal balances.
@Injectable()
export class CoachingExportService {
  private readonly limiter = new SlidingWindowLimiter(10, 60 * 60 * 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly members: CoachingMembersService,
    private readonly stats: CoachingStatsService,
  ) {}

  async students(ctx: OrgContext): Promise<Readable> {
    this.limiter.assert(ctx.userId, 'Too many exports. Try again later.');
    const students = (await this.members.students(ctx.organisationId)).slice(0, MAX_ROWS);
    const userIds = students.map((s) => s.user_id);
    const [allTime, lastActivity, period, targets] = await Promise.all([
      this.stats.memberStats(ctx.organisationId, userIds, { from: ALL_TIME }),
      this.stats.lastActivity(ctx.organisationId, userIds),
      this.stats.periodMinutes(ctx.organisationId),
      this.prisma.assignmentTarget.findMany({
        where: {
          user_id: { in: userIds },
          assignment: { organisation_id: ctx.organisationId, archived_at: null },
        },
        select: {
          user_id: true,
          completed_at: true,
          assignment: { select: { due_at: true } },
        },
      }),
    ]);
    const now = new Date();

    function* rows() {
      yield CSV_BOM +
        toCsvRow([
          'Name',
          'Email',
          'Role',
          'Joined',
          'Last active',
          'Live sessions',
          'Practice sessions',
          'Live minutes this period',
          'Practice minutes this period',
          'Average score',
          'Assignments completed',
          'Assignments overdue',
        ]);
      for (const student of students) {
        const stats = allTime.get(student.user_id);
        const mine = targets.filter((t) => t.user_id === student.user_id);
        yield toCsvRow([
          student.name,
          student.email,
          student.role,
          student.joined_at,
          lastActivity.get(student.user_id) ?? null,
          stats.live_sessions,
          stats.practice_sessions,
          minutes(period.by_user.live[student.user_id] ?? 0),
          minutes(period.by_user.practice[student.user_id] ?? 0),
          stats.average_score,
          mine.filter((t) => t.completed_at).length,
          mine.filter((t) => targetStatus(t, t.assignment.due_at, now) === 'overdue').length,
        ]);
      }
    }
    return Readable.from(rows());
  }

  // Streamed from the database in batches so a large export never loads into memory.
  calls(ctx: OrgContext, query: CallsExportQueryType): Readable {
    this.limiter.assert(ctx.userId, 'Too many exports. Try again later.');
    if (query.from && query.to && new Date(query.from) > new Date(query.to))
      throw new BadRequestException('"from" must be before "to"');
    const where: Prisma.CallWhereInput = {
      organisation_id: ctx.organisationId,
      ...(query.user_id && { user_id: query.user_id }),
      ...((query.from || query.to) && {
        started_at: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };
    const prisma = this.prisma;

    async function* rows() {
      yield CSV_BOM +
        toCsvRow([
          'Date',
          'Student',
          'Email',
          'Kind',
          'Type',
          'Outcome',
          'Duration (minutes)',
          'Overall score',
        ]);
      let cursor: string | undefined;
      let written = 0;
      while (written < MAX_ROWS) {
        const batch = await prisma.call.findMany({
          where,
          orderBy: [{ started_at: 'desc' }, { id: 'desc' }],
          take: Math.min(BATCH, MAX_ROWS - written),
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          select: {
            id: true,
            started_at: true,
            kind: true,
            call_type: true,
            outcome: true,
            custom_outcome: true,
            duration_seconds: true,
            user: { select: { full_name: true, email: true } },
            analysis: { select: { overall_score: true } },
          },
        });
        if (!batch.length) break;
        for (const call of batch)
          yield toCsvRow([
            call.started_at,
            call.user.full_name || call.user.email,
            call.user.email,
            call.kind,
            call.call_type,
            call.outcome === 'CUSTOM' ? call.custom_outcome : call.outcome,
            minutes(call.duration_seconds),
            call.analysis?.overall_score ?? null,
          ]);
        written += batch.length;
        cursor = batch.at(-1).id;
        if (batch.length < BATCH) break;
      }
    }
    return Readable.from(rows());
  }
}
