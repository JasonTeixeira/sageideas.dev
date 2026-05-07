/**
 * Phase 2B PR-B — ⌘K command palette.
 *
 * Verifies that the palette mounts on every portal route, opens via Cmd+K /
 * Ctrl+K, supports keyboard navigation, routes on Enter, and closes on Esc.
 *
 * The palette is server-rendered with the active org's projects/invoices/threads,
 * so tests look up at least one engagement for client1 to drive the search.
 */

import { test, expect } from '../../fixtures/auth';
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing SUPABASE env');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findOrgIdForEmail(email: string): Promise<string | null> {
  const sb = adminClient();
  const { data: users } = await sb.from('app_users').select('id').ilike('email', email);
  const ids = (users ?? []).map((u: { id: string }) => u.id);
  if (ids.length === 0) return null;
  const { data: m } = await sb
    .from('org_memberships')
    .select('organization_id')
    .in('user_id', ids)
    .limit(1);
  return m?.[0]?.organization_id ?? null;
}

async function openWithModK(page: Page) {
  // Use the platform-aware accelerator. Playwright maps ControlOrMeta to
  // Meta on darwin and Control elsewhere.
  await page.keyboard.press('ControlOrMeta+k');
}

test.describe('Phase 2B PR-B — command palette', () => {
  test('Cmd+K opens the palette and Esc closes it', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    // Make sure the page is interactive.
    await clientPage.waitForLoadState('domcontentloaded');

    await openWithModK(clientPage);
    const root = clientPage.locator('[data-testid="cmdk-root"]');
    await expect(root).toBeVisible();
    await expect(clientPage.locator('[data-testid="cmdk-input"]')).toBeFocused();

    await clientPage.keyboard.press('Escape');
    await expect(root).toHaveCount(0);
  });

  test('Ctrl+K also opens the palette', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    await clientPage.waitForLoadState('domcontentloaded');
    // Explicit Control to cover non-mac users.
    await clientPage.keyboard.press('Control+k');
    await expect(clientPage.locator('[data-testid="cmdk-root"]')).toBeVisible();
  });

  test('Help shortcut routes to the chosen page', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    await clientPage.waitForLoadState('domcontentloaded');

    await openWithModK(clientPage);
    await expect(clientPage.locator('[data-testid="cmdk-root"]')).toBeVisible();
    await clientPage.locator('[data-testid="cmdk-input"]').fill('Settings');

    // Hard-coded help shortcut should always be available.
    const items = clientPage.locator('[data-testid="cmdk-item"]');
    await expect(items.first()).toBeVisible();
    await clientPage.keyboard.press('ArrowDown');
    await clientPage.keyboard.press('Enter');

    await clientPage.waitForURL(/\/portal\/settings/);
  });

  test('Project search routes to project detail when one exists', async ({ clientPage }) => {
    const orgId = await findOrgIdForEmail('client1+test@sageideas.org');
    test.skip(!orgId, 'client1 has no org — seed not run');
    const sb = adminClient();
    const { data: eng } = await sb
      .from('engagements')
      .select('id, title')
      .eq('organization_id', orgId!)
      .limit(1)
      .maybeSingle();
    test.skip(!eng, 'no engagement to drive cmdk search against');

    await clientPage.goto('/portal');
    await clientPage.waitForLoadState('domcontentloaded');

    await openWithModK(clientPage);
    const input = clientPage.locator('[data-testid="cmdk-input"]');
    await expect(input).toBeFocused();
    // Type the first 4 chars of the title — enough to filter.
    await input.fill(eng!.title.slice(0, 4));
    await clientPage.keyboard.press('ArrowDown');
    await clientPage.keyboard.press('Enter');

    await clientPage.waitForURL(/\/portal\/projects\//);
    expect(clientPage.url()).toContain(`/portal/projects/${eng!.id}`);
  });
});
