import { test, expect } from '../../fixtures/auth';

test.describe('Portal not-found (Phase 2A.9)', () => {
  test('unknown portal route renders portal 404 with chrome', async ({ clientPage }) => {
    const res = await clientPage.goto('/portal/does-not-exist-xyz', {
      waitUntil: 'domcontentloaded',
    });
    expect(res?.status()).toBe(404);
    // Portal chrome (sidebar Workspace heading) should still be visible.
    await expect(clientPage.getByText(/Page not found/i).first()).toBeVisible();
    await expect(clientPage.getByRole('link', { name: /go to dashboard/i })).toBeVisible();
  });
});
