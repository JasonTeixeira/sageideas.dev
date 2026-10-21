import crypto from 'node:crypto'

/**
 * Newsletter helpers — Resend-only, stateless double-opt-in.
 *
 * No database: the confirm link carries an HMAC-signed token ({email, source,
 * expiry}), so there's no "pending subscriber" row to store. On confirm we add
 * the address to a Resend Audience (if configured) — that audience IS the
 * subscriber list. One provider, one key.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return !!email && email.length <= 320 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

export type NewsletterTokenPurpose = 'confirm' | 'unsubscribe'

/** Token signing is a security boundary: never reuse a provider key or a shared
 * development fallback. A missing dedicated secret must fail closed. */
function secret(): string {
  const value = process.env.NEWSLETTER_SECRET?.trim()
  if (!value || value.length < 32) {
    throw new Error('NEWSLETTER_SECRET must be configured with at least 32 characters')
  }
  return value
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

/** Sign a confirm/unsubscribe token — base64url(payload).base64url(hmac). */
export function signToken(email: string, source = '', purpose: NewsletterTokenPurpose = 'confirm'): string {
  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) throw new Error('Cannot sign an invalid newsletter email')
  const normalizedSource = source.trim().slice(0, 64)
  const payload = JSON.stringify({ e: normalizedEmail, s: normalizedSource, p: purpose, x: Date.now() + TOKEN_TTL_MS })
  const b = Buffer.from(payload).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(b).digest('base64url')
  return `${b}.${sig}`
}

/** Verify a token; returns { email, source } or null (bad sig / expired / malformed). */
export function verifyToken(token: string, purpose: NewsletterTokenPurpose = 'confirm'): { email: string; source: string } | null {
  if (!token || token.length > 2048) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b, sig] = parts
  if (!b || !sig || !/^[A-Za-z0-9_-]+$/.test(b) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null
  const expected = crypto.createHmac('sha256', secret()).update(b).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const p = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as { e?: string; s?: string; p?: string; x?: number }
    const email = normalizeEmail(p.e ?? '')
    if (!isValidEmail(email) || p.p !== purpose || typeof p.x !== 'number' || !Number.isFinite(p.x) || Date.now() > p.x) return null
    return { email, source: typeof p.s === 'string' ? p.s.slice(0, 64) : '' }
  } catch {
    return null
  }
}
