import { Injectable } from '@nestjs/common';
import { CallKind } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { EntitlementsService } from '@/modules/billing/services/entitlements.service';
import { average, round } from '@/shared/utils/math/math.utils';

export interface MemberStats {
  sessions: number;
  live_sessions: number;
  practice_sessions: number;
  live_seconds: number;
  practice_seconds: number;
  average_score: number | null;
  // Recent scores minus earlier scores within the window (null with too few calls).
  score_change: number | null;
  scores: { call_id: string; date: Date; score: number; kind: CallKind }[];
  last_practice_at: Date | null;
  mistakes: Map<string, { label: string; count: number }>;
}

interface CategoryScore {
  key: string;
  label: string;
}
interface Mistake {
  category_key?: string;
}

const emptyStats = (): MemberStats => ({
  sessions: 0,
  live_sessions: 0,
  practice_sessions: 0,
  live_seconds: 0,
  practice_seconds: 0,
  average_score: null,
  score_change: null,
  scores: [],
  last_practice_at: null,
  mistakes: new Map(),
});

export const minutes = (seconds: number) => round(seconds / 60, 1);

// Per-member numbers computed straight from calls and stored analyses: no AI cost (§10.1a).
@Injectable()
export class CoachingStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async memberStats(
    organisationId: string,
    userIds: string[],
    window: { from: Date; to?: Date },
    options: { withMistakes?: boolean } = {},
  ): Promise<Map<string, MemberStats>> {
    const result = new Map(userIds.map((id) => [id, emptyStats()]));
    if (!userIds.length) return result;
    const calls = await this.prisma.call.findMany({
      where: {
        organisation_id: organisationId,
        user_id: { in: userIds },
        started_at: { gte: window.from, ...(window.to && { lt: window.to }) },
        status: { not: 'IN_PROGRESS' },
      },
      orderBy: { started_at: 'asc' },
      select: {
        id: true,
        user_id: true,
        kind: true,
        started_at: true,
        duration_seconds: true,
        analysis: {
          select: {
            overall_score: true,
            ...(options.withMistakes && { mistakes: true, category_scores: true }),
          },
        },
      },
    });

    for (const call of calls) {
      const stats = result.get(call.user_id);
      if (!stats) continue;
      stats.sessions += 1;
      if (call.kind === CallKind.LIVE) {
        stats.live_sessions += 1;
        stats.live_seconds += call.duration_seconds;
      } else {
        stats.practice_sessions += 1;
        stats.practice_seconds += call.duration_seconds;
        stats.last_practice_at = call.started_at;
      }
      const analysis = call.analysis as
        | { overall_score: number; mistakes?: unknown; category_scores?: unknown }
        | null;
      if (analysis?.overall_score != null)
        stats.scores.push({
          call_id: call.id,
          date: call.started_at,
          score: analysis.overall_score,
          kind: call.kind,
        });
      if (options.withMistakes && analysis) {
        const labels = new Map(
          ((analysis.category_scores as CategoryScore[]) ?? []).map((c) => [c.key, c.label]),
        );
        for (const mistake of (analysis.mistakes as Mistake[]) ?? []) {
          const key = mistake.category_key ?? 'other';
          const entry = stats.mistakes.get(key) ?? { label: labels.get(key) ?? key, count: 0 };
          entry.count += 1;
          stats.mistakes.set(key, entry);
        }
      }
    }

    for (const stats of result.values()) {
      const scores = stats.scores.map((s) => s.score);
      stats.average_score = scores.length ? Math.round(average(scores)) : null;
      const recent = scores.slice(-10);
      const half = Math.floor(recent.length / 2);
      stats.score_change =
        half >= 2
          ? Math.round(average(recent.slice(half)) - average(recent.slice(0, half)))
          : null;
    }
    return result;
  }

  // Most recent call of each member, all time.
  async lastActivity(organisationId: string, userIds: string[]) {
    if (!userIds.length) return new Map<string, Date>();
    const rows = await this.prisma.call.groupBy({
      by: ['user_id'],
      where: { organisation_id: organisationId, user_id: { in: userIds } },
      _max: { started_at: true },
    });
    return new Map(rows.map((row) => [row.user_id, row._max.started_at]));
  }

  async lastPractice(organisationId: string, userIds: string[]) {
    if (!userIds.length) return new Map<string, Date>();
    const rows = await this.prisma.call.groupBy({
      by: ['user_id'],
      where: {
        organisation_id: organisationId,
        user_id: { in: userIds },
        kind: CallKind.PRACTICE,
      },
      _max: { started_at: true },
    });
    return new Map(rows.map((row) => [row.user_id, row._max.started_at]));
  }

  // Plan minutes this period (pool, owner reserve and per-member use). Personal bought minutes are never
  // part of these numbers (§10.1b).
  async periodMinutes(organisationId: string) {
    const [entitlements, consumption] = await Promise.all([
      this.entitlements.getEntitlements(organisationId),
      this.entitlements.getConsumption(organisationId),
    ]);
    const { limits } = entitlements;
    const pool = (kind: 'live' | 'practice') => {
      const shared = limits.practice_shares_live_pool;
      const isLive = shared || kind === 'live';
      const usage = shared
        ? {
            owners: consumption.live.owners_seconds + consumption.practice.owners_seconds,
            others: consumption.live.others_seconds + consumption.practice.others_seconds,
            team: consumption.live.team_credit_seconds + consumption.practice.team_credit_seconds,
          }
        : {
            owners: consumption[kind].owners_seconds,
            others: consumption[kind].others_seconds,
            team: consumption[kind].team_credit_seconds,
          };
      const allowance = isLive ? limits.live_minutes_per_period : limits.practice_minutes_per_period;
      const reserve = isLive
        ? limits.live_minutes_reserved_for_owner_per_period
        : limits.practice_minutes_reserved_for_owner_per_period;
      const teamLeft = isLive
        ? entitlements.team_credits.live_seconds
        : entitlements.team_credits.practice_seconds;
      const usedSeconds = usage.owners + usage.others;
      const includedSeconds =
        allowance == null ? null : allowance * 60 + usage.team + teamLeft;
      return {
        included_minutes: includedSeconds == null ? null : minutes(includedSeconds),
        used_minutes: minutes(usedSeconds),
        remaining_minutes:
          includedSeconds == null ? null : minutes(Math.max(0, includedSeconds - usedSeconds)),
        owner_reserve_minutes: reserve || null,
        owner_reserve_left_minutes: reserve
          ? minutes(Math.max(0, reserve * 60 - usage.owners))
          : null,
        team_credit_minutes: minutes(teamLeft),
        member_cap_minutes: isLive
          ? limits.live_minutes_per_member_per_period
          : limits.practice_minutes_per_member_per_period,
      };
    };
    return {
      period: entitlements.period,
      shared_pool: limits.practice_shares_live_pool,
      live: pool('live'),
      practice: pool('practice'),
      by_user: {
        live: consumption.live.by_user,
        practice: consumption.practice.by_user,
      },
    };
  }
}
