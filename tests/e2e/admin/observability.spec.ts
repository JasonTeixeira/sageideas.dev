/**
 * Phase 2F PR-B - admin observability dashboard.
 *
 * Admin loads /admin/observability, sees the SLO cards (LCP / INP /
 * error rate), the trend charts container, and either an "no errors"
 * placeholder or at least one error row. Also exercises the range tabs.
 */

import { test, expect } from '../../fixtures/auth';

test.describe('Phase 2F PR-B - admin observability', () => {
  test('admin sees SLO cards, charts, and error table', async ({
    adminPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — page only exists on the Vercel preview.',
    );

    await adminPage.goto('/admin/observability', {
      waitUntil: 'domcontentloaded',
    });
    await expect(adminPage.locator('[data-testid="admin-observability"]')).toBeVisible({
      timeout: 30_000,
    });

    await expect(adminPage.locator('[data-testid="slo-lcp"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="slo-inp"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="slo-error-rate"]')).toBeVisible();

    // Errors panel renders one of two known states.
    const noErrors = adminPage.locator('[data-testid="observability-no-errors"]');
    const errorRow = adminPage.locator('[data-testid="observability-error-row"]').first();
    const hasNoErrors = (await noErrors.count()) > 0;
    if (hasNoErrors) {
      await expect(noErrors).toBeVisible();
    } else {
      await expect(errorRow).toBeVisible();
    }

    // Range tabs work.
    await adminPage.goto('/admin/observability?range=7d', {
      waitUntil: 'domcontentloaded',
    });
    await expect(adminPage.locator('[data-testid="admin-observability"]')).toBeVisible();
  });

  test('SLO API returns booleans + samples count', async ({
    adminPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod.',
    );
    const resp = await adminPage.request.get('/api/telemetry/slo');
    expect(resp.ok()).toBeTruthy();
    const body = (await resp.json()) as {
      lcp_p75_ok: boolean;
      error_rate_ok: boolean;
      samples_1h: number;
    };
    expect(typeof body.lcp_p75_ok).toBe('boolean');
    expect(typeof body.error_rate_ok).toBe('boolean');
    expect(typeof body.samples_1h).toBe('number');
  });
});
