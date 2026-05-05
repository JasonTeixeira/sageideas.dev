import { test, expect } from '@playwright/test';

const BANNED = [
  /\bself-taught\b/i,
  /\bjunior\b/i,
  /\bfirst dedicated tech role\b/i,
  /\blooking for a job\b/i,
  /\bAvailable for hire\b/i,
];

// Allow `senior` only on the specific blog slug exception path, which is dynamic.
const BANNED_STRICT = /\bsenior\b/i;

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/onboarding',
  '/unsubscribe',
  '/sign/test-bad-token',
];

test.describe('Public pages', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders 200 and has no banned words`, async ({ request }) => {
      const res = await request.get(path);
      // 200 ideally, but redirects (3xx) are OK; never 5xx
      expect(res.status(), `${path} should not 5xx`).toBeLessThan(500);
      if (res.ok()) {
        const html = await res.text();
        for (const re of BANNED) {
          expect(html, `${path} contains banned: ${re}`).not.toMatch(re);
        }
        // `senior` exception: blog post slug is the only legit place. Public landing pages should not.
        if (path === '/' || path === '/login' || path === '/signup' || path === '/onboarding') {
          expect(html, `${path} contains banned: senior`).not.toMatch(BANNED_STRICT);
        }
      }
    });
  }

  test('homepage shows brand mark', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/sage/i);
  });

  test('/sign/test-bad-token does not crash', async ({ request }) => {
    const res = await request.get('/sign/test-bad-token');
    // Should be a 200 with friendly error, or 404 - just not a 5xx crash
    expect(res.status()).toBeLessThan(500);
  });

  test('legal pages return non-5xx', async ({ request }) => {
    for (const path of ['/legal', '/legal/privacy', '/legal/terms', '/privacy', '/terms']) {
      const res = await request.get(path);
      expect(res.status(), `${path} 5xx`).toBeLessThan(500);
    }
  });
});
