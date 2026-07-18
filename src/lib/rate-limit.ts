/**
 * In-memory fixed-window limiter. Adequate for a single instance and for local
 * dev; on multi-instance serverless this degrades to per-instance limits.
 * Swap the store for Upstash Redis before relying on it as real abuse control.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  const next = { count: existing.count + 1, resetAt: existing.resetAt };
  buckets.set(key, next);

  return {
    ok: next.count <= limit,
    remaining: Math.max(limit - next.count, 0),
    resetAt: next.resetAt,
  };
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
