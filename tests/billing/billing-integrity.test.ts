import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  classifyWebhookClaimOutcome,
  deriveRefundStatus,
  isApplicationOwnedRefundMetadata,
  isInvoicePayable,
  toPositiveIntegerCents,
} from '../../lib/billing/integrity'

const read = (relativePath: string) => readFile(path.resolve(relativePath), 'utf8')

test('webhook claims acknowledge only completed events and retry every recoverable state', () => {
  assert.equal(classifyWebhookClaimOutcome('claimed'), 'process')
  assert.equal(classifyWebhookClaimOutcome('processed'), 'acknowledge')
  assert.equal(classifyWebhookClaimOutcome('in_progress'), 'retry_later')
  assert.equal(classifyWebhookClaimOutcome('failed'), 'fail_closed')
  assert.equal(classifyWebhookClaimOutcome('anything-else'), 'fail_closed')
})

test('refund state distinguishes no refund, partial refund, and full refund', () => {
  assert.equal(
    deriveRefundStatus({ amountCents: 10_000, amountRefundedCents: 0, fullyRefunded: false }),
    'succeeded',
  )
  assert.equal(
    deriveRefundStatus({ amountCents: 10_000, amountRefundedCents: 2_500, fullyRefunded: false }),
    'partially_refunded',
  )
  assert.equal(
    deriveRefundStatus({ amountCents: 10_000, amountRefundedCents: 10_000, fullyRefunded: true }),
    'refunded',
  )
  assert.equal(
    deriveRefundStatus({ amountCents: 10_000, amountRefundedCents: 50_000, fullyRefunded: false }),
    'refunded',
  )
  assert.equal(isApplicationOwnedRefundMetadata({ kind: 'academy' }), true)
  assert.equal(isApplicationOwnedRefundMetadata({ kind: 'service' }), true)
  assert.equal(isApplicationOwnedRefundMetadata({ kind: 'care' }), false)
  assert.equal(isApplicationOwnedRefundMetadata({}, { invoice_id: 'inv-local' }), true)
  assert.equal(isApplicationOwnedRefundMetadata({ kind: 'external' }, null), false)
})

test('invoice and money policy rejects draft/void/paid states and unsafe amounts', () => {
  for (const status of ['sent', 'open', 'overdue']) assert.equal(isInvoicePayable(status), true)
  for (const status of ['draft', 'void', 'paid', 'refunded', '', null]) {
    assert.equal(isInvoicePayable(status), false)
  }

  assert.equal(toPositiveIntegerCents(12.34), 1234)
  assert.equal(toPositiveIntegerCents('0.01'), 1)
  for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 'abc', 1_000_000_000]) {
    assert.equal(toPositiveIntegerCents(amount), null)
  }
})

test('canonical Stripe webhook verifies raw bytes, uses durable claims, and fails closed on persistence errors', async () => {
  const source = await read('app/api/stripe/webhook/route.ts')
  assert.ok(source.indexOf('await req.text()') < source.indexOf('constructEvent('))
  assert.doesNotMatch(source, /error:\s*`Invalid signature:\s*\$\{msg\}`/)
  assert.match(source, /\.rpc\(['"]claim_stripe_webhook_event['"]/)
  assert.match(source, /classifyWebhookClaimOutcome/)
  assert.match(source, /dispatchEvent\(sb,\s*event,\s*event\.id\)/)
  assert.match(source, /assertSupabaseSuccess/)
  assert.match(source, /record_stripe_payment_receipt/)
  assert.match(source, /partially_refunded/)
  assert.match(source, /academy_enrollments/)
  assert.match(source, /checkout_fulfillments/)
  assert.match(source, /checkout fulfillment refund update/)
  assert.match(source, /isApplicationOwnedRefundMetadata/)
  assert.match(source, /refunded_amount_cents/)
  assert.match(source, /invoice\.payments\?\.data/)
  assert.match(source, /subscription invoice .* has no payment intent/)
})

test('membership entitlement writes throw instead of silently acknowledging database failures', async () => {
  const source = await read('lib/academy/membership.ts')
  assert.match(source, /assertSupabaseSuccess/)
  assert.match(source, /academy membership upsert/)
  assert.match(source, /academy membership cancellation/)
})

test('Discord premium access fails closed when roles or persistence are unavailable', async () => {
  const premium = await read('lib/discord/premium.ts')
  const analytics = await read('lib/discord/analytics.ts')
  assert.match(premium, /if \(!premiumAssigned \|\| !academyAssigned\)/)
  assert.match(analytics, /Discord premium persistence failed/)
  const premiumUpdate = analytics.slice(
    analytics.indexOf('export async function updateDiscordPremium'),
    analytics.indexOf('export async function recordDiscordScheduledRun'),
  )
  assert.doesNotMatch(premiumUpdate, /catch\s*\(/)
})

test('checkout and subscription mutations enforce server-owned state and idempotent retry contracts', async () => {
  const publicCheckout = await read('app/api/checkout/route.ts')
  const checkoutReview = await read('app/checkout/[slug]/page.tsx')
  const academyProducts = await read('data/academy/products.ts')
  assert.match(publicCheckout, /headers\.get\(['"]idempotency-key['"]\)/)
  assert.match(publicCheckout, /billingIdempotencyKey/)
  assert.doesNotMatch(publicCheckout, /x-forwarded-for|x-real-ip|dayBucket/)
  assert.match(publicCheckout, /subscription_data[\s\S]{0,200}kind:\s*['"]care['"]/)
  assert.doesNotMatch(checkoutReview, /sessions\.create|x-forwarded-for|x-real-ip|dayBucket/)
  assert.match(checkoutReview, /CheckoutButton/)
  assert.match(checkoutReview, /CareCheckoutButton/)
  assert.match(publicCheckout, /rateLimit/)
  assert.match(publicCheckout, /isAcademyPaidEnrollmentEnabled/)
  assert.match(academyProducts, /ACADEMY_PAID_ENROLLMENT_ENABLED/)
  assert.match(academyProducts, /ACADEMY_CERTIFICATION_STATE\s*===\s*['"]certified['"]/)
  for (const client of [
    'components/studio/checkout-button.tsx',
    'components/studio/care-checkout-button.tsx',
    'components/academy/academy-checkout-button.tsx',
    'components/academy/join/JoinClient.tsx',
    'app/pricing/pricing-el.tsx',
  ]) {
    assert.match(await read(client), /['"]idempotency-key['"]:\s*crypto\.randomUUID\(\)/, client)
  }

  const invoiceCheckout = await read('app/api/stripe/checkout/route.ts')
  assert.match(invoiceCheckout, /isInvoicePayable/)
  assert.match(invoiceCheckout, /assertSupabaseSuccess/)
  assert.match(invoiceCheckout, /billingIdempotencyKey/)
  assert.match(invoiceCheckout, /stripe_checkout_session_id/)
  assert.doesNotMatch(invoiceCheckout, /\.from\(['"]invoice_line_items['"]\)/)
  assert.match(invoiceCheckout, /amount_due/)
  assert.doesNotMatch(invoiceCheckout, /\binvoice\.amount\b/)

  const createSubscription = await read('app/api/stripe/subscription/create/route.ts')
  assert.match(createSubscription, /idempotencyKey/)
  assert.match(createSubscription, /toPositiveIntegerCents/)
  assert.match(createSubscription, /currency[\s\S]*\^\[a-z\]\{3\}\$/)

  const cancelSubscription = await read('app/api/stripe/subscription/[id]/cancel/route.ts')
  assert.match(cancelSubscription, /\.from\(['"]stripe_subscriptions['"]\)/)
  assert.ok(
    cancelSubscription.indexOf(".from('stripe_subscriptions')")
      < cancelSubscription.indexOf('stripe.subscriptions.update'),
  )
  assert.match(cancelSubscription, /idempotencyKey/)
})

test('manual retry and dunning paths cannot report success after failed persistence', async () => {
  const retry = await read('app/api/admin/payments/[id]/retry/route.ts')
  assert.match(retry, /\.rpc\(['"]claim_stripe_webhook_event['"]/)
  assert.match(retry, /assertSupabaseSuccess/)

  const dunning = await read('app/api/cron/dunning/route.ts')
  assert.match(dunning, /assertSupabaseSuccess/)
  assert.match(dunning, /advance_invoice_dunning/)

  const markPaid = await read('app/api/admin/invoices/[id]/mark-paid/route.ts')
  assert.match(markPaid, /record_manual_invoice_payment/)
  assert.match(markPaid, /amount_due/)
})

test('invoice creation and presentation use the canonical schema and one transactional write', async () => {
  const createInvoice = await read('app/api/admin/invoices/route.ts')
  assert.match(createInvoice, /create_invoice_with_line_items/)
  assert.match(createInvoice, /assertSupabaseSuccess/)
  assert.doesNotMatch(createInvoice, /\.from\(['"]invoices['"]\)\s*\.insert\(/)

  for (const file of [
    'app/admin/invoices/page.tsx',
    'app/admin/invoices/[id]/page.tsx',
    'lib/email/orchestrator.ts',
  ]) {
    const source = await read(file)
    assert.match(source, /amount_due/, file)
    assert.doesNotMatch(source, /\binv(?:oice)?\.amount\b/, file)
  }

  const orchestrator = await read('lib/email/orchestrator.ts')
  const invoiceEmailSection = orchestrator.slice(
    orchestrator.indexOf('export async function notifyInvoiceSent'),
    orchestrator.indexOf('export async function notifyContractSentForSignature'),
  )
  for (const staleColumn of ['invoice_number', 'payment_url', 'receipt_url', 'pdf_url']) {
    assert.doesNotMatch(invoiceEmailSection, new RegExp(`\\b${staleColumn}\\b`), staleColumn)
  }
  assert.doesNotMatch(invoiceEmailSection, /isCents/)
})

test('billing migration provides a private claim state machine and idempotent refund-aware receipts', async () => {
  const migration = await read('supabase/migrations/0121_billing_integrity.sql')
  for (const required of [
    'claim_stripe_webhook_event',
    'security definer',
    "set search_path = ''",
    'revoke all',
    'service_role',
    'attempt_count',
    'last_attempt_at',
    'stripe_event_id',
    'partially_refunded',
    'record_manual_invoice_payment',
    'record_stripe_payment_receipt',
    'create_invoice_with_line_items',
    'advance_invoice_dunning',
    'refunded_amount_cents',
    'checkout_fulfillments',
    'enable row level security',
  ]) {
    assert.match(migration, new RegExp(required, 'i'), required)
  }
  assert.match(migration, /status\s*=\s*'processed'[\s\S]{0,300}return\s+'processed'/i)
  assert.match(migration, /status\s+in\s+\('failed',\s*'duplicate'\)/i)
})

test('billing contracts are part of the canonical local observer', async () => {
  const packageJson = JSON.parse(await read('package.json'))
  const core = await read('tools/project-program/core.mjs')
  const cli = await read('tools/project-program/cli.mjs')
  assert.equal(
    packageJson.scripts?.['test:billing'],
    'tsx --test tests/billing/billing-integrity.test.ts',
  )
  assert.equal(
    packageJson.scripts?.['test:billing:sql'],
    'node tools/billing/run-sql-integration.mjs',
  )
  assert.match(core, /npm run test:billing/)
  assert.match(core, /npm run test:billing:sql/)
  assert.match(cli, /id:\s*['"]billing-contract['"]/)
  assert.match(cli, /id:\s*['"]billing-sql-integration['"]/)
})
