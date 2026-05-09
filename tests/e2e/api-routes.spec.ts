import { test, expect } from '@playwright/test';

test.describe('API routes', () => {
  test('GET /api/notifications without auth → 401', async ({ request }) => {
    const start = Date.now();
    const res = await request.get('/api/notifications');
    expect(Date.now() - start).toBeLessThan(3000);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/stripe/webhook → 405 (POST-only)', async ({ request }) => {
    const res = await request.get('/api/stripe/webhook');
    expect([405, 400]).toContain(res.status());
  });

  test('GET /api/email/webhook → 405 (POST-only)', async ({ request }) => {
    const res = await request.get('/api/email/webhook');
    expect([405, 400]).toContain(res.status());
  });

  test('POST /api/welcome-email with bad body → 4xx (not 500)', async ({ request }) => {
    const res = await request.post('/api/welcome-email', {
      data: { invalid: 'payload' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/welcome-email with no body → 4xx', async ({ request }) => {
    const res = await request.post('/api/welcome-email', {
      data: '',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/contracts/:id/pdf without auth → 401/404 (not 500)', async ({ request }) => {
    const res = await request.get('/api/contracts/00000000-0000-0000-0000-000000000000/pdf');
    expect(res.status()).toBeLessThan(500);
    expect([401, 403, 404]).toContain(res.status());
  });

  // Legacy /api/sign route was deleted in Phase 2F; the page-side 404
  // assertion lives in public-pages.spec.ts and proposals-list.spec.ts —
  // a duplicate API-side check is brittle (Next's response status for
  // unmapped POSTs varies between dev/preview/prod) without adding signal.

  test('all sampled API endpoints respond within 3s', async ({ request }) => {
    const endpoints = [
      '/api/notifications',
      '/api/stripe/webhook',
      '/api/email/webhook',
    ];
    for (const ep of endpoints) {
      const start = Date.now();
      await request.get(ep);
      expect(Date.now() - start, `${ep} too slow`).toBeLessThan(3000);
    }
  });
});
