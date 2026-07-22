/**
 * A tiny, dependency-free fixed-window rate limiter.
 *
 * Best-effort and in-memory (per server instance) — not a distributed limiter.
 * The clock is injectable so the behaviour is deterministically testable.
 *
 * - The window is half-open `[start, start + windowMs)`: a request at exactly the
 *   reset timestamp starts a fresh window (comparison is `>=`).
 * - Expired entries are pruned on each call so abandoned keys do not accumulate,
 *   and a conservative `maxEntries` cap bounds worst-case memory.
 */
export interface RateLimiter {
  /** Returns true if the request for `key` is allowed, false if limited. */
  check(key: string): boolean;
  /** Number of keys currently tracked (for cleanup verification / ops). */
  size(): number;
}

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxEntries?: number;
}): RateLimiter {
  const {
    limit,
    windowMs,
    now = () => Date.now(),
    maxEntries = 10_000,
  } = options;
  const hits = new Map<string, { count: number; reset: number }>();

  function prune(t: number): void {
    for (const [key, entry] of hits) {
      if (t >= entry.reset) hits.delete(key);
    }
  }

  return {
    check(key: string): boolean {
      const t = now();
      // Deterministic cleanup of expired windows before evaluating this key.
      prune(t);

      const entry = hits.get(key);
      if (!entry || t >= entry.reset) {
        // Safeguard: never grow past maxEntries. If still at the cap after
        // pruning, evict the entry closest to expiry before inserting.
        if (hits.size >= maxEntries) {
          let oldestKey: string | undefined;
          let oldestReset = Infinity;
          for (const [k, e] of hits) {
            if (e.reset < oldestReset) {
              oldestReset = e.reset;
              oldestKey = k;
            }
          }
          if (oldestKey !== undefined) hits.delete(oldestKey);
        }
        hits.set(key, { count: 1, reset: t + windowMs });
        return true;
      }

      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
    size(): number {
      return hits.size;
    },
  };
}
