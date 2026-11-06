import { Injectable } from '@nestjs/common';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { CoachingWindowQueryType } from '../dto/coaching-query.schema';
import { targetStatus } from '../utils/assignment-progress.utils';
import { CoachingMembersService } from './coaching-members.service';
import { CoachingStatsService, minutes } from './coaching-stats.service';
import { CommentsService } from './comments.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_CALLS = 20;

// One student's page for the coach (§10.1b). Reuses the dashboard computations with a userId filter; the
// analysis visibility rules apply the same way. Personal bought minutes are never shown.
@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly members: CoachingMembersService,
    private readonly stats: CoachingStatsService,
    private readonly comments: CommentsService,
  ) {}

  async findOne(ctx: OrgContext, userId: string, query: CoachingWindowQueryType) {
    const member = await this.members.getMember(ctx.organisationId, userId);
    const since = new Date(Date.now() - query.days * DAY_MS);

    const [overview, statsByUser, lastActivity, period, calls, targets, recentComments] =
      await Promise.all([
        this.dashboard.overview(ctx, { scope: 'me', days: query.days }, { userId }),
        this.stats.memberStats(ctx.organisationId, [userId], { from: since }),
        this.stats.lastActivity(ctx.organisationId, [userId]),
        this.stats.periodMinutes(ctx.organisationId),
        this.prisma.call.findMany({
          where: { organisation_id: ctx.organisationId, user_id: userId },
          orderBy: { started_at: 'desc' },
          take: RECENT_CALLS,
          select: {
            id: true,
            kind: true,
            call_type: true,
            status: true,
            title: true,
            prospect_name: true,
            started_at: true,
            duration_seconds: true,
            outcome: true,
            assignment_id: true,
            analysis: { select: { overall_score: true } },
          },
        }),
        this.prisma.assignmentTarget.findMany({
          where: {
            user_id: userId,
            assignment: { organisation_id: ctx.organisationId },
          },
          include: {
            assignment: {
              select: {
                id: true,
                title: true,
                due_at: true,
                archived_at: true,
                practice_agent_name: true,
                required_attempts: true,
                target_score: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        this.comments.recentForUser(ctx.organisationId, userId),
      ]);

    const stats = statsByUser.get(userId);
    const isCoach = member.is_coach;
    const liveCap = isCoach ? null : period.live.member_cap_minutes;
    const practiceCap = isCoach ? null : period.practice.member_cap_minutes;
    const now = new Date();

    return {
      member: {
        user_id: member.user_id,
        name: member.name,
        email: member.email,
        role: member.role,
        joined_at: member.joined_at,
        last_active_at: lastActivity.get(userId) ?? null,
        is_coach: isCoach,
      },
      kpis: {
        average_score: stats.average_score,
        score_change: stats.score_change,
        live_sessions: stats.live_sessions,
        practice_sessions: stats.practice_sessions,
        live_minutes_period: minutes(period.by_user.live[userId] ?? 0),
        practice_minutes_period: minutes(period.by_user.practice[userId] ?? 0),
        live_cap_minutes: liveCap,
        practice_cap_minutes: practiceCap,
        period: period.period,
      },
      overview,
      recent_calls: calls.map((call) => ({
        id: call.id,
        kind: call.kind,
        call_type: call.call_type,
        status: call.status,
        title: call.title ?? call.prospect_name,
        started_at: call.started_at,
        duration_seconds: call.duration_seconds,
        outcome: call.outcome,
        assignment_id: call.assignment_id,
        score: call.analysis?.overall_score ?? null,
      })),
      assignments: targets.map((target) => ({
        id: target.assignment.id,
        title: target.assignment.title,
        practice_agent_name: target.assignment.practice_agent_name,
        due_at: target.assignment.due_at,
        archived: !!target.assignment.archived_at,
        required_attempts: target.assignment.required_attempts,
        target_score: target.assignment.target_score,
        attempts_count: target.attempts_count,
        best_score: target.best_score,
        completed_at: target.completed_at,
        status: targetStatus(target, target.assignment.due_at, now),
      })),
      recent_comments: recentComments,
    };
  }
}
