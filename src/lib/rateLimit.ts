// Tiny fixed-window rate limiter. In-memory and dependency-free, so it runs
// in edge middleware with no extra infrastructure.
//
// Caveat: state lives per server instance, so across many serverless/edge
// isolates the effective limit is higher than the nominal one. It's a solid
// first line against naive floods and credential-stuffing, but for a hard,
// globally-consistent limit swap the store for Redis (e.g. Upstash) behind
// this same interface.

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
// Cap the map so a flood of unique keys can't grow memory unbounded; when we
// cross it, drop everything already expired.
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets (0 when ok)
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [k, v] of buckets) {
    if (now >= v.resetAt) buckets.delete(k);
  }
}
