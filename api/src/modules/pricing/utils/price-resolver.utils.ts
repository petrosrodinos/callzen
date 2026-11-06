import { PricingSource } from 'generated/prisma';
import {
  ModelsDevCatalog,
  ModelsDevCost,
  ModelsDevModel,
} from '@/integrations/models-dev/interfaces/models-dev.interface';
import { UnitPrices } from '../interfaces/pricing.interface';

// Known model families models.dev does not list under their own id (§4.4). The gpt-realtime entry only
// prices historical or in-flight sessions; new sessions use gpt-realtime-2.1 directly.
export const KNOWN_MODEL_ALIASES: Record<string, string> = {
  'gpt-4o-transcribe-diarize': 'gpt-4o-transcribe',
  'gpt-realtime': 'gpt-realtime-2.1',
};

const SNAPSHOT_SUFFIX = /-\d{4}-\d{2}-\d{2}$/;

export const stripSnapshotSuffix = (modelId: string): string =>
  modelId.replace(SNAPSHOT_SUFFIX, '');

export interface CatalogMatch {
  source: typeof PricingSource.MODELS_DEV | typeof PricingSource.MODELS_DEV_ALIAS;
  resolved_from: string;
  model: ModelsDevModel;
}

// Gateway placeholders list models at 0/0. Those are treated as not found so they are never used as prices.
export const hasUsablePrice = (cost: ModelsDevCost | undefined): boolean =>
  !!cost &&
  typeof cost.input === 'number' &&
  typeof cost.output === 'number' &&
  !(cost.input === 0 && cost.output === 0);

const lookup = (
  catalog: ModelsDevCatalog,
  providerId: string,
  modelKey: string,
): ModelsDevModel | null => {
  const model = catalog[providerId]?.models?.[modelKey];
  return model && hasUsablePrice(model.cost) ? model : null;
};

// Sync-time resolution against the models.dev catalog (§4.4 steps 1–2). Admin overrides (step 3) are applied
// at runtime by `pickRuntimePrice`, so changing an override never needs a re-sync.
export const resolveFromCatalog = (
  catalog: ModelsDevCatalog,
  modelId: string,
  providers: string[],
  aliasProviders: string[],
  depth = 0,
): CatalogMatch | null => {
  // 1. Direct hit on a primary provider.
  for (const provider of providers) {
    const model = lookup(catalog, provider, modelId);
    if (model)
      return {
        source: PricingSource.MODELS_DEV,
        resolved_from: `${provider}/${modelId}`,
        model,
      };
  }

  const alias = (match: CatalogMatch | null): CatalogMatch | null =>
    match ? { ...match, source: PricingSource.MODELS_DEV_ALIAS } : null;

  // 2a. Dated snapshot (gpt-4o-2024-11-20 -> gpt-4o).
  const base = stripSnapshotSuffix(modelId);
  if (base !== modelId) {
    for (const provider of providers) {
      const model = lookup(catalog, provider, base);
      if (model)
        return alias({
          source: PricingSource.MODELS_DEV,
          resolved_from: `${provider}/${base}`,
          model,
        });
    }
  }

  // 2b. Secondary providers listing OpenAI models as "openai/<id>".
  for (const provider of aliasProviders) {
    for (const candidate of new Set([modelId, base])) {
      const key = `openai/${candidate}`;
      const model = lookup(catalog, provider, key);
      if (model)
        return alias({
          source: PricingSource.MODELS_DEV,
          resolved_from: `${provider}/${key}`,
          model,
        });
    }
  }

  // 2c. Code-level aliases for known families (one hop only, to avoid cycles).
  const target = KNOWN_MODEL_ALIASES[modelId];
  if (target && depth === 0)
    return alias(
      resolveFromCatalog(catalog, target, providers, aliasProviders, depth + 1),
    );

  return null;
};

export const toUnitPrices = (cost: ModelsDevCost | undefined): UnitPrices => {
  if (!cost) return {};
  const keys: (keyof UnitPrices)[] = [
    'input',
    'output',
    'cache_read',
    'cache_write',
    'reasoning',
    'input_audio',
    'output_audio',
  ];
  const result: UnitPrices = {};
  for (const key of keys) {
    const value = (cost as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
  }
  return result;
};

export interface CachedPriceRow {
  source: PricingSource;
  resolved_from: string | null;
  unit_prices: UnitPrices;
}

// Runtime precedence (§4.4): direct models.dev > admin override > alias > unpriced.
export const pickRuntimePrice = (
  cached: CachedPriceRow | null | undefined,
  override: UnitPrices | null | undefined,
): CachedPriceRow => {
  if (cached?.source === PricingSource.MODELS_DEV) return cached;
  if (override && Object.keys(override).length)
    return {
      source: PricingSource.ADMIN_OVERRIDE,
      resolved_from: 'admin',
      unit_prices: override,
    };
  if (cached?.source === PricingSource.MODELS_DEV_ALIAS) return cached;
  return { source: PricingSource.UNPRICED, resolved_from: null, unit_prices: {} };
};
