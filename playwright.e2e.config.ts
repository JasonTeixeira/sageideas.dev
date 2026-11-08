import { defineConfig, devices } from '@playwright/test';

// These suites seed and mutate records. Never default to the live business site.
const baseURL = process.env.PW_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3040';
const target = new URL(baseURL);
const hostname = target.hostname.toLowerCase().replace(/\.$/, '');
if (['sageideas.dev', 'www.sageideas.dev', 'agency.sageideas.dev'].includes(hostname)) {
  throw new Error('E2E tests cannot target production. Use a local/staging server with isolated test database and email credentials.');
}
if (!['http:', 'https:'].includes(target.protocol)) {
  throw new Error('E2E target must use HTTP or HTTPS.');
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
