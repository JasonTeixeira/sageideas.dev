import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3042';
const target = new URL(baseURL);
const loopback = ['127.0.0.1', 'localhost', '::1'].includes(target.hostname);
if (!loopback && process.env.E2E_REMOTE_APPROVED !== '1') {
  throw new Error(
    'Remote E2E requires E2E_REMOTE_APPROVED=1 after explicit approval; the default target is local.',
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
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
