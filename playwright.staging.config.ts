import { defineConfig, devices } from '@playwright/test'

import { validateStagingPreviewTarget } from './lib/staging/preview-target.mjs'

const baseURL = validateStagingPreviewTarget(process.env.STAGING_BASE_URL ?? '').origin
if (!process.env.STAGING_BYPASS_SECRET?.trim()) {
  throw new Error('STAGING_BYPASS_SECRET is required for protected staging browser proof.')
}
if (!/^dpl_[A-Za-z0-9]+$/.test(process.env.STAGING_DEPLOYMENT_ID ?? '')) {
  throw new Error('STAGING_DEPLOYMENT_ID is required for identity-bound staging browser proof.')
}
if (!/^[a-f0-9]{40}$/.test(process.env.STAGING_EXPECTED_COMMIT ?? '')) {
  throw new Error('STAGING_EXPECTED_COMMIT must be a full lowercase Git SHA.')
}
if (!process.env.STAGING_EXPECTED_BRANCH?.trim()) {
  throw new Error('STAGING_EXPECTED_BRANCH is required for identity-bound staging browser proof.')
}

export default defineConfig({
  testDir: './tests/accessibility-performance',
  testMatch: 'accessibility-performance.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['./tools/staging/playwright-reporter.ts']],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'staging-mobile-chromium', use: { ...devices['Desktop Chrome'] } }],
})
