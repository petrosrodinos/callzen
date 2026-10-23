import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CallKind } from 'generated/prisma';
import { DashboardQueryType } from './dto/dashboard-query.schema';
import {
  DashboardOverview,
  GroupStat,
  RecommendedPractice,
} from './interfaces/dashboard.interface';
import { average, round } from '@/shared/utils/math/math.utils';
import { PracticeSnapshot } from '@/modules/calls/interfaces/call-snapshots.interface';

interface CategoryScore {
  key: string;
  label: string;
  score: number | null;
}

interface Mistake {
  title: string;
  category_key: string;
}

interface SuggestedPractice {
  title: string;
  focus: string;
  scenario_description: string;
  lead_temperature: 'COLD' | 'WARM';
  difficulty: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(
    userId: string,
    query: DashboardQueryType,
  ): Promise<DashboardOverview> {
    const since = new Date(Date.now() - query.days * DAY_MS);

    const [calls, allCallDates] = await Promise.all([
      this.prisma.call.findMany({
        where: {
          user_id: userId,
          started_at: { gte: since },
          status: { not: 'IN_PROGRESS' },
        },
        orderBy: { started_at: 'asc' },
        select: {
          id: true,
          kind: true,
          title: true,
          started_at: true,
          duration_seconds: true,
          outcome: true,
          copilot_enabled: true,
          objective_achieved: true,
          practice_snapshot: true,
          analysis: {
            select: {
              overall_score: true,
              category_scores: true,
              mistakes: true,
              suggested_practice: true,
            },
          },
        },
      }),
      this.prisma.call.findMany({
        where: { user_id: userId },
        select: { started_at: true },
        orderBy: { started_at: 'desc' },
        take: 400,
      }),
    ]);

    const analyzed = calls.filter((call) => call.analysis);
    const live = calls.filter((call) => call.kind === CallKind.LIVE);
    const practice = calls.filter((call) => call.kind === CallKind.PRACTICE);
    const scoreOf = (list: typeof calls) => {
      const scores = list
        .map((c) => c.analysis?.overall_score)
        .filter((s): s is number => s != null);
      return scores.length ? Math.round(average(scores)) : null;
    };

    const categoryLabels = new Map<string, string>();
    const categoryScores = (list: typeof calls, key: string) =>
      list
        .map(
          (c) =>
            (c.analysis?.category_scores as unknown as CategoryScore[])?.find(
              (cs) => cs.key === key,
            )?.score,
        )
        .filter((s): s is number => s != null);

    for (const call of analyzed) {
      for (const cs of (call.analysis
        .category_scores as unknown as CategoryScore[]) ?? [])
        categoryLabels.set(cs.key, cs.label);
    }

    const recent = analyzed.slice(-10);
    const half = Math.floor(recent.length / 2);
    const previousHalf = recent.slice(0, half);
    const recentHalf = recent.slice(half);

    const categories = [...categoryLabels.entries()].map(([key, label]) => {
      const before = average(categoryScores(previousHalf, key));
      const after = average(categoryScores(recentHalf, key));
      const all = categoryScores(analyzed, key);
      return {
        key,
        label,
        average: all.length ? Math.round(average(all)) : null,
        live_average: categoryScores(live, key).length
          ? Math.round(average(categoryScores(live, key)))
          : null,
        practice_average: categoryScores(practice, key).length
          ? Math.round(average(categoryScores(practice, key)))
          : null,
        change_percent:
          half >= 2 && before > 0
            ? round(((after - before) / before) * 100)
            : null,
        series: analyzed
          .map((c) => ({
            date: c.started_at,
            score: categoryScores([c], key)[0],
          }))
          .filter((p) => p.score != null),
      };
    });

    const highlights = this.buildHighlights(
      categories,
      recent.length,
      scoreOf(previousHalf),
      scoreOf(recentHalf),
    );
    const recurringMistakes = this.recurringMistakes(analyzed, categoryLabels);

    return {
      period_days: query.days,
      totals: {
        calls: calls.length,
        live_calls: live.length,
        practice_sessions: practice.length,
        analyzed_calls: analyzed.length,
        average_score: scoreOf(calls),
        live_average_score: scoreOf(live),
        practice_average_score: scoreOf(practice),
        talk_minutes: round(
          calls.reduce((sum, c) => sum + c.duration_seconds, 0) / 60,
          1,
        ),
        meetings_booked: live.filter(
          (c) => c.outcome === 'MEETING_BOOKED' || c.outcome === 'DEAL_WON',
        ).length,
        practice_streak_days: this.streak(
          allCallDates.map((c) => c.started_at),
        ),
      },
      score_trend: analyzed.map((c) => ({
        call_id: c.id,
        date: c.started_at,
        score: c.analysis.overall_score,
        kind: c.kind,
        title: c.title,
      })),
      categories,
      recurring_mistakes: recurringMistakes,
      outcomes: this.groupOutcomes(live),
      highlights,
      recommended_practice: this.recommendedPractice(
        analyzed,
        recurringMistakes,
      ),
      practice_progress: {
        by_scenario: this.groupPractice(practice, (s) => s.scenario_type),
        by_difficulty: this.groupPractice(practice, (s) =>
          String(s.difficulty),
        ),
        by_temperature: this.groupPractice(practice, (s) => s.lead_temperature),
        with_copilot: this.groupPracticeBy(
          practice.filter((c) => c.copilot_enabled),
          'WITH_COPILOT',
        ),
        without_copilot: this.groupPracticeBy(
          practice.filter((c) => !c.copilot_enabled),
          'WITHOUT_COPILOT',
        ),
      },
    };
  }

  private buildHighlights(
    categories: { label: string; change_percent: number | null }[],
    windowSize: number,
    previousScore: number | null,
    recentScore: number | null,
  ): string[] {
    const highlights: string[] = [];
    const ranked = categories
      .filter((c) => c.change_percent != null)
      .sort((a, b) => b.change_percent - a.change_percent);
    const best = ranked[0];
    const worst = ranked.at(-1);

    if (best && best.change_percent >= 5) {
      highlights.push(
        `Your ${best.label.toLowerCase()} improved ${best.change_percent}% over the last ${windowSize} calls.`,
      );
    }
    if (worst && worst !== best && worst.change_percent <= -5) {
      highlights.push(
        `Your ${worst.label.toLowerCase()} dropped ${Math.abs(worst.change_percent)}% recently. Worth a focused practice session.`,
      );
    }
    if (
      previousScore != null &&
      recentScore != null &&
      recentScore !== previousScore
    ) {
      highlights.push(
        recentScore > previousScore
          ? `Your average score rose from ${previousScore} to ${recentScore}.`
          : `Your average score moved from ${previousScore} to ${recentScore}.`,
      );
    }
    return highlights;
  }

  private recurringMistakes(
    analyzed: {
      id: string;
      title: string | null;
      analysis: { mistakes: unknown };
    }[],
    labels: Map<string, string>,
  ) {
    const groups = new Map<
      string,
      {
        count: number;
        titles: Map<string, number>;
        calls: { call_id: string; title: string | null }[];
      }
    >();

    for (const call of analyzed.slice(-20)) {
      for (const mistake of (call.analysis.mistakes as Mistake[]) ?? []) {
        const group = groups.get(mistake.category_key) ?? {
          count: 0,
          titles: new Map(),
          calls: [],
        };
        group.count += 1;
        group.titles.set(
          mistake.title,
          (group.titles.get(mistake.title) ?? 0) + 1,
        );
        if (!group.calls.some((c) => c.call_id === call.id))
          group.calls.push({ call_id: call.id, title: call.title });
        groups.set(mistake.category_key, group);
      }
    }

    return [...groups.entries()]
      .map(([key, group]) => ({
        category_key: key,
        label: labels.get(key) ?? key,
        count: group.count,
        calls_affected: group.calls.length,
        common_titles: [...group.titles.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([title]) => title),
        calls: group.calls.slice(-3),
      }))
      .filter((m) => m.calls_affected >= 1)
      .sort((a, b) => b.calls_affected - a.calls_affected || b.count - a.count)
      .slice(0, 5);
  }

  private recommendedPractice(
    analyzed: {
      id: string;
      kind: CallKind;
      analysis: { suggested_practice: unknown };
    }[],
    recurring: {
      label: string;
      calls_affected: number;
      common_titles: string[];
    }[],
  ): RecommendedPractice[] {
    const fromRecurring: RecommendedPractice[] = recurring
      .filter((m) => m.calls_affected >= 2)
      .slice(0, 2)
      .map((m) => ({
        title: `Fix: ${m.label}`,
        focus: m.common_titles[0] ?? m.label,
        scenario_description: `A realistic prospect that tests the salesperson on ${m.label.toLowerCase()}, especially: ${m.common_titles.join('; ')}`,
        lead_temperature: 'COLD',
        difficulty: 3,
        source: 'RECURRING_MISTAKE',
        call_id: null,
      }));

    const latestLive = [...analyzed]
      .reverse()
      .find((c) => c.kind === CallKind.LIVE);
    const fromLatest: RecommendedPractice[] = (
      (latestLive?.analysis.suggested_practice as SuggestedPractice[]) ?? []
    )
      .slice(0, 2)
      .map((p) => ({ ...p, source: 'LATEST_CALL', call_id: latestLive.id }));

    return [...fromRecurring, ...fromLatest].slice(0, 4);
  }

  private groupOutcomes(live: { outcome: string | null }[]) {
    const withOutcome = live.filter((c) => c.outcome);
    const counts = new Map<string, number>();
    for (const call of withOutcome)
      counts.set(call.outcome, (counts.get(call.outcome) ?? 0) + 1);
    return [...counts.entries()].map(([outcome, count]) => ({
      outcome,
      count,
      rate: Math.round((count / withOutcome.length) * 100),
    }));
  }

  private groupPractice(
    practice: {
      practice_snapshot: unknown;
      objective_achieved: boolean | null;
      analysis: { overall_score: number } | null;
    }[],
    keyOf: (snapshot: PracticeSnapshot) => string,
  ): GroupStat[] {
    const groups = new Map<string, typeof practice>();
    for (const call of practice) {
      const snapshot = call.practice_snapshot as unknown as PracticeSnapshot;
      if (!snapshot) continue;
      const key = keyOf(snapshot);
      groups.set(key, [...(groups.get(key) ?? []), call]);
    }
    return [...groups.entries()]
      .map(([key, list]) => this.groupPracticeBy(list, key))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  private groupPracticeBy(
    list: {
      objective_achieved: boolean | null;
      analysis: { overall_score: number } | null;
    }[],
    key: string,
  ): GroupStat {
    const scores = list
      .map((c) => c.analysis?.overall_score)
      .filter((s): s is number => s != null);
    const judged = list.filter((c) => c.objective_achieved != null);
    return {
      key,
      sessions: list.length,
      average_score: scores.length ? Math.round(average(scores)) : null,
      best_score: scores.length ? Math.max(...scores) : null,
      objective_rate: judged.length
        ? Math.round(
            (judged.filter((c) => c.objective_achieved).length /
              judged.length) *
              100,
          )
        : null,
    };
  }

  private streak(dates: Date[]): number {
    const days = new Set(
      dates.map((d) => new Date(d).toISOString().slice(0, 10)),
    );
    let streak = 0;
    const cursor = new Date();
    if (!days.has(cursor.toISOString().slice(0, 10)))
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }
}
