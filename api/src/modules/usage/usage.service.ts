import { Injectable, Logger } from '@nestjs/common';
import {
  can,
  isPlatformAdmin,
  OrgContext,
} from '@/shared/interfaces/org-context.interface';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { CallKind, Prisma, UsageKind } from 'generated/prisma';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ModelPricingService } from '@/modules/pricing/services/model-pricing.service';
import { CostEstimate } from '@/modules/pricing/interfaces/pricing.interface';
import { applyMarkup } from '@/modules/pricing/utils/cost.utils';
import { UsageQueryType } from './dto/usage-query.schema';
import { UsageSession, UsageSummary } from './interfaces/usage.interface';
import { round } from '@/shared/utils/math/math.utils';

const RECENT_SESSIONS = 100;

interface KindCostRow {
  kind: UsageKind;
  _count: { _all: number };
  _sum: { cost_usd: number | null; charged_cost_usd: number | null };
}

export interface RecordUsageInput {
  organisationId: string;
  userId: string;
  callId?: string | null;
  kind: UsageKind;
  model?: string | null;
  // Token-billed calls (AiService results carry this shape as `usage`).
  tokens?: {
    inputTokens: number;
    cachedInputTokens?: number;
    outputTokens: number;
    reasoningTokens?: number;
  };
  // Duration-billed audio: input = audio sent to the model, output = audio it produced.
  audio?: { inputSeconds: number; outputSeconds?: number };
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: ModelPricingService,
    private readonly appConfig: AppConfigService,
  ) {}

  // Usage tracking must never break the feature that produced it. The price and markup in force now are
  // snapshotted on the event, so later price or markup changes never rewrite history.
  record(input: RecordUsageInput): void {
    let estimate: CostEstimate | null = null;
    let markupPercent = 0;
    try {
      estimate = this.estimate(input);
      markupPercent = this.appConfig.get('pricing.markup_percent');
    } catch (error) {
      this.logger.warn(`Failed to price usage: ${error?.message}`);
    }

    setImmediate(async () => {
      try {
        const base = estimate?.baseCostUsd ?? 0;
        await this.prisma.usageEvent.create({
          data: {
            organisation_id: input.organisationId,
            user_id: input.userId,
            call_id: input.callId ?? null,
            kind: input.kind,
            model: input.model ?? null,
            input_tokens: input.tokens?.inputTokens ?? 0,
            cached_input_tokens: input.tokens?.cachedInputTokens ?? 0,
            output_tokens: input.tokens?.outputTokens ?? 0,
            reasoning_tokens: input.tokens?.reasoningTokens ?? 0,
            audio_seconds: Math.round(
              (input.audio?.inputSeconds ?? 0) +
                (input.audio?.outputSeconds ?? 0),
            ),
            cost_usd: base,
            charged_cost_usd: applyMarkup(base, markupPercent),
            markup_percent: markupPercent,
            pricing_source: estimate?.source ?? null,
            unit_prices: (estimate?.unitPrices ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to record usage: ${error?.message}`);
      }
    });
  }

  async summary(ctx: OrgContext, query: UsageQueryType): Promise<UsageSummary> {
    // Organisation-wide numbers need usage.view; everyone else sees their own usage.
    const scope = {
      organisation_id: ctx.organisationId,
      ...(can(ctx, Permissions.USAGE_VIEW) ? {} : { user_id: ctx.userId }),
    };
    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);
    const eventWhere = { ...scope, created_at: { gte: since } };
    const callWhere = { ...scope, started_at: { gte: since } };
    const admin = isPlatformAdmin(ctx);

    const [byKindRows, minutesByKind, callsCount, sessions] = await Promise.all([
      this.groupByKind(eventWhere),
      this.prisma.call.groupBy({
        by: ['kind'],
        where: callWhere,
        _sum: { duration_seconds: true },
      }),
      this.prisma.call.count({ where: callWhere }),
      this.prisma.call.findMany({
        where: { ...callWhere, ended_at: { not: null } },
        orderBy: { started_at: 'desc' },
        take: RECENT_SESSIONS,
        select: {
          id: true,
          title: true,
          prospect_name: true,
          kind: true,
          call_type: true,
          started_at: true,
          duration_seconds: true,
          user: { select: { id: true, full_name: true, email: true } },
        },
      }),
    ]);

    const countOf = (kind: UsageKind) =>
      byKindRows.find((row) => row.kind === kind)?._count._all ?? 0;
    const secondsOf = (kind: CallKind) =>
      minutesByKind.find((row) => row.kind === kind)?._sum.duration_seconds ??
      0;

    const sessionItems: UsageSession[] = sessions.map((call) => ({
      id: call.id,
      title: call.title ?? call.prospect_name ?? null,
      kind: call.kind,
      call_type: call.call_type,
      started_at: call.started_at,
      duration_seconds: call.duration_seconds,
      owner: {
        id: call.user.id,
        name: call.user.full_name || call.user.email,
        is_you: call.user.id === ctx.userId,
      },
    }));

    const summary: UsageSummary = {
      period_days: query.days,
      live_minutes: round(secondsOf(CallKind.LIVE) / 60, 1),
      practice_minutes: round(secondsOf(CallKind.PRACTICE) / 60, 1),
      calls_count: callsCount,
      analyses_count: countOf(UsageKind.ANALYSIS),
      suggestions_count: countOf(UsageKind.SUGGESTION),
      average_session_minutes: sessionItems.length
        ? round(
            sessionItems.reduce((sum, s) => sum + s.duration_seconds, 0) /
              sessionItems.length /
              60,
            1,
          )
        : 0,
      sessions: sessionItems,
    };

    // Money amounts never leave the API for anyone but platform admins (§6.2a).
    if (!admin) return summary;
    return { ...summary, ...(await this.costBreakdown(eventWhere, byKindRows, sessionItems)) };
  }

  // Admin-only cost figures for an arbitrary event filter (also used by the admin subscriptions pages).
  async costBreakdown(
    eventWhere: Prisma.UsageEventWhereInput,
    byKindRows?: KindCostRow[],
    sessions: UsageSession[] = [],
  ) {
    const [kinds, byModelRows, perCall] = await Promise.all([
      byKindRows ? Promise.resolve(byKindRows) : this.groupByKind(eventWhere),
      this.prisma.usageEvent.groupBy({
        by: ['model'],
        where: { ...eventWhere, model: { not: null } },
        _count: { _all: true },
        _sum: {
          input_tokens: true,
          output_tokens: true,
          cost_usd: true,
          charged_cost_usd: true,
        },
      }),
      sessions.length
        ? this.prisma.usageEvent.groupBy({
            by: ['call_id'],
            where: { call_id: { in: sessions.map((s) => s.id) } },
            _sum: { cost_usd: true, charged_cost_usd: true },
          })
        : Promise.resolve([]),
    ]);

    const charged = kinds.reduce((sum, row) => sum + (row._sum.charged_cost_usd ?? 0), 0);
    const base = kinds.reduce((sum, row) => sum + (row._sum.cost_usd ?? 0), 0);
    const sessionCosts = perCall.map((row) => ({
      call_id: row.call_id,
      charged_usd: round(row._sum.charged_cost_usd ?? 0, 6),
      base_usd: round(row._sum.cost_usd ?? 0, 6),
    }));

    return {
      estimated_cost_usd: round(charged, 4),
      base_cost_usd: round(base, 4),
      by_kind: kinds.map((row) => ({
        kind: row.kind,
        count: row._count._all,
        cost_usd: round(row._sum.charged_cost_usd ?? 0, 4),
        base_cost_usd: round(row._sum.cost_usd ?? 0, 4),
      })),
      by_model: byModelRows.map((row) => ({
        model: row.model,
        count: row._count._all,
        input_tokens: row._sum.input_tokens ?? 0,
        output_tokens: row._sum.output_tokens ?? 0,
        cost_usd: round(row._sum.charged_cost_usd ?? 0, 4),
        base_cost_usd: round(row._sum.cost_usd ?? 0, 4),
      })),
      cost_per_session: {
        // Events without a call (e.g. co-pilot generation) count toward the totals only.
        average_usd: sessionCosts.length
          ? round(
              sessionCosts.reduce((sum, s) => sum + s.charged_usd, 0) /
                sessionCosts.length,
              6,
            )
          : 0,
        sessions: sessionCosts,
      },
    };
  }

  // Cost of one call, for the call detail page (platform admins only).
  async sessionCost(callId: string) {
    const totals = await this.prisma.usageEvent.aggregate({
      where: { call_id: callId },
      _sum: { cost_usd: true, charged_cost_usd: true },
    });
    return {
      charged_usd: round(totals._sum.charged_cost_usd ?? 0, 6),
      base_usd: round(totals._sum.cost_usd ?? 0, 6),
    };
  }

  private groupByKind(
    where: Prisma.UsageEventWhereInput,
  ): Promise<KindCostRow[]> {
    return this.prisma.usageEvent.groupBy({
      by: ['kind'],
      where,
      _count: { _all: true },
      _sum: { cost_usd: true, charged_cost_usd: true },
    }) as unknown as Promise<KindCostRow[]>;
  }

  private estimate(input: RecordUsageInput): CostEstimate | null {
    if (!input.model) return null;
    if (input.tokens)
      return this.pricing.estimateTokenCost({ model: input.model, ...input.tokens });
    if (input.audio)
      return this.pricing.estimateAudioCost({ model: input.model, ...input.audio });
    return null;
  }
}
