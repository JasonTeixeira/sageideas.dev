import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.CRITICAL_JOURNEY_BASE_URL ?? 'http://127.0.0.1:4176'
const parsedBase = new URL(baseURL)
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedBase.hostname)) {
  throw new Error('Critical-journey browser proof is local-only and refuses a non-loopback base URL.')
}

const safeEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
)
for (const name of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'DISCORD_BOT_TOKEN',
  'CRON_SECRET',
]) safeEnvironment[name] = ''
safeEnvironment.NEXT_PUBLIC_SITE_URL = baseURL
safeEnvironment.NEXT_PUBLIC_APP_URL = baseURL

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'critical-user-journeys.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CRITICAL_JOURNEY_REUSE_BUILD === '1'
      ? 'PORT=4176 node scripts/serve-prod.mjs'
      : 'npm run build && PORT=4176 node scripts/serve-prod.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: safeEnvironment,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
