/**
 * Phase 2F PR-B - admin availability editor.
 *
 * Admin loads /admin/availability, edits the slot length on the first
 * rule, clicks Save, and verifies (a) the PATCH returned 200 and (b) the
 * studio_availability row reflects the new slot_minutes via service-role.
 * Restores the original value at the end.
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

test.describe('Phase 2F PR-B - admin availability editor', () => {
  let restoreId: string | null = null;
  let restoreSlot: number | null = null;

  test.afterAll(async () => {
    if (!restoreId || restoreSlot == null) return;
    const sb = adminClient();
    await sb
      .from('studio_availability')
      .update({ slot_minutes: restoreSlot })
      .eq('id', restoreId);
  });

  test('admin updates a rule slot length', async ({ adminPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — admin page only exists on the Vercel preview.',
    );

    await adminPage.goto('/admin/availability', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.locator('[data-testid="admin-availability"]')).toBeVisible({
      timeout: 30_000,
    });

    const firstRow = adminPage.locator('[data-testid="availability-row"]').first();
    const rowCount = await adminPage.locator('[data-testid="availability-row"]').count();
    test.skip(rowCount === 0, 'No studio_availability rows seeded.');

    restoreId = await firstRow.getAttribute('data-rule-id');
    expect(restoreId).toBeTruthy();

    const slotSelect = firstRow.locator('[data-testid="availability-slot-minutes"]');
    const currentValue = await slotSelect.inputValue();
    restoreSlot = Number(currentValue);

    // Pick a different value: cycle 30→60→30.
    const newValue = currentValue === '30' ? '60' : '30';
    await slotSelect.selectOption(newValue);

    const saveResp = adminPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/admin/availability/${restoreId}`) &&
        resp.request().method() === 'PATCH',
      { timeout: 30_000 },
    );
    await firstRow.locator('[data-testid="availability-save"]').click();
    const finalResp = await saveResp;
    expect(finalResp.ok()).toBeTruthy();

    const sb = adminClient();
    const { data: after } = await sb
      .from('studio_availability')
      .select('slot_minutes')
      .eq('id', restoreId!)
      .single();
    expect(after?.slot_minutes).toBe(Number(newValue));
  });

  test('PATCH rejects start_time >= end_time', async ({ adminPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod.',
    );
    const sb = adminClient();
    const { data: any } = await sb
      .from('studio_availability')
      .select('id')
      .limit(1)
      .maybeSingle();
    test.skip(!any?.id, 'No studio_availability rows seeded.');

    const resp = await adminPage.request.patch(
      `/api/admin/availability/${any!.id}`,
      { data: { start_time: '18:00', end_time: '09:00' } },
    );
    expect(resp.status()).toBe(400);
  });
});
