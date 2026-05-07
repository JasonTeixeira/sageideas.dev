/**
 * Phase 2B PR-A — portal audit log viewer.
 *
 * Inserts a synthetic audit_log row for client1's org via the service role,
 * then asserts the row renders on /portal/settings/audit-log.
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

async function findOrgIdForEmail(email: string): Promise<string | null> {
  const sb = adminClient();
  const { data: users } = await sb
    .from('app_users')
    .select('id')
    .ilike('email', email);
  const ids = (users ?? []).map((u: { id: string }) => u.id);
  if (ids.length === 0) return null;
  const { data: m } = await sb
    .from('org_memberships')
    .select('organization_id')
    .in('user_id', ids)
    .limit(1);
  return m?.[0]?.organization_id ?? null;
}

const SYNTH_ACTION = 'phase2b_pra_e2e';
let insertedRowId: string | null = null;
let insertedOrgId: string | null = null;

test.beforeAll(async () => {
  const orgId = await findOrgIdForEmail('client1+test@sageideas.org');
  if (!orgId) return; // tests will skip
  insertedOrgId = orgId;
  const sb = adminClient();
  const { data, error } = await sb
    .from('audit_log')
    .insert({
      action: SYNTH_ACTION,
      entity_type: 'phase2b_test',
      organization_id: orgId,
      actor_email: 'client1+test@sageideas.org',
      after: { synthetic: true, label: 'PR-A audit log fixture' },
    })
    .select('id')
    .single();
  if (error) throw new Error(`failed to seed audit_log: ${error.message}`);
  insertedRowId = data.id;
});

test.afterAll(async () => {
  if (!insertedRowId) return;
  const sb = adminClient();
  await sb.from('audit_log').delete().eq('id', insertedRowId);
});

test.describe('Phase 2B PR-A — portal audit log', () => {
  test('renders the audit log table for the active org', async ({ clientPage }) => {
    test.skip(!insertedOrgId, 'no org for client1 — seed not run');
    await clientPage.goto('/portal/settings/audit-log');

    await expect(
      clientPage.getByRole('heading', { name: /audit log/i }),
    ).toBeVisible();
    await expect(clientPage.locator('[data-testid="portal-audit-log"]')).toBeVisible();
    // The synthetic action should show up (action column renders the text).
    await expect(clientPage.getByText(SYNTH_ACTION).first()).toBeVisible();
  });

  test('settings page links to audit log', async ({ clientPage }) => {
    await clientPage.goto('/portal/settings');
    const link = clientPage.locator('[data-testid="settings-audit-log-link"]');
    await expect(link).toBeVisible();
    await link.click();
    await expect(clientPage).toHaveURL(/\/portal\/settings\/audit-log/);
  });
});
