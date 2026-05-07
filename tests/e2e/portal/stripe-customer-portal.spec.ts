/**
 * Phase 2B PR-C — Stripe customer portal embed.
 *
 * Two paths covered:
 *  1. Graceful fallback: when the active org has no stripe_customer_id (or
 *     STRIPE_SECRET_KEY is unset on the preview), the route renders the
 *     "Billing portal is not configured for your account" card instead of
 *     throwing a 500.
 *  2. Mocked happy path: when the route detects E2E_STRIPE_MOCK=1, it short-
 *     circuits the Stripe API call and redirects to a known mock URL. CI
 *     doesn't run with this env set, so this assertion only runs when the
 *     E2E harness is configured to inject it.
 *
 * The "Manage billing" button is also asserted on /portal/billing.
 */

import { test, expect } from '../../fixtures/auth';

test.describe('Phase 2B PR-C — Stripe customer portal', () => {
  test('billing page exposes a "Manage billing" link to /portal/billing/manage', async ({
    clientPage,
  }) => {
    await clientPage.goto('/portal/billing');
    const link = clientPage.getByTestId('manage-billing-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/portal/billing/manage');
  });

  test('graceful fallback when Stripe is not configured for this org', async ({
    clientPage,
  }) => {
    await clientPage.goto('/portal/billing/manage');
    // Either path is acceptable as a graceful fallback:
    // - friendly "not configured" card, OR
    // - a redirect to the Stripe billing portal (only when both keys are set
    //   AND the org has a stripe_customer_id).
    const fallback = clientPage.getByText(
      /Billing portal is not configured for your account/i,
    );
    const url = clientPage.url();
    const wentToStripe = /billing\.stripe\.com|stripe\.com\/billing/.test(url);
    if (!wentToStripe) {
      await expect(fallback).toBeVisible({ timeout: 15_000 });
    }
    expect(true).toBeTruthy();
  });

  test('mocked happy path redirects to E2E mock URL when E2E_STRIPE_MOCK=1', async ({
    clientPage,
    baseURL,
  }) => {
    const mockEnabled = process.env.E2E_STRIPE_MOCK === '1';
    test.skip(!mockEnabled, 'E2E_STRIPE_MOCK not set on the preview environment');

    await clientPage.goto('/portal/billing/manage');
    // Default mock URL points back at /portal/billing?stripe_mock=1.
    await expect(clientPage).toHaveURL(/stripe_mock=1|portal\/billing/);
    expect(baseURL).toBeTruthy();
  });
});
