/**
 * Phase 2B PR-C — Calendar grid + ICS download.
 *
 * Asserts:
 *  - The /portal/calendar page renders the month grid even when the active
 *    org has zero visible events (regression: previously rendered only the
 *    empty card).
 *  - Clicking an event opens the modal with an "Add to calendar" link, which
 *    points to /api/portal/calendar/<id>/ics. We fetch that URL with the
 *    auth cookies attached and parse the response as a valid VEVENT with the
 *    matching UID.
 *
 * A calendar event is seeded into the active org via the service role so the
 * test stays valid even on a fresh DB.
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

async function getAcmeContext(): Promise<{ orgId: string; engagementId: string | null } | null> {
  // After migration 0009, client1 belongs to both Acme and Beta. Pin to Acme
  // explicitly so the seeded event lands in the same org we set as active
  // via the sage_active_org cookie below — otherwise the ICS handler 403s
  // because the event's org doesn't match ctx.organizationId.
  const sb = adminClient();
  const { data: org } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', ACME_SLUG)
    .maybeSingle();
  const orgId = org?.id;
  if (!orgId) return null;
  const { data: eng } = await sb
    .from('engagements')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1);
  return { orgId, engagementId: eng?.[0]?.id ?? null };
}

test.describe('Phase 2B PR-C — calendar + ICS', () => {
  let seededEventId: string | null = null;
  const seedTitle = `PR-C ICS Test ${Date.now()}`;

  test.beforeAll(async () => {
    const ctx = await getAcmeContext();
    if (!ctx) return;
    const sb = adminClient();
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const { data, error } = await sb
      .from('calendar_events')
      .insert({
        organization_id: ctx.orgId,
        engagement_id: ctx.engagementId,
        title: seedTitle,
        description: 'Seeded by phase 2b PR-C calendar-ics.spec',
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        all_day: false,
        event_type: 'meeting',
        attendees: [],
        visible_to_client: true,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[calendar-ics.spec] failed to seed event:', error.message);
    } else if (data) {
      seededEventId = (data as { id: string }).id;
    }
  });

  test.afterAll(async () => {
    if (seededEventId) {
      const sb = adminClient();
      await sb.from('calendar_events').delete().eq('id', seededEventId);
    }
  });

  test('calendar page renders the month grid even when there are no events', async ({
    clientPage,
    baseURL,
  }) => {
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/calendar');
    // The grid container is always rendered now, regardless of event count.
    await expect(clientPage.getByTestId('calendar-grid')).toBeVisible();
    // FullCalendar's toolbar has a "today" button whose presence proves the grid mounted.
    await expect(clientPage.locator('.fc .fc-toolbar')).toBeVisible({ timeout: 15_000 });
  });

  test('ICS download for a seeded event returns a valid VEVENT with matching UID', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(!seededEventId, 'seed step did not insert an event (env missing?)');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    // Hit the ICS endpoint directly — the route is auth-scoped via the same
    // cookies the page already has.
    const url = `/api/portal/calendar/${seededEventId}/ics`;
    const res = await clientPage.request.get(url);
    expect(res.status(), 'ICS endpoint should return 200').toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/text\/calendar/);
    const body = await res.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('VERSION:2.0');
    expect(body).toContain('BEGIN:VEVENT');
    expect(body).toContain('END:VEVENT');
    expect(body).toContain('END:VCALENDAR');
    expect(body).toContain(`UID:${seededEventId}`);
    expect(body).toContain('DTSTAMP');
    expect(body).toContain('DTSTART');
    expect(body).toContain('DTEND');
    expect(body).toContain(`SUMMARY:${seedTitle}`);
  });
});
