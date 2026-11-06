import {
  AudioTokensPerMinute,
  UnitPrices,
} from '../interfaces/pricing.interface';

const PER_MILLION = 1_000_000;

const nonNegative = (value: number | undefined | null): number =>
  Math.max(0, Number.isFinite(value) ? (value as number) : 0);

// Token calls (§4.3). AI SDK 7 / OpenAI report reasoning tokens inside outputTokens, so `reasoning` is only
// billed separately when the caller says the provider reports them outside the output count.
export const computeTokenCost = (
  prices: UnitPrices,
  usage: {
    inputTokens: number;
    cachedInputTokens?: number;
    outputTokens: number;
    reasoningTokens?: number;
  },
  options: { reasoningBilledSeparately?: boolean } = {},
): number => {
  const input = nonNegative(usage.inputTokens);
  const cached = Math.min(nonNegative(usage.cachedInputTokens), input);
  const uncached = input - cached;
  const output = nonNegative(usage.outputTokens);
  const reasoning = nonNegative(usage.reasoningTokens);

  const inputPrice = prices.input ?? 0;
  const cost =
    uncached * inputPrice +
    cached * (prices.cache_read ?? inputPrice) +
    output * (prices.output ?? 0) +
    (options.reasoningBilledSeparately && prices.reasoning
      ? reasoning * prices.reasoning
      : 0);
  return cost / PER_MILLION;
};

// Audio (§4.3, §4.5): durations are converted to audio tokens; models billed by duration use per_minute.
export const computeAudioCost = (
  prices: UnitPrices,
  usage: { inputSeconds: number; outputSeconds?: number },
  tokensPerMinute: AudioTokensPerMinute,
): number => {
  const inputSeconds = nonNegative(usage.inputSeconds);
  const outputSeconds = nonNegative(usage.outputSeconds);

  if (prices.per_minute != null)
    return ((inputSeconds + outputSeconds) / 60) * prices.per_minute;

  const inputTokens = (inputSeconds / 60) * tokensPerMinute.input;
  const outputTokens = (outputSeconds / 60) * tokensPerMinute.output;
  return (
    (inputTokens * (prices.input_audio ?? prices.input ?? 0) +
      outputTokens * (prices.output_audio ?? prices.output ?? 0)) /
    PER_MILLION
  );
};

export const applyMarkup = (baseCostUsd: number, markupPercent: number) =>
  nonNegative(baseCostUsd) * (1 + nonNegative(markupPercent) / 100);
