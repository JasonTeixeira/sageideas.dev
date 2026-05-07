/**
 * Phase 2D PR-B - kickoff intake submit.
 *
 * Service-role helper ensures an Acme web-design engagement exists with
 * intake unfilled. Client1 (Acme-pinned) visits /portal/intake/[id], fills
 * the required fields, submits, asserts success state. Service-role read
 * confirms intake jsonb + intake_submitted_at + intake_form_id are set,
 * and that a Kickoff project_milestones row exists. Re-visit shows the
 * read-only "already submitted" state.
 */

import { randomUUID } from 'crypto';
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

test.describe('Phase 2D PR-B - kickoff intake', () => {
  let engagementId: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');

    // Always create a fresh engagement for this run to avoid clashing with
    // other tests that mutate the same engagement.
    const today = new Date();
    const target = new Date(today);
    target.setDate(target.getDate() + 30);
    const { data, error } = await sb
      .from('engagements')
      .insert({
        organization_id: orgId,
        title: `Phase 2D intake test ${randomUUID().slice(0, 8)}`,
        service_type: 'web-design',
        status: 'active',
        start_date: today.toISOString().slice(0, 10),
        target_date: target.toISOString().slice(0, 10),
        pipeline_stage: 'active',
      })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error('engagement insert failed');
    engagementId = data.id as string;
  });

  test.afterAll(async () => {
    if (!engagementId) return;
    const sb = adminClient();
    await sb.from('project_milestones').delete().eq('engagement_id', engagementId);
    await sb
      .from('audit_log')
      .delete()
      .eq('entity_id', engagementId)
      .eq('entity_type', 'engagement');
    await sb.from('engagements').delete().eq('id', engagementId);
  });

  test('client fills intake -> success + Kickoff milestone created', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(!engagementId, 'engagement not seeded');
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-B routes only exist on the Vercel preview.',
    );
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);

    await clientPage.goto(`/portal/intake/${engagementId}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(clientPage.locator('[data-testid="intake-page"]')).toBeVisible({
      timeout: 30_000,
    });
    // Web design schema fields: goals (textarea, required), audience (text, required)
    await clientPage.locator('[data-testid="intake-field-goals"]').fill('Build a 5-page marketing site.');
    await clientPage.locator('[data-testid="intake-field-audience"]').fill('SMB founders.');

    const submitResp = clientPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/portal/engagements/${engagementId}/intake`) &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await clientPage.locator('[data-testid="intake-submit"]').click();
    const finalResp = await submitResp;
    expect(finalResp.ok()).toBeTruthy();

    // Page refreshes; the same /portal/intake/[id] now shows the
    // already-submitted view tagged with kickoff-answers.
    await expect(clientPage.locator('[data-testid="kickoff-answers"]')).toBeVisible({
      timeout: 15_000,
    });

    // Service-role verification.
    const sb = adminClient();
    const { data: row } = await sb
      .from('engagements')
      .select('intake, intake_submitted_at, intake_form_id')
      .eq('id', engagementId)
      .single();
    const intake = (row?.intake ?? {}) as Record<string, string>;
    expect(intake.goals).toContain('5-page');
    expect(intake.audience).toContain('SMB');
    expect(row?.intake_submitted_at).toBeTruthy();
    expect(typeof row?.intake_form_id).toBe('string');

    const { data: milestones } = await sb
      .from('project_milestones')
      .select('title')
      .eq('engagement_id', engagementId);
    const titles = (milestones ?? []).map((m) => (m.title as string).toLowerCase());
    expect(titles).toContain('kickoff');

    // Re-visit -> read-only "already submitted" view.
    await clientPage.goto(`/portal/intake/${engagementId}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(clientPage.locator('[data-testid="kickoff-answers"]')).toBeVisible({
      timeout: 15_000,
    });
  });
});
