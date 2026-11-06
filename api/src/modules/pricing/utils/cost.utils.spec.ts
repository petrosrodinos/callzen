import { applyMarkup, computeAudioCost, computeTokenCost } from './cost.utils';

const TOKENS_PER_MINUTE = { input: 600, output: 1200 };

describe('computeTokenCost', () => {
  const prices = { input: 2, output: 8, cache_read: 0.5, reasoning: 20 };

  it('prices uncached input and output per million tokens', () => {
    expect(
      computeTokenCost(prices, { inputTokens: 1_000_000, outputTokens: 500_000 }),
    ).toBeCloseTo(2 + 4);
  });

  it('bills cached input at cache_read', () => {
    const cost = computeTokenCost(prices, {
      inputTokens: 1_000_000,
      cachedInputTokens: 400_000,
      outputTokens: 0,
    });
    expect(cost).toBeCloseTo(0.6 * 2 + 0.4 * 0.5);
  });

  it('falls back to the input price when there is no cache_read price', () => {
    const cost = computeTokenCost(
      { input: 2, output: 8 },
      { inputTokens: 1_000_000, cachedInputTokens: 1_000_000, outputTokens: 0 },
    );
    expect(cost).toBeCloseTo(2);
  });

  it('never bills reasoning twice (it is part of the output count by default)', () => {
    const usage = { inputTokens: 0, outputTokens: 1_000_000, reasoningTokens: 600_000 };
    expect(computeTokenCost(prices, usage)).toBeCloseTo(8);
    expect(
      computeTokenCost(prices, usage, { reasoningBilledSeparately: true }),
    ).toBeCloseTo(8 + 12);
  });

  it('clamps cached tokens to the input count and ignores bad numbers', () => {
    expect(
      computeTokenCost(prices, {
        inputTokens: 100,
        cachedInputTokens: 1000,
        outputTokens: NaN,
      }),
    ).toBeCloseTo((100 * 0.5) / 1_000_000);
  });
});

describe('computeAudioCost', () => {
  it('matches the gpt-realtime-2.1 worked example (~$0.096 per minute each side)', () => {
    const cost = computeAudioCost(
      { input: 4, output: 24, input_audio: 32, output_audio: 64 },
      { inputSeconds: 60, outputSeconds: 60 },
      TOKENS_PER_MINUTE,
    );
    expect(cost).toBeCloseTo(0.0192 + 0.0768, 6);
  });

  it('uses per_minute pricing when set and skips token conversion', () => {
    expect(
      computeAudioCost({ per_minute: 0.017, input_audio: 999 }, { inputSeconds: 120 }, TOKENS_PER_MINUTE),
    ).toBeCloseTo(0.034);
  });

  it('falls back to text prices when audio prices are missing', () => {
    expect(
      computeAudioCost({ input: 6, output: 10 }, { inputSeconds: 60 }, TOKENS_PER_MINUTE),
    ).toBeCloseTo((600 * 6) / 1_000_000);
  });

  it('is 0 for an unpriced model', () => {
    expect(computeAudioCost({}, { inputSeconds: 600, outputSeconds: 60 }, TOKENS_PER_MINUTE)).toBe(0);
  });
});

describe('applyMarkup', () => {
  it('applies the markup percentage', () => {
    expect(applyMarkup(1, 25)).toBeCloseTo(1.25);
    expect(applyMarkup(0.5, 0)).toBeCloseTo(0.5);
  });
});
