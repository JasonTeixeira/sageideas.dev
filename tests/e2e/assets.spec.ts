import { test, expect } from '@playwright/test';

test.describe('Static assets', () => {
  test('/favicon.ico → 200', async ({ request }) => {
    const res = await request.get('/favicon.ico');
    expect(res.status()).toBeLessThan(400);
  });

  test('/robots.txt → 200 if exists, else 404 acceptable', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect([200, 404]).toContain(res.status());
  });

  test('/sitemap.xml → 200 if exists, else 404 acceptable', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect([200, 404]).toContain(res.status());
  });

  test('/manifest.webmanifest or /manifest → non-5xx', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBeLessThan(500);
  });
});
