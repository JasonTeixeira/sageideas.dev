import { test, expect } from '@playwright/test';

// Guard live-checkout tests behind Stripe key presence.
// When STRIPE_SECRET_KEY is absent (local dev without env), skip the
// happy-path test so CI doesn't fail on missing credentials.
const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;
const LIVE_CHECKOUT_ALLOWED = STRIPE_CONFIGURED && process.env.RUN_LIVE_CHECKOUT === '1';

const requestHeaders = () => ({
  'content-type': 'application/json',
  'idempotency-key': crypto.randomUUID(),
});

test.describe('Checkout flow', () => {
  test(
    'low-ticket service /services/audit checkout button POSTs and returns a Stripe URL',
    async ({ request }) => {
      test.skip(!LIVE_CHECKOUT_ALLOWED, 'Live checkout requires STRIPE_SECRET_KEY and RUN_LIVE_CHECKOUT=1');

      const res = await request.post('/api/checkout', {
        data: { slug: 'audit' },
        headers: requestHeaders(),
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    },
  );

  test('high-ticket /services/build exposes no self-serve checkout — shows a book/apply CTA instead', async ({
    page,
  }) => {
    // This test always runs — it verifies the UI gate without any Stripe call.
    const res = await page.goto('/services/build');
    // Page must be reachable (2xx or 3xx, never 5xx)
    expect(res?.status() ?? 200).toBeLessThan(500);

    // No Stripe checkout button should be present for the build tier.
    // The page must instead show a consultation/book/apply/contact link.
    const checkoutButton = page.locator('button', { hasText: /buy|checkout|pay now/i });
    await expect(checkoutButton).toHaveCount(0);

    // A book/contact/apply link must be present.
    const consultLink = page.locator('a[href*="book"], a[href*="contact"], a[href*="apply"]');
    await expect(consultLink.first()).toBeVisible();
  });

  test('non-self-serve slug (build) via API returns 400 with consultation message', async ({ request }) => {
    // This always runs without Stripe — slug resolution + self-serve gate happens
    // before the isStripeConfigured() 503 check.
    const res = await request.post('/api/checkout', {
      data: { slug: 'build' },
      headers: requestHeaders(),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error).toMatch(/consultation/i);
  });

  test('unknown slug via API returns 400 (even without Stripe configured)', async ({ request }) => {
    // Slug resolution runs before Stripe check, so unknown slugs always return 400.
    const res = await request.post('/api/checkout', {
      data: { slug: 'does-not-exist' },
      headers: requestHeaders(),
    });
    expect(res.status()).toBe(400);
  });

  test('academy checkout is recognized but gated until Stripe price IDs are configured', async ({
    request,
  }) => {
    test.skip(STRIPE_CONFIGURED && !LIVE_CHECKOUT_ALLOWED, 'Configured Stripe checkout requires RUN_LIVE_CHECKOUT=1');
    const res = await request.post('/api/checkout', {
      data: { kind: 'academy', slug: 'ai-native-product-building' },
      headers: requestHeaders(),
    });
    expect([200, 409, 503]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    } else if (res.status() === 503) {
      expect(body.error).toMatch(/unavailable/i);
    } else {
      expect(body.error).toMatch(/not live|early access/i);
    }
  });

  test('care slug (site-care) is recognized as a valid checkout path — returns 503 when Stripe unconfigured, not 400', async ({
    request,
  }) => {
    // This always runs without Stripe. It proves the care slug gets past slug
    // resolution (i.e., it is NOT rejected as an unknown/consultation slug)
    // and only fails because Stripe env is absent (503), not because the slug
    // is rejected (400). With real Stripe it would return 200 + a session URL.
    test.skip(STRIPE_CONFIGURED, 'Stripe is configured — this no-credentials contract is not applicable');

    const res = await request.post('/api/checkout', {
      data: { slug: 'site-care' },
      headers: requestHeaders(),
    });
    // 503 = slug recognized, Stripe unconfigured (correct).
    // 400 = slug rejected as unknown/consultation (regression).
    expect(res.status()).toBe(503);
  });

  test(
    'care slug (site-care) returns a Stripe subscription checkout URL when Stripe is configured',
    async ({ request }) => {
      test.skip(!LIVE_CHECKOUT_ALLOWED, 'Live checkout requires STRIPE_SECRET_KEY and RUN_LIVE_CHECKOUT=1');

      const res = await request.post('/api/checkout', {
        data: { slug: 'site-care' },
        headers: requestHeaders(),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    },
  );
});
