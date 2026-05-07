/**
 * Phase 2C PR-A — avatar upload.
 *
 * Verifies that an authenticated client can upload + crop + save an avatar
 * and that the topbar avatar reflects the new image.
 */

import { test, expect, setActiveOrgCookie, ACME_SLUG } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing supabase env');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100' +
    '0d0a2db40000000049454e44ae426082',
  'hex',
);

test.describe('Phase 2C PR-A — avatar upload', () => {
  let initialAvatar: string | null = null;
  let userId: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const { data } = await sb
      .from('app_users')
      .select('id, avatar_url')
      .eq('email', 'client1+test@sageideas.org')
      .maybeSingle();
    initialAvatar = (data?.avatar_url as string | null) ?? null;
    userId = (data?.id as string | null) ?? null;
  });

  test.afterAll(async () => {
    if (!userId) return;
    const sb = adminClient();
    await sb.from('app_users').update({ avatar_url: initialAvatar }).eq('id', userId);
  });

  test('upload avatar -> topbar reflects new image', async ({ clientPage, baseURL }) => {
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/settings');
    const picker = clientPage.locator('[data-testid="avatar-picker"]');
    await expect(picker).toBeVisible();

    const fileInput = clientPage.locator('[data-testid="avatar-file-input"]');
    await fileInput.setInputFiles({
      name: 'test-avatar.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });

    await expect(clientPage.locator('[data-testid="avatar-crop-modal"]')).toBeVisible();

    // The image needs to load before the crop modal can drive a confirm; wait
    // until react-image-crop has wired up its overlay.
    await clientPage.waitForTimeout(500);

    const confirm = clientPage.locator('[data-testid="avatar-crop-confirm"]');
    await expect(confirm).toBeEnabled();
    await Promise.all([
      clientPage.waitForResponse(
        (resp) => resp.url().includes('/api/portal/avatar') && resp.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      confirm.click(),
    ]);

    // Topbar avatar should render an <img> after upload.
    const topbarAvatar = clientPage.locator('[data-testid="topbar-avatar"]');
    await expect(topbarAvatar).toBeVisible({ timeout: 10_000 });
    // The element should be an <img> once the signed URL resolves.
    await expect(async () => {
      const tag = await topbarAvatar.evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe('img');
    }).toPass({ timeout: 10_000 });
  });
});
