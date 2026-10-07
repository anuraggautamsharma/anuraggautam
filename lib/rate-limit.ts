import 'server-only'

/**
 * Best-effort, in-memory sliding-window limiter (PLAN_V3 §4: 5 requests per IP per 10 minutes).
 * Per server instance only: a serverless cold start or a second region starts a fresh window.
 * It slows down a casual flood; Resend's idempotency keys and the honeypot do the rest.
 */
const buckets = new Map<string, number[]>()
let lastSweep = 0

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 10 * 60 * 1000 }: { limit?: number; windowMs?: number } = {},
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now()
  sweep(now, windowMs)
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, retryAfterMs: windowMs - (now - hits[0]) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { ok: true, retryAfterMs: 0 }
}

/** Drop stale keys at most once a minute, so the map can't grow without bound. */
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, hits] of buckets) {
    if (!hits.length || now - hits[hits.length - 1] >= windowMs) buckets.delete(k)
  }
}

/** The caller's IP from the platform's forwarding headers ("unknown" when absent, e.g. in dev). */
export function clientIp(h: Headers): string {
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim() || 'unknown'
  return h.get('x-real-ip')?.trim() || 'unknown'
}
