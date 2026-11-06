import { Injectable } from '@nestjs/common';
import { PricingSource } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ModelPricingService } from './model-pricing.service';
import { PricingSyncStatus, ResolvedPrice } from '../interfaces/pricing.interface';

// The admin page warns once the snapshot is older than this (§14).
const STALE_AFTER_HOURS = 48;
const UNPRICED_LOOKBACK_DAYS = 30;

export interface PricingOverview {
  markup_percent: number;
  prices: ResolvedPrice[];
  unpriced_models: { model_id: string; events: number; last_seen_at: Date | null }[];
  sync: PricingSyncStatus;
  last_fetched_at: Date | null;
  snapshot_is_old: boolean;
}

@Injectable()
export class PricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly pricing: ModelPricingService,
  ) {}

  async overview(): Promise<PricingOverview> {
    const prices = this.pricing.listResolved();
    const since = new Date(Date.now() - UNPRICED_LOOKBACK_DAYS * 86_400_000);
    // Models that were actually used without a price, plus tracked models that have none.
    const recent = await this.prisma.usageEvent.groupBy({
      by: ['model'],
      where: {
        pricing_source: PricingSource.UNPRICED,
        created_at: { gte: since },
        model: { not: null },
      },
      _count: { _all: true },
      _max: { created_at: true },
    });
    const unpriced = new Map<string, { events: number; last_seen_at: Date | null }>();
    for (const id of this.pricing.unpricedModels())
      unpriced.set(id, { events: 0, last_seen_at: null });
    for (const row of recent) {
      // Already fixed by a sync or an override since.
      if (this.pricing.resolvePrice(row.model).source !== PricingSource.UNPRICED) continue;
      unpriced.set(row.model, {
        events: row._count._all,
        last_seen_at: row._max.created_at,
      });
    }

    const lastFetchedAt = prices.reduce<Date | null>(
      (latest, price) =>
        price.fetched_at && (!latest || price.fetched_at > latest)
          ? price.fetched_at
          : latest,
      null,
    );

    return {
      markup_percent: this.appConfig.get('pricing.markup_percent'),
      prices,
      unpriced_models: [...unpriced.entries()].map(([model_id, value]) => ({
        model_id,
        ...value,
      })),
      sync: this.pricing.getStatus(),
      last_fetched_at: lastFetchedAt,
      snapshot_is_old:
        !lastFetchedAt ||
        Date.now() - lastFetchedAt.getTime() > STALE_AFTER_HOURS * 3_600_000,
    };
  }

  async syncNow(): Promise<PricingOverview> {
    await this.pricing.sync(true);
    return this.overview();
  }
}
