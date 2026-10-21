const MAX_WEBHOOK_AGE_SECONDS = 5 * 60
const MAX_FUTURE_SKEW_SECONDS = 60

/**
 * Standard Webhooks timestamps are integer Unix seconds. Reject stale requests
 * before signature work or side effects so a captured valid request cannot be
 * replayed indefinitely.
 */
export function isFreshWebhookTimestamp(timestamp: string, nowMs = Date.now()): boolean {
  if (!/^\d+$/.test(timestamp)) return false
  const seconds = Number(timestamp)
  if (!Number.isSafeInteger(seconds)) return false

  const ageSeconds = Math.floor(nowMs / 1000) - seconds
  return ageSeconds >= -MAX_FUTURE_SKEW_SECONDS && ageSeconds <= MAX_WEBHOOK_AGE_SECONDS
}
