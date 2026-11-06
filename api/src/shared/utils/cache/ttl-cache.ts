// Small in-process cache with per-entry expiry and in-flight de-duplication (concurrent misses share one
// load). Cross-instance invalidation is done by the owner via RedisPubSubService.
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 5000,
  ) {}

  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = load()
      .then((value) => {
        if (this.entries.size >= this.maxEntries) {
          const oldest = this.entries.keys().next().value;
          if (oldest !== undefined) this.entries.delete(oldest);
        }
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  deleteWhere(predicate: (key: string) => boolean) {
    for (const key of [...this.entries.keys()])
      if (predicate(key)) this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }
}
