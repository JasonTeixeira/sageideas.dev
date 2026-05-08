/**
 * Phase 2F PR-B - booking cancellation.
 *
 * Seeds a confirmed booking via the service-role client, then logs in as
 * Client1 (Acme-pinned), navigates to /portal/booking, and clicks the
 * cancel button. Verifies the row flips to a "Cancelled" badge and the
 * DB row carries status='cancelled' + non-null cancelled_at.
 */

import { test, expect, setActiveOrgCookie, ACME_SLUG } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

test.describe('Phase 2F PR-B - booking cancel', () => {
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

  test('client cancels an upcoming booking', async ({ clientPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — cancel route only exists on the Vercel preview.',
    );
    const orgId = await findAcmeOrgId();
    test.skip(!orgId, 'Acme org not found.');

    // Seed a booking 5 days out at 14:00 UTC so it's clearly future-dated.
    const sb = adminClient();
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 5);
    start.setUTCHours(14, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const ics = `${randomUUID()}@sageideas-test`;
    const { data: insertData, error: insertErr } = await sb
      .from('bookings')
      .insert({
        organization_id: orgId!,
        meeting_kind: 'kickoff',
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: 'confirmed',
        ics_uid: ics,
      })
      .select('id')
      .single();
    if (insertErr || !insertData) throw insertErr ?? new Error('Seed failed');
    createdBookingId = insertData.id as string;

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/booking', { waitUntil: 'domcontentloaded' });

    const row = clientPage.locator(
      `[data-testid="booking-row"][data-booking-id="${createdBookingId}"]`,
    );
    await expect(row).toBeVisible({ timeout: 30_000 });

    const cancelResp = clientPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/portal/bookings/${createdBookingId}/cancel`) &&
        resp.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await row.locator('[data-testid="booking-cancel-btn"]').click();
    const finalResp = await cancelResp;
    expect(finalResp.ok()).toBeTruthy();

    // Row stays visible but flips to a Cancelled badge after refresh.
    await expect(
      row.locator('[data-testid="booking-cancelled-badge"]'),
    ).toBeVisible({ timeout: 15_000 });

    // Service-role verification.
    const { data: after } = await sb
      .from('bookings')
      .select('status, cancelled_at')
      .eq('id', createdBookingId);
    expect(after).toHaveLength(1);
    expect(after![0].status).toBe('cancelled');
    expect(after![0].cancelled_at).not.toBeNull();
  });
});
