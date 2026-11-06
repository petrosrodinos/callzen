import { Injectable } from '@nestjs/common';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { AnalysisVisibilityService } from '@/modules/billing/services/analysis-visibility.service';
import { CoachingWindowQueryType } from '../dto/coaching-query.schema';
import { CoachingMembersService } from './coaching-members.service';
import { CoachingStatsService, minutes } from './coaching-stats.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const LEADERBOARD_SIZE = 10;

// The coach's cohort dashboard (§10.1): every student's progress, minutes against their caps, and who has
// stopped practising.
@Injectable()
export class CohortService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly members: CoachingMembersService,
    private readonly stats: CoachingStatsService,
    private readonly analysisVisibility: AnalysisVisibilityService,
  ) {}

  async overview(ctx: OrgContext, query: CoachingWindowQueryType) {
    const students = await this.members.students(ctx.organisationId);
    const userIds = students.map((s) => s.user_id);
    const inactiveDays = this.appConfig.get('coaching.inactive_days');
    const now = Date.now();
    const visible = await this.analysisVisibility.visibleFeaturesFor(ctx.organisationId);

    const [statsByUser, lastActivity, lastPractice, period] = await Promise.all([
      this.stats.memberStats(
        ctx.organisationId,
        userIds,
        { from: new Date(now - query.days * DAY_MS) },
        { withMistakes: visible.moments },
      ),
      this.stats.lastActivity(ctx.organisationId, userIds),
      this.stats.lastPractice(ctx.organisationId, userIds),
      this.stats.periodMinutes(ctx.organisationId),
    ]);

    const rows = students.map((student) => {
      const stats = statsByUser.get(student.user_id);
      const lastPracticeAt = lastPractice.get(student.user_id) ?? null;
      const liveUsed = minutes(period.by_user.live[student.user_id] ?? 0);
      const practiceUsed = minutes(period.by_user.practice[student.user_id] ?? 0);
      const liveCap = period.live.member_cap_minutes;
      const practiceCap = period.practice.member_cap_minutes;
      return {
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        role: student.role,
        joined_at: student.joined_at,
        sessions: stats.sessions,
        live_sessions: stats.live_sessions,
        practice_sessions: stats.practice_sessions,
        practice_minutes: minutes(stats.practice_seconds),
        average_score: stats.average_score,
        score_change: stats.score_change,
        score_trend: stats.scores.map((s) => ({ date: s.date, score: s.score })),
        last_activity_at: lastActivity.get(student.user_id) ?? null,
        last_practice_at: lastPracticeAt,
        inactive:
          !lastPracticeAt || now - lastPracticeAt.getTime() > inactiveDays * DAY_MS,
        minutes_this_period: {
          live_used: liveUsed,
          practice_used: practiceUsed,
          live_cap: liveCap,
          practice_cap: practiceCap,
          live_remaining: liveCap == null ? null : Math.max(0, liveCap - liveUsed),
          practice_remaining:
            practiceCap == null ? null : Math.max(0, practiceCap - practiceUsed),
        },
        // Only with the "moments" analysis visibility (§9).
        recurring_mistakes: visible.moments
          ? [...stats.mistakes.entries()]
              .map(([category_key, value]) => ({ category_key, ...value }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
          : null,
      };
    });

    return {
      window_days: query.days,
      inactive_days: inactiveDays,
      moments_locked: !visible.moments,
      period: period.period,
      pool: { shared: period.shared_pool, live: period.live, practice: period.practice },
      students: rows,
      leaderboard: {
        by_average_score: rows
          .filter((r) => r.average_score != null)
          .sort((a, b) => b.average_score - a.average_score)
          .slice(0, LEADERBOARD_SIZE)
          .map((r) => ({ user_id: r.user_id, name: r.name, value: r.average_score })),
        by_practice_minutes: rows
          .filter((r) => r.practice_minutes > 0)
          .sort((a, b) => b.practice_minutes - a.practice_minutes)
          .slice(0, LEADERBOARD_SIZE)
          .map((r) => ({ user_id: r.user_id, name: r.name, value: r.practice_minutes })),
      },
      inactive_user_ids: rows.filter((r) => r.inactive).map((r) => r.user_id),
    };
  }
}
