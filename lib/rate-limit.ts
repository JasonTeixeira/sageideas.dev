// In-memory rate limiter for public POST endpoints.
//
// Trade-off: per-Vercel-instance, not global. A burst attacker hitting multiple
// instances can exceed limits proportionally to instance count. Acceptable as a
// first line — better than nothing — and we can swap to Upstash/Redis later
// without changing the call sites.
//
// Algorithm: sliding-window-style hit list per IP, bounded LRU eviction.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Bucket = {
  hits: number[]
  lastSeen: number
}

const MAX_IPS = 10_000
const buckets = new Map<string, Bucket>()

type HeaderLike = {
  get(name: string): string | null
}

function clientIpFromHeaders(h: HeaderLike): string {
  const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (fwd) return fwd
  const real = h.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}

function clientIp(req: NextRequest): string {
  return clientIpFromHeaders(req.headers)
}

function evictIfFull() {
  if (buckets.size <= MAX_IPS) return
  // Evict the single least-recently-seen entry.
  let oldestKey: string | null = null
  let oldestTs = Infinity
  for (const [key, b] of buckets) {
    if (b.lastSeen < oldestTs) {
      oldestTs = b.lastSeen
      oldestKey = key
    }
  }
  if (oldestKey) buckets.delete(oldestKey)
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number }

function recordHit(
  ip: string,
  opts: { limit: number; windowMs: number; prefix?: string },
): RateLimitResult {
  const now = Date.now()
  const key = opts.prefix ? `${opts.prefix}:${ip}` : ip

  const bucket = buckets.get(key)
  const fresh = (bucket?.hits ?? []).filter((ts) => now - ts < opts.windowMs)

  if (fresh.length >= opts.limit) {
    const oldest = fresh[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000))
    // Update lastSeen so this IP's record stays at the front of the LRU.
    buckets.set(key, { hits: fresh, lastSeen: now })
    return { ok: false, retryAfterSeconds }
  }

  fresh.push(now)
  buckets.set(key, { hits: fresh, lastSeen: now })
  evictIfFull()
  return { ok: true }
}

export function checkRateLimit(
  req: NextRequest,
  opts: { limit: number; windowMs: number; prefix?: string },
): RateLimitResult {
  return recordHit(clientIp(req), opts)
}

/**
 * Variant for contexts where only the request headers are available
 * (server actions, route handlers that already consumed the request body).
 * Pass the awaited result of `headers()` (or any HeaderLike).
 */
export function checkRateLimitFromHeaders(
  h: HeaderLike,
  opts: { limit: number; windowMs: number; prefix?: string },
): RateLimitResult {
  return recordHit(clientIpFromHeaders(h), opts)
}

/**
 * Convenience wrapper: returns a 429 NextResponse with Retry-After when limited,
 * or null when the request should proceed.
 */
export function rateLimit(
  req: NextRequest,
  opts: { limit: number; windowMs: number; prefix?: string },
): NextResponse | null {
  const result = checkRateLimit(req, opts)
  if (result.ok) return null
  return NextResponse.json(
    { error: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
      },
    },
  )
}
