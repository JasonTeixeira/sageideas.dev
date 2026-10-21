import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\//, async (route) => {
    const hostname = new URL(route.request().url()).hostname
    if (['127.0.0.1', 'localhost', '::1'].includes(hostname)) await route.continue()
    else await route.abort('blockedbyclient')
  })
})

test('studio signup advances without putting the password in the URL', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Email').fill('novice@example.com')
  await page.getByLabel(/Password/).fill('correct-horse-battery-staple')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible()
  expect(page.url()).toBe('http://127.0.0.1:4176/signup')
  expect(page.url()).not.toContain('correct-horse')

  await page.getByLabel('Full name').fill('Novice Learner')
  await page.getByLabel('Client (hiring or commissioning work)').check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What brings you here?' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel(/Password/)).toHaveValue('correct-horse-battery-staple')
  expect(page.url()).not.toContain('password')
})

test('signup, login, and verification recovery pages render without external services', async ({ page }) => {
  await page.goto('/login?error=%25')
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Request access/ })).toBeVisible()

  await page.goto('/signup?error=%25')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

  await page.goto('/onboarding?email=novice%40example.com&audience=academy&error=%25')
  await expect(page.getByRole('heading', { name: /Check your inbox/ })).toBeVisible()
  await expect(page.getByText(/begin the Academy onboarding path/)).toBeVisible()
})

test('service checkout is review-first and recovers from unavailable checkout', async ({ page }) => {
  await page.route('**/api/checkout', async (route) => {
    const request = route.request()
    expect(request.method()).toBe('POST')
    expect(request.headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(request.postDataJSON()).toEqual({ slug: 'audit' })
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Checkout unavailable' }) })
  })
  await page.goto('/checkout/audit')
  await expect(page.getByRole('heading', { name: 'Sage Audit' })).toBeVisible()
  await page.getByRole('button', { name: /Continue securely/ }).click()
  await expect(page.getByText('Checkout unavailable', { exact: true })).toBeVisible()
})

test('care checkout is reachable and clearly discloses recurrence', async ({ page }) => {
  await page.goto('/checkout/site-care')
  await expect(page.getByRole('heading', { name: 'Site Care' })).toBeVisible()
  await expect(page.getByText(/Recurring monthly subscription/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Subscribe securely/ })).toBeVisible()
})

test('return and cancellation pages never infer payment from URL parameters', async ({ page }) => {
  await page.goto('/checkout/success?slug=audit&session_id=cs_test_1234567890123456')
  await expect(page.getByRole('heading', { name: 'We’re confirming your payment.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Payment confirmed.' })).toHaveCount(0)

  await page.goto('/checkout/success?slug=audit&session_id=forged')
  await expect(page.getByRole('heading', { name: /couldn’t verify/ })).toBeVisible()

  await page.goto('/checkout/cancel')
  await expect(page.getByRole('heading', { name: 'Checkout cancelled.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'View Pricing' })).toBeVisible()
})

test('private account data fails closed when auth is unavailable', async ({ page }) => {
  const response = await page.goto('/portal')
  expect(response?.status()).toBe(503)
  await expect(page.getByText('Authentication unavailable')).toBeVisible()
})
