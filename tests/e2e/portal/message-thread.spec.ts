/**
 * Phase 2E PR-A - threaded message replies.
 *
 * Client1 (Acme-pinned) sends a parent message, replies to it, then
 * replies to the reply. The expander shows N replies; the reply-to-reply
 * is flattened to depth 1 (anchored at the same root parent).
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
const parentText = `parent-${stamp}`;
const replyText = `first-reply-${stamp}`;
const replyToReplyText = `second-reply-${stamp}`;

test.describe('Phase 2E PR-A - threaded replies', () => {
  const createdMessageIds: string[] = [];

  test.afterAll(async () => {
    if (createdMessageIds.length === 0) return;
    const sb = adminClient();
    await sb.from('messages').delete().in('id', createdMessageIds);
  });

  test('reply to message + reply to reply flattens to depth 1', async ({
    clientPage,
    baseURL,
  }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-A routes only exist on the Vercel preview.',
    );
    const ctx = await getAcmeEngagement();
    test.skip(!ctx, 'Acme has no engagement seeded.');
    const { engagementId } = ctx!;

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/messages/${engagementId}`, {
      waitUntil: 'domcontentloaded',
    });
    const composer = clientPage.locator('textarea').first();
    await expect(composer).toBeVisible({ timeout: 30_000 });

    // 1) Send parent message.
    await composer.fill(parentText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) => r.url().includes('/api/messages/send') && r.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.getByRole('button', { name: /^Send$/i }).click(),
    ]);
    const parentBubble = clientPage
      .locator('[data-message-id]')
      .filter({ hasText: parentText })
      .first();
    await expect(parentBubble).toBeVisible({ timeout: 15_000 });

    // 2) Reply to parent.
    await parentBubble.locator('[data-testid="message-reply-btn"]').click();
    await expect(clientPage.locator('[data-testid="compose-reply-chip"]')).toBeVisible();
    await composer.fill(replyText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) => r.url().includes('/api/messages/send') && r.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.getByRole('button', { name: /^Send$/i }).click(),
    ]);

    // 3) Expander appears + click to expand + reply visible.
    const expander = parentBubble
      .locator('xpath=ancestor::li[1]')
      .locator('[data-testid="replies-expander"]');
    await expect(expander).toContainText(/1 reply/i, { timeout: 15_000 });
    await expander.click();
    const replyBubble = clientPage
      .locator('[data-testid="reply-bubble"]')
      .filter({ hasText: replyText })
      .first();
    await expect(replyBubble).toBeVisible({ timeout: 10_000 });

    // 4) Reply to the reply -> chip should still anchor at the root parent
    //    (depth-1 flatten). After send, parent's expander shows 2 replies.
    await replyBubble.locator('[data-testid="message-reply-btn"]').click();
    const chip = clientPage.locator('[data-testid="compose-reply-chip"]');
    await expect(chip).toBeVisible();
    // The chip's snippet quotes the *root* parent's body, not the reply.
    await expect(chip).toContainText(parentText.slice(0, 40));

    await composer.fill(replyToReplyText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) => r.url().includes('/api/messages/send') && r.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.getByRole('button', { name: /^Send$/i }).click(),
    ]);
    await expect(expander).toContainText(/2 replies/i, { timeout: 15_000 });
    await expect(
      clientPage
        .locator('[data-testid="reply-bubble"]')
        .filter({ hasText: replyToReplyText }),
    ).toBeVisible({ timeout: 10_000 });

    // Track for cleanup.
    const sb = adminClient();
    const { data: rows } = await sb
      .from('messages')
      .select('id')
      .in('body', [parentText, replyText, replyToReplyText]);
    for (const r of rows ?? []) {
      const id = r.id as string | null;
      if (id) createdMessageIds.push(id);
    }
  });
});
