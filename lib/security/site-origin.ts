const PRODUCTION_FALLBACK = 'https://www.sageideas.dev'
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

type SiteOriginInput = {
  configured?: string | null
  forwardedHost?: string | null
  host?: string | null
  forwardedProto?: string | null
  production: boolean
}

function parsedOrigin(value: string, production: boolean): string | null {
  try {
    const url = new URL(value)
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return null
    if (production && url.protocol !== 'https:') return null
    if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)) return null
    return url.origin
  } catch {
    return null
  }
}

/** Resolve security-sensitive callback origins without trusting production Host headers. */
export function canonicalSiteOrigin(input: SiteOriginInput): string {
  const configured = input.configured?.trim()
  if (configured) {
    const origin = parsedOrigin(configured, input.production)
    if (origin) return origin
  }

  if (!input.production) {
    const host = input.forwardedHost?.trim() || input.host?.trim()
    const proto = input.forwardedProto === 'https' ? 'https' : 'http'
    if (host) {
      const origin = parsedOrigin(`${proto}://${host}`, false)
      if (origin && LOOPBACK_HOSTS.has(new URL(origin).hostname)) return origin
    }
  }

  return PRODUCTION_FALLBACK
}
