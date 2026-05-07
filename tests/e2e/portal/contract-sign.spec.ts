/**
 * Phase 2C PR-B - in-portal contract e-sign.
 *
 * Service-role helper seeds a documents row with a valid signing token
 * scoped to Acme. Client1 (Acme cookie pinned) visits the in-portal
 * /portal/documents/[id]/sign?token=... page, signs, lands on the success
 * panel, and the documents row gets signed_at populated. A second visit
 * with the same token lands on the already-signed branch.
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

test.describe('Phase 2C PR-B - in-portal contract e-sign', () => {
  let documentId: string | null = null;
  let signingToken = '';
  let pdfPathToCleanup: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');
    signingToken = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const { data, error } = await sb
      .from('documents')
      .insert({
        organization_id: orgId,
        title: `Phase 2C test contract ${Date.now()}`,
        type: 'contract',
        status: 'sent',
        body_md: 'This is a test contract body for Phase 2C PR-B contract-sign spec.',
        signing_token: signingToken,
        signing_token_expires: expires.toISOString(),
        signing_token_used: false,
      })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('insert failed');
    documentId = data.id as string;
  });

  test.afterAll(async () => {
    const sb = adminClient();
    if (pdfPathToCleanup) {
      await sb.storage.from('contracts').remove([pdfPathToCleanup]);
    }
    if (documentId) {
      await sb.from('signature_audits').delete().eq('document_id', documentId);
      await sb.from('audit_log').delete().eq('entity_id', documentId);
      await sb.from('documents').delete().eq('id', documentId);
    }
  });

  test('client signs once; re-visit shows already-signed', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(!documentId, 'document not seeded');
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);

    await clientPage.goto(
      `/portal/documents/${documentId}/sign?token=${signingToken}`,
    );
    await expect(clientPage.locator('[data-testid="sign-contract-page"]')).toBeVisible();

    await clientPage
      .locator('[data-testid="sign-name-input"]')
      .fill('Phase 2C Tester');
    await clientPage.locator('[data-testid="sign-agree-checkbox"]').check();
    await Promise.all([
      clientPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/portal/documents/${documentId}/sign`) &&
          resp.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.locator('[data-testid="sign-submit"]').click(),
    ]);

    await expect(clientPage.locator('[data-testid="sign-success"]')).toBeVisible({
      timeout: 15_000,
    });

    // Verify documents row updated.
    const sb = adminClient();
    const { data: doc } = await sb
      .from('documents')
      .select('signed_at, signature_name, signing_token_used, status, signed_pdf_path')
      .eq('id', documentId)
      .single();
    expect(doc?.signed_at).toBeTruthy();
    expect(doc?.signing_token_used).toBe(true);
    expect(doc?.status).toBe('signed');
    expect(doc?.signature_name).toBe('Phase 2C Tester');
    if (doc?.signed_pdf_path) pdfPathToCleanup = doc.signed_pdf_path as string;

    // Re-visit -> already signed (token-bearing URL hits the already-signed
    // branch since signing_token_used is true; no signed=1 flag, so the
    // panel renders sign-error).
    await clientPage.goto(
      `/portal/documents/${documentId}/sign?token=${signingToken}`,
    );
    await expect(clientPage.locator('[data-testid="sign-error"]')).toBeVisible();
  });
});
