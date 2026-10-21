const LOCAL_ORIGIN = 'https://local.invalid'
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

/** Return a normalized same-origin path or a known local fallback. */
export function safeRelativeRedirect(raw: unknown, fallback = '/'): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (CONTROL_CHARACTERS.test(value)) return fallback

  try {
    const parsed = new URL(value, LOCAL_ORIGIN)
    if (parsed.origin !== LOCAL_ORIGIN) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
