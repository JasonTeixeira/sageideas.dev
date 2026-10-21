import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { safeRelativeRedirect } from '../../lib/security/safe-redirect'
import { canonicalSiteOrigin } from '../../lib/security/site-origin'
import { isFreshWebhookTimestamp } from '../../lib/security/webhook-freshness'

const source = (relativePath: string) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

async function routeFiles(relativeDirectory: string): Promise<string[]> {
  const root = path.resolve(relativeDirectory)
  const found: string[] = []
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(full)
      if (entry.isFile() && entry.name === 'route.ts') found.push(path.relative(process.cwd(), full))
    }
  }
  await walk(root)
  return found.sort()
}

test('signed webhook timestamps accept current Unix seconds and reject replay or excessive skew', () => {
  const nowMs = Date.parse('2026-09-04T12:00:00.000Z')

  assert.equal(isFreshWebhookTimestamp(String(nowMs / 1000), nowMs), true)
  assert.equal(isFreshWebhookTimestamp(String(nowMs / 1000 - 300), nowMs), true)
  assert.equal(isFreshWebhookTimestamp(String(nowMs / 1000 - 301), nowMs), false)
  assert.equal(isFreshWebhookTimestamp(String(nowMs / 1000 + 60), nowMs), true)
  assert.equal(isFreshWebhookTimestamp(String(nowMs / 1000 + 61), nowMs), false)
  assert.equal(isFreshWebhookTimestamp('not-a-timestamp', nowMs), false)
  assert.equal(isFreshWebhookTimestamp('', nowMs), false)
})

test('post-auth redirects remain same-origin and reject protocol-relative or malformed input', () => {
  assert.equal(safeRelativeRedirect('/admin?tab=users#pending'), '/admin?tab=users#pending')
  assert.equal(safeRelativeRedirect('//attacker.example', '/admin'), '/admin')
  assert.equal(safeRelativeRedirect('/\\attacker.example', '/admin'), '/admin')
  assert.equal(safeRelativeRedirect('https://attacker.example', '/admin'), '/admin')
  assert.equal(safeRelativeRedirect('javascript:alert(1)', '/admin'), '/admin')
  assert.equal(safeRelativeRedirect('/admin\nset-cookie: bad', '/admin'), '/admin')
  assert.equal(safeRelativeRedirect(null, '/admin'), '/admin')
})

test('every post-auth entry point uses the shared redirect policy', async () => {
  for (const relativePath of [
    'app/auth/actions.ts',
    'app/auth/callback/route.ts',
    'app/auth/mfa/page.tsx',
  ]) {
    assert.match(await source(relativePath), /safeRelativeRedirect\(/, relativePath)
  }
})

test('portal authorization derives admin privilege only from the canonical profile role', async () => {
  const portalAuth = await source('lib/portal/auth.ts')

  assert.doesNotMatch(portalAuth, /ADMIN_EMAILS/)
  assert.match(portalAuth, /profile\.app_role === ['"]admin['"]/)
})

test('the Supabase email hook rejects stale signed requests before processing payloads', async () => {
  const emailHook = await source('app/api/auth/email-hook/route.ts')

  assert.match(emailHook, /isFreshWebhookTimestamp\(ts\)/)
  assert.match(emailHook, /stale_webhook_timestamp/)
  assert.ok(
    emailHook.indexOf('isFreshWebhookTimestamp(ts)') < emailHook.indexOf('verify({ id, ts, body, sigHeader, secret })'),
    'freshness must be checked before signature verification and side effects',
  )
})

test('internal SLO data requires the canonical admin guard', async () => {
  const slo = await source('app/api/telemetry/slo/route.ts')

  assert.match(slo, /requireAdminApi/)
  assert.match(slo, /guard instanceof NextResponse/)
})

test('every admin API route uses the canonical admin guard', async () => {
  const routes = await routeFiles('app/api/admin')
  assert.ok(routes.length > 0)
  for (const relativePath of routes) {
    assert.match(await source(relativePath), /requireAdminApi\(/, relativePath)
  }
})

test('every private portal API route derives a server-verified user', async () => {
  const routes = (await routeFiles('app/api/portal')).filter(
    (relativePath) => relativePath !== 'app/api/portal/health/route.ts',
  )
  assert.ok(routes.length > 0)
  for (const relativePath of routes) {
    assert.match(
      await source(relativePath),
      /(?:getPortalContext\(|auth\.getUser\()/,
      relativePath,
    )
  }
})

test('every cron route fails closed on a secret or delegates to a guarded route', async () => {
  const routes = await routeFiles('app/api/cron')
  assert.ok(routes.length > 0)
  for (const relativePath of routes) {
    assert.match(
      await source(relativePath),
      /(?:CRON_SECRET|import\s+\{\s*GET\s+as\s+\w+\s*\}\s+from\s+['"][^'"]*route['"])/,
      relativePath,
    )
  }
})

test('public service-role ingestion is schema bounded and rate limited', async () => {
  for (const relativePath of [
    'app/api/academy/waitlist/route.ts',
    'app/api/telemetry/perf/route.ts',
    'app/api/telemetry/error/route.ts',
  ]) {
    const route = await source(relativePath)
    assert.match(route, /rateLimit\(/, `${relativePath} must call the shared rate limiter`)
  }

  const waitlist = await source('app/api/academy/waitlist/route.ts')
  const perf = await source('app/api/telemetry/perf/route.ts')
  const error = await source('app/api/telemetry/error/route.ts')
  assert.match(waitlist, /EMAIL_RE\.test/)
  assert.match(perf, /schema\.safeParse/)
  assert.match(error, /schema\.safeParse/)
})

test('academy billing portal fails closed before constructing unavailable provider clients', async () => {
  const billingPortal = await source('app/api/academy/billing/portal/route.ts')

  assert.match(billingPortal, /isSupabasePublicConfigured\(\)/)
  assert.match(billingPortal, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.ok(
    billingPortal.indexOf('isSupabasePublicConfigured()') <
      billingPortal.indexOf('createSupabaseServerClient()'),
    'public Supabase readiness must be checked before constructing the auth client',
  )
  assert.ok(
    billingPortal.indexOf('SUPABASE_SERVICE_ROLE_KEY') < billingPortal.indexOf('supabaseAdmin()'),
    'service-role readiness must be checked before constructing the admin client',
  )
})

test('public portal health is minimal and does not expose environment or database detail', async () => {
  const health = await source('app/api/portal/health/route.ts')

  assert.doesNotMatch(health, /\benv\s*:/)
  assert.doesNotMatch(health, /\bdb\s*:/)
  assert.doesNotMatch(health, /error:\s*['"]Something went wrong/)
  assert.match(health, /status:\s*503/)
})

test('the production program continuously runs the security boundary contract', async () => {
  const packageJson = JSON.parse(await source('package.json')) as { scripts?: Record<string, string> }
  const programCore = await source('tools/project-program/core.mjs')
  const programCli = await source('tools/project-program/cli.mjs')

  assert.equal(packageJson.scripts?.['test:security'], 'tsx --test tests/security/application-boundaries.test.ts')
  assert.match(programCore, /npm run test:security/)
  assert.match(programCli, /id:\s*['"]security-contract['"]/)
})

test('production defaults to enforced CSP and mandatory admin MFA', async () => {
  const nextConfig = await source('next.config.ts')
  const middleware = await source('lib/supabase/middleware.ts')
  const adminGuard = await source('lib/admin-guard.ts')
  const portalAuth = await source('lib/portal/auth.ts')

  assert.match(nextConfig, /process\.env\.NODE_ENV\s*===\s*['"]production['"]\s*\|\|\s*process\.env\.CSP_ENFORCE/)
  assert.match(middleware, /process\.env\.NODE_ENV\s*===\s*['"]production['"]\s*\|\|\s*process\.env\.MFA_REQUIRED_FOR_ADMIN/)
  assert.match(adminGuard, /getAuthenticatorAssuranceLevel/)
  assert.match(adminGuard, /currentLevel\s*!==\s*['"]aal2['"]/)
  assert.match(adminGuard, /mfa_required/)
  assert.match(adminGuard, /authentication_unavailable/)
  assert.match(adminGuard, /status:\s*503/)
  assert.match(portalAuth, /getAuthenticatorAssuranceLevel/)
  assert.match(portalAuth, /currentLevel\s*!==\s*['"]aal2['"]/)
})

test('production callback origins ignore request-controlled host headers', () => {
  assert.equal(canonicalSiteOrigin({
    configured: undefined,
    forwardedHost: 'attacker.example',
    host: 'attacker.example',
    forwardedProto: 'https',
    production: true,
  }), 'https://www.sageideas.dev')
  assert.equal(canonicalSiteOrigin({
    configured: 'https://portal.sageideas.dev/callback',
    forwardedHost: 'attacker.example',
    host: 'attacker.example',
    forwardedProto: 'http',
    production: true,
  }), 'https://portal.sageideas.dev')
})

test('public signup never transports passwords in URLs or service-role confirms Academy users', async () => {
  const signupPage = await source('app/signup/page.tsx')
  const signupWizard = await source('components/auth/studio-signup-wizard.tsx')
  const actions = await source('app/auth/actions.ts')
  const academyAction = actions.slice(
    actions.indexOf('export async function signUpAcademy'),
    actions.indexOf('export async function signOut'),
  )

  assert.doesNotMatch(signupPage, /password\?:\s*string|encodeURIComponent\(password\)/)
  assert.doesNotMatch(signupWizard, /method=["']GET["']/)
  assert.match(academyAction, /supabase\.auth\.signUp/)
  assert.doesNotMatch(academyAction, /auth\.admin\.createUser|email_confirm\s*:\s*true/)
})
