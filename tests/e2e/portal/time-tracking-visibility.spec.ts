/**
 * Phase 2E PR-B - time-tracking visibility toggle.
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

test.describe('Phase 2E PR-B - time-tracking visibility', () => {
  let orgId: string | null = null;
  let engagementId: string | null = null;
  const seededEntryIds: string[] = [];

  test.beforeAll(async () => {
    const sb = adminClient();
    const { data: org } = await sb
      .from('organizations')
      .select('id, show_time_tracking')
      .eq('slug', ACME_SLUG)
      .maybeSingle();
    test.skip(!org?.id, 'Acme org not found.');
    orgId = org!.id as string;

    const { data: eng } = await sb
      .from('engagements')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);
    test.skip(!eng?.[0]?.id, 'Acme engagement not found.');
    engagementId = eng![0].id as string;

    // time_entries.user_id is NOT NULL — find an admin to attribute the
    // seeded entries to.
    const { data: adm } = await sb
      .from('profiles')
      .select('id')
      .eq('email', 'sage+admin@sageideas.org')
      .maybeSingle();
    const adminId = adm?.id as string | undefined;
    test.skip(!adminId, 'Admin profile not found.');

    // Reset to false; insert two time entries this week.
    await sb.from('organizations').update({ show_time_tracking: false }).eq('id', orgId);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const ent1 = await sb
      .from('time_entries')
      .insert({
        engagement_id: engagementId,
        user_id: adminId!,
        duration_minutes: 60,
        started_at: yesterday.toISOString(),
        ended_at: new Date(yesterday.getTime() + 3600 * 1000).toISOString(),
        billable: true,
      })
      .select('id')
      .single();
    if (ent1.data?.id) seededEntryIds.push(ent1.data.id as string);
    const ent2 = await sb
      .from('time_entries')
      .insert({
        engagement_id: engagementId,
        user_id: adminId!,
        duration_minutes: 30,
        started_at: now.toISOString(),
        ended_at: new Date(now.getTime() + 1800 * 1000).toISOString(),
        billable: true,
      })
      .select('id')
      .single();
    if (ent2.data?.id) seededEntryIds.push(ent2.data.id as string);
  });

  test.afterAll(async () => {
    const sb = adminClient();
    if (orgId) {
      await sb.from('organizations').update({ show_time_tracking: false }).eq('id', orgId);
    }
    if (seededEntryIds.length > 0) {
      await sb.from('time_entries').delete().in('id', seededEntryIds);
    }
  });

  test('toggle gates the time summary section', async ({ clientPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-B routes only exist on the Vercel preview.',
    );
    test.skip(!engagementId || !orgId, 'fixtures not seeded');
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);

    await clientPage.goto(`/portal/projects/${engagementId}?tab=overview`, {
      waitUntil: 'domcontentloaded',
    });
    // Section should NOT be visible (flag is false).
    await expect(
      clientPage.locator('[data-testid="time-summary-section"]'),
    ).toHaveCount(0, { timeout: 10_000 });

    // Flip flag on.
    const sb = adminClient();
    await sb.from('organizations').update({ show_time_tracking: true }).eq('id', orgId!);

    await clientPage.goto(`/portal/projects/${engagementId}?tab=overview`, {
      waitUntil: 'domcontentloaded',
    });
    const section = clientPage.locator('[data-testid="time-summary-section"]');
    await expect(section).toBeVisible({ timeout: 15_000 });
    // Total = 60 + 30 = 90 minutes -> "1h 30m"
    await expect(section).toContainText(/1h\s*30m/, { timeout: 10_000 });
  });
});
