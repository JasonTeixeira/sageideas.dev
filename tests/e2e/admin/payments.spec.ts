/**
 * Phase 2G PR-2 - admin payments dashboard.
 *
 * Admin can load /admin/payments, see the events list (or the empty
 * state), and exercise the status filter. Non-admin (client1) is
 * redirected away.
 */

import { test, expect } from '../../fixtures/auth';

test.describe('Phase 2G PR-2 - admin payments', () => {
  test('admin sees the payments dashboard with filter tabs', async ({
    adminPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — page only exists on the Vercel preview.',
    );

    await adminPage.goto('/admin/payments', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.locator('[data-testid="admin-payments"]')).toBeVisible({
      timeout: 30_000,
    });

    // Filter tabs render.
    await expect(adminPage.locator('[data-testid="payments-filter-all"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="payments-filter-failed"]')).toBeVisible();

    // Either we see at least one event row or the empty state — both valid.
    const eventRow = adminPage.locator('[data-testid="payments-event-row"]').first();
    const noEvents = adminPage.locator('[data-testid="payments-no-events"]');
    const hasRows = (await eventRow.count()) > 0;
    if (hasRows) {
      await expect(eventRow).toBeVisible();
    } else {
      await expect(noEvents).toBeVisible();
    }

    // Filter switches URL.
    await adminPage.locator('[data-testid="payments-filter-failed"]').click();
    await expect(adminPage).toHaveURL(/\/admin\/payments\?status=failed$/);
    await expect(adminPage.locator('[data-testid="admin-payments"]')).toBeVisible();
  });

  test('non-admin is redirected away from /admin/payments', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod.',
    );
    await clientPage.goto('/admin/payments', { waitUntil: 'domcontentloaded' });
    // requireAdmin() redirects non-admins to /portal/home (which then redirects
    // to /portal). Either way, they should not be on /admin/payments.
    await expect(clientPage).not.toHaveURL(/\/admin\/payments/);
  });

  test('retry endpoint is admin-gated', async ({ clientPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod.',
    );
    const resp = await clientPage.request.post(
      '/api/admin/payments/evt_does_not_exist/retry',
    );
    expect([401, 403]).toContain(resp.status());
  });
});
