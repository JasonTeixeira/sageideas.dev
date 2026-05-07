/**
 * Phase 2E PR-A - message reactions.
 *
 * Client1 sends a message, picks 👍 from the quick reactions, asserts the
 * chip count appears, then toggles it off, then adds 🚀.
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

async function getAcmeEngagement(): Promise<{ orgId: string; engagementId: string } | null> {
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
  const engagementId = eng?.[0]?.id;
  if (!engagementId) return null;
  return { orgId, engagementId };
}

const stamp = randomBytes(3).toString('hex');
const messageText = `reaction-target-${stamp}`;

test.describe('Phase 2E PR-A - message reactions', () => {
  let messageId: string | null = null;

  test.afterAll(async () => {
    const sb = adminClient();
    if (messageId) {
      await sb.from('message_reactions').delete().eq('message_id', messageId);
      await sb.from('messages').delete().eq('id', messageId);
    }
  });

  test('quick-pick toggles a reaction chip', async ({ clientPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-A routes only exist on the Vercel preview.',
    );
    const ctx = await getAcmeEngagement();
    test.skip(!ctx, 'Acme engagement not seeded.');
    const { engagementId } = ctx!;

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/messages/${engagementId}`, {
      waitUntil: 'domcontentloaded',
    });
    const composer = clientPage.locator('textarea').first();
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.fill(messageText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) => r.url().includes('/api/messages/send') && r.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.getByRole('button', { name: /^Send$/i }).click(),
    ]);

    // Wait for the optimistic temp- id to be swapped for the canonical UUID
    // by handleSend so subsequent reaction toggles hit the right URL.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    await expect(async () => {
      const bubble = clientPage
        .locator('[data-message-id]')
        .filter({ hasText: messageText })
        .first();
      const id = await bubble.getAttribute('data-message-id');
      expect(id).toMatch(uuidRe);
    }).toPass({ timeout: 15_000 });
    const bubble = clientPage
      .locator('[data-message-id]')
      .filter({ hasText: messageText })
      .first();
    const id = await bubble.getAttribute('data-message-id');
    expect(id).toBeTruthy();
    messageId = id;

    // Open picker → click 👍.
    await bubble.locator('[data-testid="reaction-picker-toggle"]').click();
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/messages/${id}/reactions`) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      bubble.locator('[data-testid="reaction-quick-thumbs-up"]').click(),
    ]);
    const thumbsChip = bubble.locator('[data-testid="reaction-chip-thumbs-up"]');
    await expect(thumbsChip).toBeVisible({ timeout: 10_000 });
    await expect(thumbsChip).toContainText('1');

    // Toggle off by clicking the chip.
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/messages/${id}/reactions`) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      thumbsChip.click(),
    ]);
    await expect(thumbsChip).toHaveCount(0, { timeout: 10_000 });

    // Add a different reaction.
    await bubble.locator('[data-testid="reaction-picker-toggle"]').click();
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/messages/${id}/reactions`) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      bubble.locator('[data-testid="reaction-quick-rocket"]').click(),
    ]);
    await expect(bubble.locator('[data-testid="reaction-chip-rocket"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
