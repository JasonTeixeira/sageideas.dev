import { parseTraceSampleRate, redactTelemetryText, sanitizeTelemetryUrl } from './contract'

export { parseTraceSampleRate }

function scrubUnknown(value: unknown): unknown {
  if (typeof value === 'string') return redactTelemetryText(value, 4000)
  if (Array.isArray(value)) return value.slice(0, 50).map(scrubUnknown)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, nested]) => [key, scrubUnknown(nested)]))
  }
  return value
}

export function scrubSentryEvent<T extends Record<string, any>>(event: T): T {
  const scrubbed = scrubUnknown(event) as T
  const request = event.request ? {
    ...event.request,
    url: sanitizeTelemetryUrl(event.request.url),
    query_string: undefined,
    cookies: undefined,
    headers: undefined,
    data: undefined,
  } : undefined
  const user = event.user?.id ? { id: String(event.user.id).slice(0, 128) } : undefined
  const exception = event.exception ? {
    ...event.exception,
    values: Array.isArray(event.exception.values)
      ? event.exception.values.map((value: Record<string, unknown>) => ({ ...value, value: redactTelemetryText(value.value, 4000) }))
      : event.exception.values,
  } : undefined
  return {
    ...scrubbed,
    ...(request ? { request } : {}),
    ...(event.user ? { user } : {}),
    ...(exception ? { exception } : {}),
    message: event.message ? redactTelemetryText(event.message, 4000) : event.message,
  }
}
