import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('login page renders with email + magic-link + 3 OAuth buttons', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    // Magic link / email submit button present
    const submitButtons = page.locator('button[type="submit"]');
    expect(await submitButtons.count()).toBeGreaterThanOrEqual(1);
    // OAuth: Google, GitHub, LinkedIn
    await expect(page.getByText(/Continue with Google/i)).toBeVisible();
    await expect(page.getByText(/Continue with GitHub/i)).toBeVisible();
    await expect(page.getByText(/Continue with LinkedIn/i)).toBeVisible();
  });

  test('signup wizard does not accept query-driven steps', async ({ page }) => {
    await page.goto('/signup');
    expect(page.url()).toContain('/signup');
    // Query parameters cannot hydrate later steps because credentials must never
    // move through the URL or browser history.
    const res2 = await page.goto('/signup?step=2');
    expect(res2?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('signup may safely prefill email without advancing the wizard', async ({ page }) => {
    const res = await page.goto('/signup?email=test%40example.com');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByLabel('Email')).toHaveValue('test@example.com');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('onboarding page shows check-inbox copy', async ({ page }) => {
    const res = await page.goto('/onboarding');
    expect(res?.status()).toBeLessThan(400);
    // Should reference inbox / email / check
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/inbox|check.*email|verify|magic/);
  });

  test('unauth /portal redirects to /login?next=%2Fportal', async ({ page }) => {
    const res = await page.goto('/portal', { waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/\/login\?.*next=%2Fportal/);
    expect(res?.status()).toBeLessThan(400);
  });

  test('unauth /admin redirects to /login?next=%2Fadmin', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/\/login\?.*next=%2Fadmin/);
  });

  test('unauth /portal/projects/anything redirects', async ({ page }) => {
    await page.goto('/portal/projects/anything', { waitUntil: 'domcontentloaded' });
    expect(page.url()).toMatch(/\/login/);
  });
});
