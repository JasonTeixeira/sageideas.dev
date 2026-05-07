/**
 * Phase 2D PR-A - admin instantiates an engagement from a project template.
 *
 * Auth as sage admin, open /admin/project-templates, pick the SEO 90-day
 * template, target Acme Test Co, confirm, land on the resulting engagement
 * page and assert the seeded milestones (Audit, On-page, Content sprint,
 * Links + Reporting) render. Service-role read confirms service_type=seo
 * and target_date is ~90 days out.
 */

import { test, expect, ACME_SLUG } from '../../fixtures/auth';
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

test.describe('Phase 2D PR-A - admin template instantiate', () => {
  let createdEngagementId: string | null = null;

  test.afterAll(async () => {
    if (!createdEngagementId) return;
    const sb = adminClient();
    await sb.from('tasks').delete().eq('engagement_id', createdEngagementId);
    await sb.from('project_milestones').delete().eq('engagement_id', createdEngagementId);
    await sb
      .from('audit_log')
      .delete()
      .eq('entity_id', createdEngagementId)
      .eq('entity_type', 'engagement');
    await sb.from('engagements').delete().eq('id', createdEngagementId);
  });

  test('SEO template seeds milestones into a new Acme engagement', async ({
    adminPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-A routes only exist on the Vercel preview.',
    );
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');

    await adminPage.goto('/admin/project-templates');
    await expect(adminPage.locator('[data-testid="admin-templates-list"]')).toBeVisible();
    await expect(
      adminPage.locator('[data-testid="template-row"]', { hasText: 'Web Design' }),
    ).toBeVisible();
    const seoRow = adminPage
      .locator('[data-testid="template-row"]', { hasText: 'SEO' })
      .first();
    await expect(seoRow).toBeVisible();

    await seoRow.locator('[data-testid="engagement-from-template-button"]').click();
    const modal = adminPage.locator('[data-testid="template-picker-modal"]');
    await expect(modal).toBeVisible();
    await modal.locator('[data-testid="template-picker-org"]').selectOption(orgId!);

    const instResp = adminPage.waitForResponse(
      (resp) =>
        resp.url().includes('/api/admin/project-templates/') &&
        resp.url().endsWith('/instantiate') &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await modal.locator('[data-testid="template-instantiate-confirm"]').click();
    const finalResp = await instResp;
    expect(finalResp.ok()).toBeTruthy();
    const json = (await finalResp.json()) as { engagement_id?: string };
    createdEngagementId = json.engagement_id ?? null;
    expect(typeof createdEngagementId).toBe('string');

    await adminPage.waitForURL(/\/portal\/projects\/[0-9a-f-]+/, { timeout: 20_000 });

    const list = adminPage.locator('[data-testid="engagement-milestones-list"]');
    await expect(list).toBeVisible();
    for (const name of ['Audit', 'On-page', 'Content sprint', 'Links + Reporting']) {
      await expect(list).toContainText(name);
    }

    // Service-role read.
    const sb = adminClient();
    const { data: eng } = await sb
      .from('engagements')
      .select('service_type, target_date, start_date')
      .eq('id', createdEngagementId!)
      .single();
    expect(eng?.service_type).toBe('seo');
    if (eng?.target_date && eng?.start_date) {
      const start = new Date(eng.start_date as string).getTime();
      const target = new Date(eng.target_date as string).getTime();
      const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24));
      // SEO template default_target_days=90; allow a couple of days slack
      // for date arithmetic edge cases.
      expect(diffDays).toBeGreaterThanOrEqual(88);
      expect(diffDays).toBeLessThanOrEqual(92);
    }
  });
});
