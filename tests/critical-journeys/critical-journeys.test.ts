import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  CRITICAL_JOURNEYS,
  auditCriticalJourneys,
  type CriticalJourney,
} from '../../lib/journeys/contract'
import { classifyCheckoutReturn } from '../../lib/journeys/checkout-return'
import { canonicalSiteOrigin } from '../../lib/security/site-origin'

const source = (relativePath: string) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

test('known-good journey contract passes and deliberately broken fixtures fail closed', () => {
  const good: CriticalJourney[] = [{
    id: 'good',
    audience: 'visitor',
    entry: '/',
    outcome: 'A recoverable local proof journey.',
    steps: [
      { id: 'land', route: '/', next: 'finish', proof: 'browser', mutation: 'none' },
      { id: 'finish', route: '/done', recovery: '/help', proof: 'browser', mutation: 'none' },
    ],
  }]
  assert.deepEqual(auditCriticalJourneys(good).findings, [])

  const broken: CriticalJourney[] = [{
    id: 'broken',
    audience: 'visitor',
    entry: '/',
    outcome: '',
    steps: [
      { id: 'duplicate', route: '/', next: 'missing', proof: 'none', mutation: 'external' },
      { id: 'duplicate', route: '/again', proof: 'browser', mutation: 'none' },
    ],
  }]
  const codes = auditCriticalJourneys(broken).findings.map((finding) => finding.code)
  assert.ok(codes.includes('journey_outcome_missing'))
  assert.ok(codes.includes('journey_step_duplicate'))
  assert.ok(codes.includes('journey_next_missing'))
  assert.ok(codes.includes('external_mutation_not_approval_bound'))
  assert.ok(codes.includes('journey_recovery_missing'))
  assert.ok(codes.includes('journey_proof_missing'))
})

test('canonical journeys cover acquisition, both signup paths, checkout, account gating, and recovery', () => {
  const ids = new Set(CRITICAL_JOURNEYS.map((journey) => journey.id))
  for (const required of [
    'marketing-to-studio-signup',
    'academy-signup',
    'service-checkout',
    'care-checkout',
    'checkout-return',
    'checkout-cancel',
    'account-gate',
  ]) assert.ok(ids.has(required), required)

  assert.deepEqual(auditCriticalJourneys(CRITICAL_JOURNEYS).findings, [])
})

test('studio signup keeps credentials out of URLs and browser history', async () => {
  const page = await source('app/signup/page.tsx')
  const wizard = await source('components/auth/studio-signup-wizard.tsx')

  assert.doesNotMatch(page, /password\?:\s*string/)
  assert.doesNotMatch(page, /encodeURIComponent\(password\)/)
  assert.doesNotMatch(wizard, /method=["']GET["']/)
  assert.doesNotMatch(wizard, /type=["']hidden["'][^>]+name=["']password["']/)
  assert.match(wizard, /useState/)
  assert.match(wizard, /action=\{signUpWithPassword\}/)
})

test('Academy signup uses the public confirmation flow and never service-role confirms users', async () => {
  const actions = await source('app/auth/actions.ts')
  const academySignup = actions.slice(
    actions.indexOf('export async function signUpAcademy'),
    actions.indexOf('export async function signOut'),
  )

  assert.match(academySignup, /supabase\.auth\.signUp/)
  assert.doesNotMatch(academySignup, /admin\.auth\.admin\.createUser/)
  assert.doesNotMatch(academySignup, /email_confirm\s*:\s*true/)
  assert.doesNotMatch(academySignup, /signInWithPassword/)
})

test('shareable checkout routes require an explicit browser action and cover care products', async () => {
  await assert.rejects(access('app/checkout/[slug]/route.ts'))
  const page = await source('app/checkout/[slug]/page.tsx')

  assert.match(page, /CheckoutButton/)
  assert.match(page, /CareCheckoutButton/)
  assert.match(page, /notFound|redirect/)
  assert.doesNotMatch(page, /sessions\.create/)
})

test('checkout completion claims depend on a durable server-owned fulfillment receipt', async () => {
  const page = await source('app/checkout/success/page.tsx')
  const state = await source('lib/journeys/checkout-return.ts')

  assert.match(page, /getCheckoutReturnState/)
  assert.match(page, /state\.status === ['"]confirmed['"]/)
  assert.match(page, /state\.status === ['"]confirmed['"][^]*CheckoutCompleteTracker/)
  assert.match(state, /checkout_fulfillments/)
  assert.match(state, /stripe_checkout_session_id/)
  assert.match(state, /metadata/)
})

test('checkout return policy rejects forged or mismatched receipts and preserves refund state', () => {
  const sessionId = 'cs_test_1234567890123456'
  assert.deepEqual(classifyCheckoutReturn('audit', sessionId, null), { status: 'pending', slug: 'audit' })
  assert.deepEqual(
    classifyCheckoutReturn('audit', sessionId, {
      kind: 'service',
      status: 'completed',
      metadata: { slug: 'audit' },
    }),
    { status: 'confirmed', slug: 'audit' },
  )
  assert.equal(classifyCheckoutReturn('audit', sessionId, {
    kind: 'care',
    status: 'completed',
    metadata: { tier_slug: 'site-care' },
  }).status, 'invalid')
  assert.equal(classifyCheckoutReturn('site-care', sessionId, {
    kind: 'care',
    status: 'refunded',
    metadata: { tier_slug: 'site-care' },
  }).status, 'refunded')
  assert.equal(classifyCheckoutReturn('audit', 'forged', null).status, 'invalid')
  assert.equal(classifyCheckoutReturn('unknown', sessionId, null).status, 'invalid')
})

test('the canonical local observer continuously runs journey contracts and browser proof', async () => {
  const packageJson = JSON.parse(await source('package.json')) as { scripts?: Record<string, string> }
  const cli = await source('tools/project-program/cli.mjs')

  assert.equal(
    packageJson.scripts?.['test:critical-journeys'],
    'tsx --test tests/critical-journeys/critical-journeys.test.ts',
  )
  assert.equal(
    packageJson.scripts?.['test:critical-journeys:e2e'],
    'playwright test --config=playwright.critical-journeys.config.ts',
  )
  assert.match(cli, /id:\s*['"]critical-journey-contract['"]/)
  assert.match(cli, /id:\s*['"]critical-journey-browser['"]/)
})

test('production callback origins never trust an attacker-controlled host header', () => {
  assert.equal(canonicalSiteOrigin({
    configured: undefined,
    forwardedHost: 'attacker.example',
    host: 'attacker.example',
    forwardedProto: 'https',
    production: true,
  }), 'https://www.sageideas.dev')
  assert.equal(canonicalSiteOrigin({
    configured: 'https://academy.sageideas.dev/path',
    forwardedHost: 'attacker.example',
    host: 'attacker.example',
    forwardedProto: 'http',
    production: true,
  }), 'https://academy.sageideas.dev')
  assert.equal(canonicalSiteOrigin({
    configured: undefined,
    forwardedHost: '127.0.0.1:4176',
    host: null,
    forwardedProto: 'http',
    production: false,
  }), 'http://127.0.0.1:4176')
})

test('portal catalog checkout returns to real portal routes and uses a request-scoped idempotency key', async () => {
  const route = await source('app/api/portal/checkout/route.ts')
  const catalog = await source('app/portal/catalog/page.tsx')

  assert.match(route, /\/portal\/billing\?success=1/)
  assert.match(route, /\/portal\/catalog\?canceled=1/)
  assert.match(route, /billingIdempotencyKey/)
  assert.match(route, /requestKey/)
  assert.match(catalog, /name=["']requestKey["']/)
  assert.doesNotMatch(route, /dayBucket/)
})

test('legacy Playwright entry points default local and live checkout requires an explicit mutation flag', async () => {
  const config = await source('playwright.e2e.config.ts')
  const checkout = await source('tests/e2e/checkout.spec.ts')

  assert.doesNotMatch(config, /\|\|\s*['"]https:\/\/www\.sageideas\.dev/)
  assert.match(config, /E2E_REMOTE_APPROVED/)
  assert.match(config, /127\.0\.0\.1/)
  assert.match(checkout, /RUN_LIVE_CHECKOUT/)
  assert.match(checkout, /idempotency-key/)
})
