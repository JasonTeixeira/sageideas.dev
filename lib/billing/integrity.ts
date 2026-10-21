import { createHash } from 'node:crypto'

const PAYABLE_INVOICE_STATUSES = new Set(['sent', 'open', 'overdue'])
const MAX_BILLING_AMOUNT_CENTS = 100_000_000

export type WebhookClaimAction = 'process' | 'acknowledge' | 'retry_later' | 'fail_closed'
export type RefundStatus = 'succeeded' | 'partially_refunded' | 'refunded'

export function classifyWebhookClaimOutcome(value: unknown): WebhookClaimAction {
  if (value === 'claimed') return 'process'
  if (value === 'processed') return 'acknowledge'
  if (value === 'in_progress') return 'retry_later'
  return 'fail_closed'
}

export function deriveRefundStatus(input: {
  amountCents: number
  amountRefundedCents: number
  fullyRefunded: boolean
}): RefundStatus {
  const amount = Number.isFinite(input.amountCents) ? Math.max(0, input.amountCents) : 0
  const refunded = Number.isFinite(input.amountRefundedCents)
    ? Math.max(0, input.amountRefundedCents)
    : 0
  if (input.fullyRefunded || (amount > 0 && refunded >= amount)) return 'refunded'
  if (refunded > 0) return 'partially_refunded'
  return 'succeeded'
}

export function isInvoicePayable(status: unknown): boolean {
  return typeof status === 'string' && PAYABLE_INVOICE_STATUSES.has(status)
}

export function isApplicationOwnedRefundMetadata(...values: unknown[]): boolean {
  return values.some((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const metadata = value as Record<string, unknown>
    return ['academy', 'service'].includes(String(metadata.kind ?? ''))
      || (typeof metadata.invoice_id === 'string' && metadata.invoice_id.length > 0)
  })
}

export function toPositiveIntegerCents(value: unknown): number | null {
  const dollars = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof dollars !== 'number' || !Number.isFinite(dollars) || dollars <= 0) return null
  const cents = Math.round(dollars * 100)
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_BILLING_AMOUNT_CENTS) return null
  return cents
}

export function billingIdempotencyKey(...parts: Array<string | number>): string {
  return createHash('sha256').update(parts.join(':')).digest('hex')
}

type SupabaseResult<T> = {
  data?: T | null
  error?: { message?: string } | null
}

export function assertSupabaseSuccess<T>(result: SupabaseResult<T>, operation: string): T | null {
  if (result.error) {
    throw new Error(`${operation} failed: ${result.error.message ?? 'database error'}`)
  }
  return result.data ?? null
}
