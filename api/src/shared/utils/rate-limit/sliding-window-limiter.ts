import { HttpException, HttpStatus } from '@nestjs/common';

// Per-key sliding-window rate limiter held in process memory. Good enough for abuse protection on low-volume
// endpoints (comments, CSV exports); limits are per API instance.
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  tryHit(key: string, now = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(since);
    return true;
  }

  assert(key: string, message = 'Too many requests. Try again in a moment.') {
    if (!this.tryHit(key))
      throw new HttpException(
        { message, code: 'RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  private prune(since: number) {
    for (const [key, times] of this.hits)
      if (!times.some((at) => at > since)) this.hits.delete(key);
  }
}
