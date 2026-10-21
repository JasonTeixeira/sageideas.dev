import { createHash } from 'node:crypto'

export const MAX_EMAIL_ATTEMPTS = 3
export const DELIVERED_EMAIL_STATUSES = ['sent', 'delivered', 'opened', 'clicked'] as const

type EmailKeyInput = {
  to: string | string[]
  from?: string
  subject: string
  html: string
  text?: string
  templateKey?: string
  userId?: string
  metadata?: Record<string, unknown>
  idempotencyKey?: string
  replyTo?: string
  headers?: Record<string, string>
  attachments?: Array<{ filename: string; content: string | Buffer; contentType?: string }>
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function buildEmailIdempotencyKey(input: EmailKeyInput): string {
  if (input.idempotencyKey !== undefined) {
    const key = input.idempotencyKey.trim()
    if (!/^[A-Za-z0-9:_-]{1,256}$/.test(key)) throw new Error('invalid_email_idempotency_key')
    return key
  }
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((value) => value.trim().toLowerCase())
    .sort()
  const canonical = stableJson({
    recipients,
    from: input.from ?? null,
    replyTo: input.replyTo ?? null,
    subject: input.subject,
    html: input.html,
    text: input.text ?? null,
    templateKey: input.templateKey ?? null,
    userId: input.userId ?? null,
    metadata: input.metadata ?? {},
    headers: input.headers ?? {},
    attachments: (input.attachments ?? []).map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType ?? null,
      contentHash: createHash('sha256').update(attachment.content).digest('hex'),
    })),
  })
  return `sage-email-${createHash('sha256').update(canonical).digest('hex')}`
}

export function validateEmailDeliveryInput(input: Pick<EmailKeyInput, 'to' | 'from' | 'replyTo' | 'subject' | 'html' | 'text' | 'headers' | 'attachments' | 'metadata'>) {
  const recipients = Array.isArray(input.to) ? input.to : [input.to]
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors: string[] = []
  if (recipients.length < 1 || recipients.length > 50) errors.push('recipient_count_invalid')
  if (recipients.some((recipient) => typeof recipient !== 'string' || recipient.length > 320 || !emailPattern.test(recipient))) {
    errors.push('recipient_invalid')
  }
  if (!input.subject.trim() || input.subject.length > 998 || /[\r\n]/.test(input.subject)) errors.push('subject_invalid')
  if (!input.html || input.html.length > 5_000_000) errors.push('html_invalid')
  if ((input.text?.length ?? 0) > 2_000_000) errors.push('text_invalid')
  if ((input.from && (input.from.length > 320 || /[\r\n]/.test(input.from)))
    || (input.replyTo && (input.replyTo.length > 320 || !emailPattern.test(input.replyTo)))) {
    errors.push('sender_invalid')
  }
  if (Object.entries(input.headers ?? {}).some(([key, value]) => (
    !key || key.length > 128 || value.length > 2_048 || /[\r\n]/.test(key) || /[\r\n]/.test(value)
  ))) errors.push('header_invalid')
  const attachments = input.attachments ?? []
  const attachmentBytes = attachments.reduce((total, attachment) => (
    total + (typeof attachment.content === 'string'
      ? Buffer.byteLength(attachment.content, 'utf8')
      : attachment.content.byteLength)
  ), 0)
  if (attachments.length > 10 || attachmentBytes > 40_000_000 || attachments.some((attachment) => (
    !attachment.filename || attachment.filename.length > 255 || /[\r\n/\\]/.test(attachment.filename)
  ))) errors.push('attachments_invalid')
  try {
    if (JSON.stringify(input.metadata ?? {}).length > 65_536) errors.push('metadata_invalid')
  } catch {
    errors.push('metadata_invalid')
  }
  return { ok: errors.length === 0, errors }
}

export function calculateEmailRetryDisposition(input: {
  attempt: number
  maxAttempts?: number
  retryable: boolean
}): { status: 'failed' | 'dead_lettered'; retryAfterSeconds: number | null } {
  const attempt = Math.max(1, Math.round(input.attempt))
  const maxAttempts = Math.max(1, Math.round(input.maxAttempts ?? MAX_EMAIL_ATTEMPTS))
  if (!input.retryable || attempt >= maxAttempts) {
    return { status: 'dead_lettered', retryAfterSeconds: null }
  }
  return {
    status: 'failed',
    retryAfterSeconds: Math.min(3_600, 60 * (2 ** Math.min(10, attempt - 1))),
  }
}

export function isRetryableEmailFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true
  const value = error as { statusCode?: unknown; status?: unknown; name?: unknown }
  const status = Number(value.statusCode ?? value.status)
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return true
  if (status >= 400 && status < 500) return false
  return !['validation_error', 'invalid_parameter'].includes(String(value.name ?? '').toLowerCase())
}
