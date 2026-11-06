import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PricingSource } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { ModelsDevService } from '@/integrations/models-dev/services/models-dev.service';
import {
  ALL_PRICED_MODEL_IDS,
  findAiModel,
} from '@/shared/config/ai-models/ai-models.config';
import {
  AudioUsageInput,
  CostEstimate,
  PricingSyncStatus,
  ResolvedPrice,
  TokenUsageInput,
  UnitPrices,
} from '../interfaces/pricing.interface';
import {
  CachedPriceRow,
  pickRuntimePrice,
  resolveFromCatalog,
  toUnitPrices,
} from '../utils/price-resolver.utils';
import { computeAudioCost, computeTokenCost } from '../utils/cost.utils';

interface CachedModel extends CachedPriceRow {
  is_reasoning: boolean | null;
  fetched_at: Date;
  stale: boolean;
}

// Single source of AI prices. Synced from models.dev into the model_prices table (the last good snapshot,
// so the app works offline and survives models.dev downtime), held in memory so estimates are synchronous
// and never touch the network or the database on the hot path.
@Injectable()
export class ModelPricingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModelPricingService.name);
  private cached = new Map<string, CachedModel>();
  private resolved = new Map<string, ResolvedPrice>();
  private readonly warnedUnpriced = new Set<string>();
  private etag: string | null = null;
  private unsubscribeConfig: (() => void) | null = null;
  private syncPromise: Promise<PricingSyncStatus> | null = null;
  private status: PricingSyncStatus = {
    last_attempt_at: null,
    last_success_at: null,
    last_error: null,
    synced_models: 0,
    unpriced_models: [],
    running: false,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly modelsDev: ModelsDevService,
  ) {}

  async onModuleInit() {
    this.unsubscribeConfig = this.appConfig.onChange((key) => {
      if (key === 'pricing.model_overrides') this.rebuildResolved();
      if (key === 'ai.default_models') void this.syncIfMissingModels();
    });
    try {
      await this.loadFromDatabase();
    } catch (error) {
      this.logger.error(`Could not load cached prices: ${error?.message}`);
    }
    // Boot-time sync only when nothing is cached yet; the repeatable job keeps it fresh afterwards.
    if (!this.cached.size && this.appConfig.get('pricing.sync').enabled)
      setImmediate(() => void this.sync().catch(() => undefined));
  }

  onModuleDestroy() {
    this.unsubscribeConfig?.();
  }

  getStatus(): PricingSyncStatus {
    return { ...this.status, unpriced_models: this.unpricedModels() };
  }

  // Ids priced by the sync: the curated catalog plus whatever the admin configured as defaults.
  trackedModelIds(): string[] {
    const defaults = Object.values(this.appConfig.get('ai.default_models'));
    return [...new Set([...ALL_PRICED_MODEL_IDS, ...defaults])];
  }

  resolvePrice(modelId: string): ResolvedPrice {
    const hit = this.resolved.get(modelId);
    if (hit) return hit;
    // Ids outside the tracked set (e.g. an old model on a historical call) are resolved on the fly.
    const price = this.buildResolved(modelId);
    this.resolved.set(modelId, price);
    return price;
  }

  isReasoning(modelId: string): boolean {
    return (
      this.resolvePrice(modelId).is_reasoning ??
      findAiModel(modelId)?.is_reasoning ??
      false
    );
  }

  estimateTokenCost(usage: TokenUsageInput): CostEstimate {
    const price = this.priceOrWarn(usage.model);
    return {
      baseCostUsd: computeTokenCost(price.unit_prices, usage),
      unitPrices: price.unit_prices,
      source: price.source,
    };
  }

  estimateAudioCost(usage: AudioUsageInput): CostEstimate {
    const price = this.priceOrWarn(usage.model);
    return {
      baseCostUsd: computeAudioCost(
        price.unit_prices,
        usage,
        this.appConfig.get('pricing.audio_tokens_per_minute'),
      ),
      unitPrices: price.unit_prices,
      source: price.source,
    };
  }

  listResolved(): ResolvedPrice[] {
    return this.trackedModelIds()
      .map((id) => this.resolvePrice(id))
      .sort((a, b) => a.model_id.localeCompare(b.model_id));
  }

  unpricedModels(): string[] {
    return this.trackedModelIds().filter(
      (id) => this.resolvePrice(id).source === PricingSource.UNPRICED,
    );
  }

  // Concurrent callers (job, boot, admin "Sync now") share one run. `force` skips the ETag check, e.g. when
  // the set of tracked models changed or an admin asked for a fresh sync.
  sync(force = false): Promise<PricingSyncStatus> {
    if (!this.syncPromise)
      this.syncPromise = this.runSync(force).finally(() => {
        this.syncPromise = null;
      });
    return this.syncPromise;
  }

  private async runSync(force: boolean): Promise<PricingSyncStatus> {
    const config = this.appConfig.get('pricing.sync');
    this.status = { ...this.status, running: true, last_attempt_at: new Date() };
    try {
      const result = await this.modelsDev.fetchCatalog(
        [...config.providers, ...config.alias_providers],
        force || !this.cached.size ? null : this.etag,
      );
      if (result.notModified) {
        this.status = { ...this.status, last_success_at: new Date(), last_error: null };
        return this.getStatus();
      }

      const fetchedAt = new Date();
      const rows: Prisma.ModelPriceCreateManyInput[] = [];
      const matchedIds = new Set<string>();
      for (const modelId of this.trackedModelIds()) {
        const match = resolveFromCatalog(
          result.catalog,
          modelId,
          config.providers,
          config.alias_providers,
        );
        if (!match) continue;
        matchedIds.add(modelId);
        rows.push({
          model_id: modelId,
          provider: match.resolved_from.split('/')[0],
          source: match.source,
          resolved_from: match.resolved_from,
          cost: match.model.cost as Prisma.InputJsonValue,
          is_reasoning: match.model.reasoning ?? false,
          modalities: (match.model.modalities ?? {}) as Prisma.InputJsonValue,
          stale: false,
          fetched_at: fetchedAt,
        });
      }

      await this.prisma.$transaction([
        ...rows.map((row) =>
          this.prisma.modelPrice.upsert({
            where: { model_id: row.model_id },
            create: row,
            update: row,
          }),
        ),
        // A model that disappeared upstream keeps its last known price, marked stale (never deleted).
        this.prisma.modelPrice.updateMany({
          where: { model_id: { notIn: [...matchedIds] } },
          data: { stale: true },
        }),
      ]);

      this.etag = result.etag;
      await this.loadFromDatabase();
      this.status = {
        ...this.status,
        last_success_at: new Date(),
        last_error: null,
        synced_models: rows.length,
      };
      this.logger.log(`Pricing sync: ${rows.length} model(s) priced from models.dev`);
    } catch (error) {
      // Keep the last good snapshot.
      this.status = { ...this.status, last_error: String(error?.message ?? error) };
      this.logger.warn(`Pricing sync failed, keeping last snapshot: ${error?.message}`);
    } finally {
      this.status = { ...this.status, running: false };
    }
    return this.getStatus();
  }

  private async syncIfMissingModels() {
    const missing = this.trackedModelIds().some((id) => !this.cached.has(id));
    if (missing && this.appConfig.get('pricing.sync').enabled)
      await this.sync(true).catch(() => undefined);
    this.rebuildResolved();
  }

  private async loadFromDatabase() {
    const rows = await this.prisma.modelPrice.findMany();
    this.cached = new Map(
      rows.map((row) => [
        row.model_id,
        {
          source: row.source,
          resolved_from: row.resolved_from,
          unit_prices: toUnitPrices(row.cost as Record<string, number>),
          is_reasoning: row.is_reasoning,
          fetched_at: row.fetched_at,
          stale: row.stale,
        },
      ]),
    );
    this.rebuildResolved();
  }

  private rebuildResolved() {
    this.resolved = new Map(
      this.trackedModelIds().map((id) => [id, this.buildResolved(id)]),
    );
  }

  private buildResolved(modelId: string): ResolvedPrice {
    const cached = this.cached.get(modelId);
    const override = this.appConfig.get('pricing.model_overrides')[modelId] as
      | UnitPrices
      | undefined;
    const picked = pickRuntimePrice(cached, override);
    const fromCatalog =
      picked.source === PricingSource.MODELS_DEV ||
      picked.source === PricingSource.MODELS_DEV_ALIAS;
    return {
      model_id: modelId,
      source: picked.source,
      resolved_from: picked.resolved_from,
      unit_prices: picked.unit_prices,
      is_reasoning: cached?.is_reasoning ?? null,
      fetched_at: fromCatalog ? (cached?.fetched_at ?? null) : null,
      stale: fromCatalog ? (cached?.stale ?? false) : false,
    };
  }

  // The feature that produced the usage never fails: unpriced models cost 0 and are reported once.
  private priceOrWarn(modelId: string): ResolvedPrice {
    const price = this.resolvePrice(modelId);
    if (price.source === PricingSource.UNPRICED && !this.warnedUnpriced.has(modelId)) {
      this.warnedUnpriced.add(modelId);
      this.logger.warn(
        `No price for model "${modelId}": recording cost 0. Add a pricing.model_overrides entry.`,
      );
    }
    return price;
  }
}
