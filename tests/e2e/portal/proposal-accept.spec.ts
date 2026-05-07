/**
 * Phase 2D PR-A - portal proposal accept flow.
 *
 * Service-role helper inserts an Acme proposal with status='sent' and a
 * fresh acceptance_token. Client1 (Acme-pinned) visits the portal proposal
 * URL with the token, accepts, and lands on the new engagement page.
 * Server-side verifies the proposal flipped to accepted and that
 * resulting_engagement_id + resulting_invoice_id are set with
 * contract_value=2500.
 */

import { randomBytes } from 'crypto';
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

async function findAcmeOrgId(): Promise<string | null> {
  const sb = adminClient();
  const { data } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', ACME_SLUG)
    .maybeSingle();
  return data?.id ?? null;
}

test.describe('Phase 2D PR-A - portal proposal accept', () => {
  let proposalId: string | null = null;
  let token = '';
  let createdEngagementId: string | null = null;
  let createdInvoiceId: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');
    token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { data, error } = await sb
      .from('proposals')
      .insert({
        organization_id: orgId,
        title: `Phase 2D test proposal ${Date.now()}`,
        intro: 'A short proposal for the e2e accept spec.',
        line_items: [
          { name: 'Discovery + Strategy', qty: 1, unit_price: 1500 },
          { name: 'Build', qty: 10, unit_price: 100 },
        ],
        subtotal: 2500,
        discount: 0,
        total: 2500,
        currency: 'USD',
        status: 'sent',
        sent_at: new Date().toISOString(),
        acceptance_token: token,
        acceptance_token_expires: expires.toISOString(),
      })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('proposal insert failed');
    proposalId = data.id as string;
  });

  test.afterAll(async () => {
    const sb = adminClient();
    if (createdInvoiceId) {
      await sb.from('invoices').delete().eq('id', createdInvoiceId);
    }
    if (createdEngagementId) {
      await sb.from('tasks').delete().eq('engagement_id', createdEngagementId);
      await sb.from('project_milestones').delete().eq('engagement_id', createdEngagementId);
      await sb.from('engagements').delete().eq('id', createdEngagementId);
    }
    if (proposalId) {
      await sb.from('audit_log').delete().eq('entity_id', proposalId);
      await sb.from('proposals').delete().eq('id', proposalId);
    }
  });

  test('client accepts proposal -> engagement + invoice auto-created', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(!proposalId, 'proposal not seeded');
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-A routes only exist on the Vercel preview.',
    );
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);

    await clientPage.goto(`/portal/proposals/${proposalId}?token=${token}`, {
      waitUntil: 'domcontentloaded',
    });
    // Diagnostic: log resulting URL + page heading so a failure surfaces what
    // actually rendered (login redirect, error panel, error boundary, etc).
    const url = clientPage.url();
    const headings = await clientPage
      .locator('h1, h2, [data-testid]')
      .evaluateAll((els) =>
        els
          .map((el) => {
            const tid = (el as HTMLElement).getAttribute('data-testid');
            const text = (el as HTMLElement).textContent?.slice(0, 80) ?? '';
            return tid ? `[${tid}] ${text}` : text;
          })
          .filter(Boolean)
          .slice(0, 12),
      );
    // eslint-disable-next-line no-console
    console.log('[proposal-accept] URL=', url, '\nheadings:', JSON.stringify(headings, null, 2));
    await expect(clientPage.locator('[data-testid="proposal-view-page"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      clientPage.locator('[data-testid="proposal-line-items-table"]'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(clientPage.locator('[data-testid="proposal-total"]')).toContainText(
      /2,?500/,
    );

    await clientPage.locator('[data-testid="proposal-accept-cta"]').click();
    await clientPage.locator('[data-testid="proposal-accept-name"]').fill('Phase 2D Tester');
    await clientPage.locator('[data-testid="proposal-accept-agree"]').check();

    const acceptResp = clientPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/portal/proposals/${proposalId}/accept`) &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await clientPage.locator('[data-testid="proposal-accept-submit"]').click();
    const finalResp = await acceptResp;
    expect(finalResp.ok()).toBeTruthy();

    // Wait for the redirect to /portal/projects/<engagementId>
    await clientPage.waitForURL(/\/portal\/projects\/[0-9a-f-]+/, { timeout: 20_000 });

    // Service-role verification.
    const sb = adminClient();
    const { data: row } = await sb
      .from('proposals')
      .select(
        'status, accepted_at, resulting_engagement_id, resulting_invoice_id, acceptance_signature_name',
      )
      .eq('id', proposalId)
      .single();
    expect(row?.status).toBe('accepted');
    expect(row?.accepted_at).toBeTruthy();
    expect(typeof row?.resulting_engagement_id).toBe('string');
    expect(typeof row?.resulting_invoice_id).toBe('string');
    expect(row?.acceptance_signature_name).toBe('Phase 2D Tester');

    createdEngagementId = (row?.resulting_engagement_id as string | null) ?? null;
    createdInvoiceId = (row?.resulting_invoice_id as string | null) ?? null;

    if (createdEngagementId) {
      const { data: eng } = await sb
        .from('engagements')
        .select('contract_value')
        .eq('id', createdEngagementId)
        .single();
      expect(Number(eng?.contract_value)).toBe(2500);
    }
    if (createdInvoiceId) {
      const { data: inv } = await sb
        .from('invoices')
        .select('total, amount_due, status')
        .eq('id', createdInvoiceId)
        .single();
      expect(Number(inv?.total)).toBe(2500);
      expect(Number(inv?.amount_due)).toBe(2500);
      expect(inv?.status).toBe('draft');
    }

    // Re-visit the proposal URL → already-accepted view.
    await clientPage.goto(`/portal/proposals/${proposalId}?token=${token}`);
    await expect(clientPage.locator('[data-testid="proposal-success"]')).toBeVisible();
  });
});
