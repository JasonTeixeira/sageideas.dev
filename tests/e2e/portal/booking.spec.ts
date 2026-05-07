/**
 * Phase 2D PR-B - portal calendar booking.
 *
 * Client1 (Acme-pinned) visits /portal/booking, picks the first visible
 * 30-min slot, confirms, and asserts the success card. Service-role read
 * verifies a single bookings row exists with status='confirmed' and the
 * expected starts_at. ICS download endpoint returns text/calendar with
 * the booking's ics_uid.
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

async function findAcmeOrgId(): Promise<string | null> {
  const sb = adminClient();
  const { data } = await sb
    .from('organizations')
    .select('id')
    .eq('slug', ACME_SLUG)
    .maybeSingle();
  return data?.id ?? null;
}

test.describe('Phase 2D PR-B - calendar booking', () => {
  let createdBookingId: string | null = null;

  test.afterAll(async () => {
    if (!createdBookingId) return;
    const sb = adminClient();
    await sb
      .from('audit_log')
      .delete()
      .eq('entity_id', createdBookingId)
      .eq('entity_type', 'booking');
    await sb.from('bookings').delete().eq('id', createdBookingId);
  });

  test('client picks a slot, confirms, and downloads ICS', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-B routes only exist on the Vercel preview.',
    );
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/booking', { waitUntil: 'domcontentloaded' });
    await expect(clientPage.locator('[data-testid="booking-page"]')).toBeVisible({
      timeout: 30_000,
    });

    await clientPage
      .locator('[data-testid="booking-meeting-kind"]')
      .selectOption('kickoff');

    // Pick the first available slot.
    const firstSlot = clientPage.locator('[data-testid^="booking-slot-"]').first();
    await expect(firstSlot).toBeVisible({ timeout: 15_000 });
    const slotTestId = await firstSlot.getAttribute('data-testid');
    expect(slotTestId).toBeTruthy();
    const expectedStartIso = (slotTestId ?? '').replace(/^booking-slot-/, '');
    await firstSlot.click();
    await expect(firstSlot).toHaveAttribute('aria-pressed', 'true');

    const confirmResp = clientPage.waitForResponse(
      (resp) =>
        resp.url().includes('/api/portal/bookings') &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await clientPage.locator('[data-testid="booking-confirm"]').click();
    const finalResp = await confirmResp;
    expect(finalResp.ok()).toBeTruthy();
    const respJson = (await finalResp.json()) as {
      ok?: boolean;
      booking?: { id: string; ics_uid: string; starts_at: string };
    };
    expect(respJson.ok).toBeTruthy();
    createdBookingId = respJson.booking?.id ?? null;
    expect(typeof createdBookingId).toBe('string');

    await expect(clientPage.locator('[data-testid="booking-success"]')).toBeVisible({
      timeout: 15_000,
    });

    // Service-role verification.
    const sb = adminClient();
    const { data: bookings } = await sb
      .from('bookings')
      .select('id, organization_id, meeting_kind, status, starts_at, ics_uid')
      .eq('id', createdBookingId!);
    expect(bookings).toHaveLength(1);
    const booking = bookings![0] as {
      id: string;
      organization_id: string;
      meeting_kind: string;
      status: string;
      starts_at: string;
      ics_uid: string;
    };
    expect(booking.meeting_kind).toBe('kickoff');
    expect(booking.status).toBe('confirmed');
    expect(booking.organization_id).toBe(orgId);
    expect(new Date(booking.starts_at).getTime()).toBe(
      new Date(expectedStartIso).getTime(),
    );

    // ICS download.
    const icsResp = await clientPage.request.get(
      `/api/portal/bookings/${createdBookingId}/ics`,
    );
    expect(icsResp.ok()).toBeTruthy();
    expect(icsResp.headers()['content-type'] ?? '').toContain('text/calendar');
    const body = await icsResp.text();
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain(booking.ics_uid);
  });
});
