import { redactTelemetryText } from './contract'

type LogLevel = 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown> & { requestId?: string; traceId?: string }

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return redactTelemetryText(value, 2000)
  if (Array.isArray(value)) return value.slice(0, 20).map(scrub)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([key, nested]) => [key, scrub(nested)]))
  }
  return value
}

export function structuredLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: redactTelemetryText(event, 128),
    requestId: context.requestId ?? null,
    traceId: context.traceId ?? null,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    context: scrub(context),
  })
  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else console.info(payload)
}
