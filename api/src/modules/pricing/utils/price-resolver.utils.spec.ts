import { PricingSource } from 'generated/prisma';
import { ModelsDevCatalog } from '@/integrations/models-dev/interfaces/models-dev.interface';
import {
  hasUsablePrice,
  pickRuntimePrice,
  resolveFromCatalog,
  stripSnapshotSuffix,
  toUnitPrices,
} from './price-resolver.utils';

const catalog: ModelsDevCatalog = {
  openai: {
    id: 'openai',
    models: {
      'gpt-4o': { id: 'gpt-4o', cost: { input: 2.5, output: 10 } },
      'gpt-4.1-mini': { id: 'gpt-4.1-mini', cost: { input: 0.4, output: 1.6, cache_read: 0.1 } },
      'gpt-realtime-2.1': {
        id: 'gpt-realtime-2.1',
        reasoning: true,
        cost: { input: 4, output: 24, cache_read: 0.4, input_audio: 32, output_audio: 64 },
      },
    },
  },
  vercel: {
    id: 'vercel',
    models: {
      'openai/gpt-4o-transcribe': {
        id: 'openai/gpt-4o-transcribe',
        cost: { input: 2.5, output: 10, input_audio: 6 },
      },
    },
  },
  llmgateway: {
    id: 'llmgateway',
    models: {
      'openai/gpt-transcribe': { id: 'openai/gpt-transcribe', cost: { input: 0, output: 0 } },
    },
  },
};

const resolve = (id: string, aliasProviders = ['vercel', 'llmgateway']) =>
  resolveFromCatalog(catalog, id, ['openai'], aliasProviders);

describe('resolveFromCatalog', () => {
  it('returns a direct hit on the primary provider', () => {
    const match = resolve('gpt-4o');
    expect(match?.source).toBe(PricingSource.MODELS_DEV);
    expect(match?.resolved_from).toBe('openai/gpt-4o');
  });

  it('strips a dated snapshot suffix', () => {
    const match = resolve('gpt-4o-2024-11-20');
    expect(match?.source).toBe(PricingSource.MODELS_DEV_ALIAS);
    expect(match?.resolved_from).toBe('openai/gpt-4o');
  });

  it('falls back to a secondary provider listing openai/<id>', () => {
    const match = resolve('gpt-4o-transcribe');
    expect(match?.source).toBe(PricingSource.MODELS_DEV_ALIAS);
    expect(match?.resolved_from).toBe('vercel/openai/gpt-4o-transcribe');
  });

  it('follows the code alias map (diarize -> transcribe via vercel)', () => {
    const match = resolve('gpt-4o-transcribe-diarize');
    expect(match?.source).toBe(PricingSource.MODELS_DEV_ALIAS);
    expect(match?.resolved_from).toBe('vercel/openai/gpt-4o-transcribe');
  });

  it('prices the deprecated gpt-realtime through gpt-realtime-2.1', () => {
    const match = resolve('gpt-realtime');
    expect(match?.source).toBe(PricingSource.MODELS_DEV_ALIAS);
    expect(match?.resolved_from).toBe('openai/gpt-realtime-2.1');
  });

  it('treats 0/0 gateway placeholder prices as not found', () => {
    expect(resolve('gpt-transcribe')).toBeNull();
    expect(hasUsablePrice({ input: 0, output: 0 })).toBe(false);
  });

  it('returns null for unknown models', () => {
    expect(resolve('nope-model')).toBeNull();
  });
});

describe('pickRuntimePrice', () => {
  const direct = {
    source: PricingSource.MODELS_DEV,
    resolved_from: 'openai/x',
    unit_prices: { input: 1, output: 2 },
  };
  const alias = { ...direct, source: PricingSource.MODELS_DEV_ALIAS };
  const override = { per_minute: 0.01 };

  it('prefers a direct models.dev price over an override', () => {
    expect(pickRuntimePrice(direct, override)).toBe(direct);
  });

  it('prefers an admin override over an alias', () => {
    expect(pickRuntimePrice(alias, override).source).toBe(PricingSource.ADMIN_OVERRIDE);
  });

  it('uses the alias when there is no override', () => {
    expect(pickRuntimePrice(alias, undefined)).toBe(alias);
  });

  it('is UNPRICED when nothing matches', () => {
    expect(pickRuntimePrice(null, {}).source).toBe(PricingSource.UNPRICED);
  });
});

describe('helpers', () => {
  it('stripSnapshotSuffix only removes YYYY-MM-DD suffixes', () => {
    expect(stripSnapshotSuffix('gpt-4o-mini-2024-07-18')).toBe('gpt-4o-mini');
    expect(stripSnapshotSuffix('gpt-4.1-mini')).toBe('gpt-4.1-mini');
  });

  it('toUnitPrices keeps known numeric fields only', () => {
    expect(
      toUnitPrices({ input: 1, output: 2, weird: 3, cache_read: 'x' } as never),
    ).toEqual({ input: 1, output: 2 });
  });
});
