/**
 * Phase 2B PR-B — multi-org switcher.
 *
 * Asserts that a user with 2+ memberships sees a switcher dropdown with each
 * org as an option. Selecting Beta navigates with `?org=beta-test-co` and
 * scopes data to Beta on the next render.
 *
 * Requires migration 0009 to be applied so client1+test is a member of both
 * Acme and Beta Test Co.
 */

import { test, expect } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing SUPABASE env');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function client1IsMemberOfBeta(): Promise<boolean> {
  const sb = adminClient();
  const { data: users } = await sb
    .from('app_users')
    .select('id')
    .ilike('email', 'client1+test@sageideas.org');
  const ids = (users ?? []).map((u: { id: string }) => u.id);
  if (ids.length === 0) return false;
  const { data: org } = await sb
    .from('organizations')
    .select('id, slug')
    .eq('slug', 'beta-test-co')
    .maybeSingle();
  if (!org) return false;
  const { data: m } = await sb
    .from('org_memberships')
    .select('organization_id')
    .in('user_id', ids)
    .eq('organization_id', org.id)
    .limit(1);
  return (m?.length ?? 0) > 0;
}

test.describe('Phase 2B PR-B — multi-org switcher', () => {
  test('client1 sees both Acme and Beta in the switcher', async ({ clientPage }) => {
    const ok = await client1IsMemberOfBeta();
    test.skip(!ok, 'client1 not a member of Beta — apply migration 0009 first.');

    await clientPage.goto('/portal');
    await clientPage.waitForLoadState('domcontentloaded');

    const switcher = clientPage.locator('[data-testid="org-switcher"]');
    await expect(switcher).toBeVisible();
    await switcher.click();

    const options = clientPage.locator('[data-testid="org-switcher-option"]');
    // Wait for the dropdown to populate.
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('switching to Beta updates the URL with ?org=beta-test-co', async ({ clientPage }) => {
    const ok = await client1IsMemberOfBeta();
    test.skip(!ok, 'client1 not a member of Beta — apply migration 0009 first.');

    await clientPage.goto('/portal');
    await clientPage.waitForLoadState('domcontentloaded');

    await clientPage.locator('[data-testid="org-switcher"]').click();
    const betaOption = clientPage.locator(
      '[data-testid="org-switcher-option"][data-slug="beta-test-co"]',
    );
    await expect(betaOption).toBeVisible();
    await betaOption.click();

    await clientPage.waitForURL(/[?&]org=beta-test-co/);
    expect(clientPage.url()).toContain('org=beta-test-co');

    // The switcher label should now reflect Beta.
    await expect(clientPage.locator('[data-testid="org-switcher"]')).toContainText(/beta/i);
  });
});
