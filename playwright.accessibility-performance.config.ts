import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.ACCESSIBILITY_PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:4177'
const target = new URL(baseURL)
if (!['127.0.0.1', 'localhost', '::1'].includes(target.hostname)) {
  throw new Error('Accessibility/performance browser proof is local-only and refuses a non-loopback base URL.')
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
  testDir: './tests/accessibility-performance',
  testMatch: 'accessibility-performance.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['./tools/accessibility-performance/playwright-reporter.ts'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: process.env.ACCESSIBILITY_PERFORMANCE_REUSE_BUILD === '1'
      ? 'PORT=4177 node scripts/serve-prod.mjs'
      : 'npm run build && PORT=4177 node scripts/serve-prod.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: safeEnvironment,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
