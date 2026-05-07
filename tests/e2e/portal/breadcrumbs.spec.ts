/**
 * Phase 2B PR-A — breadcrumbs coverage on portal detail routes.
 *
 * Asserts that each detail page renders <nav aria-label="Breadcrumb"> with the
 * expected crumb structure: `Dashboard / <Section> / <Detail>`.
 *
 * The detail row IDs are resolved at runtime via the service role so the
 * test stays valid even if seed IDs change.
 */

import { test, expect, setActiveOrgCookie, ACME_SLUG } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing SUPABASE env');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Resolve Acme by slug. After migration 0009 client1 belongs to two orgs;
// looking up by membership.limit(1) is non-deterministic and can mismatch
// the page's active org, causing detail pages to render an empty state
// (no breadcrumbs).
async function findAcmeOrgId(): Promise<string | null> {
  const sb = adminClient();
  const { data } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', ACME_SLUG)
    .maybeSingle();
  return data?.id ?? null;
}

test.describe('Phase 2B PR-A — breadcrumbs coverage', () => {
  test('Topbar nav has aria-label="Breadcrumb"', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    // Any portal page renders the Topbar; pick a stable one.
    await clientPage.goto('/portal/projects');
    await expect(clientPage.locator('nav[aria-label="Breadcrumb"]').first()).toBeVisible();
  });

  test('project detail: Dashboard / Projects / <title>', async ({ clientPage, baseURL }) => {
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org missing — seed not run');
    const sb = adminClient();
    const { data: eng } = await sb
      .from('engagements')
      .select('id, title')
      .eq('organization_id', orgId!)
      .limit(1)
      .maybeSingle();
    test.skip(!eng, 'no engagement to assert against');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/projects/${eng!.id}`);
    const nav = clientPage.locator('nav[aria-label="Breadcrumb"]').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
    // Last crumb is plain text — assert by full nav text.
    await expect(nav).toContainText(eng!.title);
  });

  test('invoice detail: Dashboard / Invoices / <number>', async ({ clientPage, baseURL }) => {
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org missing — seed not run');
    const sb = adminClient();
    const { data: inv } = await sb
      .from('invoices')
      .select('id, number')
      .eq('organization_id', orgId!)
      .limit(1)
      .maybeSingle();
    test.skip(!inv, 'no invoice to assert against');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/invoices/${inv!.id}`);
    const nav = clientPage.locator('nav[aria-label="Breadcrumb"]').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Invoices' })).toBeVisible();
    const last = inv!.number ?? inv!.id.slice(0, 8);
    await expect(nav).toContainText(last);
  });

  test('messages detail: Dashboard / Messages / <subject>', async ({ clientPage, baseURL }) => {
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org missing — seed not run');
    const sb = adminClient();
    const { data: eng } = await sb
      .from('engagements')
      .select('id, title')
      .eq('organization_id', orgId!)
      .limit(1)
      .maybeSingle();
    test.skip(!eng, 'no engagement for message thread');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/messages/${eng!.id}`);
    const nav = clientPage.locator('nav[aria-label="Breadcrumb"]').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Messages' })).toBeVisible();
    await expect(nav).toContainText(eng!.title);
  });

  test('document detail: Dashboard / Documents / <title>', async ({ clientPage, baseURL }) => {
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org missing — seed not run');
    const sb = adminClient();
    const { data: doc } = await sb
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId!)
      .in('status', ['shared', 'sent', 'signed', 'countersigned'])
      .limit(1)
      .maybeSingle();
    test.skip(!doc, 'no visible document for client1');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/documents/${doc!.id}`);
    const nav = clientPage.locator('nav[aria-label="Breadcrumb"]').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Documents' })).toBeVisible();
    await expect(nav).toContainText(doc!.title);
  });
});
