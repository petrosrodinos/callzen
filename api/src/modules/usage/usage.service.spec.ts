import { PricingSource, UsageKind } from 'generated/prisma';
import { UsageService } from './usage.service';

// Markup and unit prices are snapshotted on each event at record time (§3.7).
describe('UsageService.record', () => {
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  const build = (markup: number) => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { usageEvent: { create } };
    const pricing = {
      estimateTokenCost: jest.fn().mockReturnValue({
        baseCostUsd: 0.01,
        unitPrices: { input: 1, output: 2 },
        source: PricingSource.MODELS_DEV,
      }),
      estimateAudioCost: jest.fn().mockReturnValue({
        baseCostUsd: 0.02,
        unitPrices: { per_minute: 0.01 },
        source: PricingSource.ADMIN_OVERRIDE,
      }),
    };
    const appConfig = { get: jest.fn().mockReturnValue(markup) };
    const service = new UsageService(prisma as never, pricing as never, appConfig as never);
    return { service, create, pricing };
  };

  it('stores base cost, charged cost and the markup in force', async () => {
    const { service, create } = build(50);
    service.record({
      organisationId: 'org',
      userId: 'user',
      callId: 'call',
      kind: UsageKind.SUGGESTION,
      model: 'gpt-4.1-mini',
      tokens: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 10, reasoningTokens: 0 },
    });
    await flush();
    const data = create.mock.calls[0][0].data;
    expect(data.cost_usd).toBeCloseTo(0.01);
    expect(data.charged_cost_usd).toBeCloseTo(0.015);
    expect(data.markup_percent).toBe(50);
    expect(data.cached_input_tokens).toBe(20);
    expect(data.pricing_source).toBe(PricingSource.MODELS_DEV);
    expect(data.unit_prices).toEqual({ input: 1, output: 2 });
  });

  it('prices audio from durations', async () => {
    const { service, create, pricing } = build(0);
    service.record({
      organisationId: 'org',
      userId: 'user',
      kind: UsageKind.TRANSCRIPTION,
      model: 'gpt-live-transcribe',
      audio: { inputSeconds: 90 },
    });
    await flush();
    expect(pricing.estimateAudioCost).toHaveBeenCalledWith({
      model: 'gpt-live-transcribe',
      inputSeconds: 90,
    });
    const data = create.mock.calls[0][0].data;
    expect(data.audio_seconds).toBe(90);
    expect(data.charged_cost_usd).toBeCloseTo(0.02);
  });

  it('never throws, even when the database write fails', async () => {
    const { service, create } = build(0);
    create.mockRejectedValueOnce(new Error('db down'));
    expect(() =>
      service.record({ organisationId: 'o', userId: 'u', kind: UsageKind.ASK }),
    ).not.toThrow();
    await flush();
  });
});
