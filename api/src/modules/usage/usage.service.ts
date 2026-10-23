import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { UsageKind } from 'generated/prisma';
import { UsageQueryType } from './dto/usage-query.schema';
import { UsageSummary } from './interfaces/usage.interface';
import { round } from '@/shared/utils/math/math.utils';

export interface RecordUsageInput {
  userId: string;
  callId?: string | null;
  kind: UsageKind;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  costUsd?: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Usage tracking must never break the feature that produced it.
  record(input: RecordUsageInput): void {
    setImmediate(async () => {
      try {
        await this.prisma.usageEvent.create({
          data: {
            user_id: input.userId,
            call_id: input.callId ?? null,
            kind: input.kind,
            model: input.model ?? null,
            input_tokens: input.inputTokens ?? 0,
            output_tokens: input.outputTokens ?? 0,
            audio_seconds: Math.round(input.audioSeconds ?? 0),
            cost_usd: input.costUsd ?? 0,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to record usage: ${error?.message}`);
      }
    });
  }

  async summary(userId: string, query: UsageQueryType): Promise<UsageSummary> {
    const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000);

    const [events, calls] = await Promise.all([
      this.prisma.usageEvent.findMany({
        where: { user_id: userId, created_at: { gte: since } },
      }),
      this.prisma.call.findMany({
        where: { user_id: userId, started_at: { gte: since } },
        select: { kind: true, duration_seconds: true },
      }),
    ]);

    const byKind = new Map<UsageKind, { count: number; cost_usd: number }>();
    const byModel = new Map<
      string,
      {
        count: number;
        input_tokens: number;
        output_tokens: number;
        cost_usd: number;
      }
    >();

    for (const event of events) {
      const kindEntry = byKind.get(event.kind) ?? { count: 0, cost_usd: 0 };
      kindEntry.count += 1;
      kindEntry.cost_usd += event.cost_usd;
      byKind.set(event.kind, kindEntry);

      if (event.model) {
        const modelEntry = byModel.get(event.model) ?? {
          count: 0,
          input_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
        };
        modelEntry.count += 1;
        modelEntry.input_tokens += event.input_tokens;
        modelEntry.output_tokens += event.output_tokens;
        modelEntry.cost_usd += event.cost_usd;
        byModel.set(event.model, modelEntry);
      }
    }

    const liveSeconds = calls
      .filter((c) => c.kind === 'LIVE')
      .reduce((sum, c) => sum + c.duration_seconds, 0);
    const practiceSeconds = calls
      .filter((c) => c.kind === 'PRACTICE')
      .reduce((sum, c) => sum + c.duration_seconds, 0);

    return {
      period_days: query.days,
      live_minutes: round(liveSeconds / 60, 1),
      practice_minutes: round(practiceSeconds / 60, 1),
      calls_count: calls.length,
      analyses_count: byKind.get(UsageKind.ANALYSIS)?.count ?? 0,
      suggestions_count: byKind.get(UsageKind.SUGGESTION)?.count ?? 0,
      estimated_cost_usd: round(
        events.reduce((sum, e) => sum + e.cost_usd, 0),
        4,
      ),
      by_kind: [...byKind.entries()].map(([kind, value]) => ({
        kind,
        count: value.count,
        cost_usd: round(value.cost_usd, 4),
      })),
      by_model: [...byModel.entries()].map(([model, value]) => ({
        model,
        ...value,
        cost_usd: round(value.cost_usd, 4),
      })),
    };
  }
}
