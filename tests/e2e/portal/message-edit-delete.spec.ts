/**
 * Phase 2E PR-A - message edit + soft-delete with audit.
 *
 * Client1 (Acme-pinned) sends a message, edits the body via the actions
 * menu, asserts the edited badge + new text, verifies edited_at +
 * edit_count + an audit_log message.edited row exist; then deletes,
 * asserts the placeholder, verifies deleted_at + a message.deleted audit
 * row.
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
const originalText = `original-${stamp}`;
const editedText = `edited!-${stamp}`;

test.describe('Phase 2E PR-A - message edit + delete', () => {
  let messageId: string | null = null;

  test.afterAll(async () => {
    const sb = adminClient();
    if (messageId) {
      await sb.from('audit_log').delete().eq('entity_id', messageId);
      await sb.from('messages').delete().eq('id', messageId);
    }
  });

  test('owner edits then deletes message; audit + flags persisted', async ({
    clientPage,
    baseURL,
  }) => {
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
    await composer.fill(originalText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) => r.url().includes('/api/messages/send') && r.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      clientPage.getByRole('button', { name: /^Send$/i }).click(),
    ]);

    // Poll until the bubble's id flips from the optimistic temp- to a real
    // UUID (handleSend swaps id once the POST body resolves).
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    await expect(async () => {
      const bubble = clientPage
        .locator('[data-message-id]')
        .filter({ hasText: originalText })
        .first();
      const id = await bubble.getAttribute('data-message-id');
      expect(id).toMatch(uuidRe);
    }).toPass({ timeout: 15_000 });
    const bubble = clientPage
      .locator('[data-message-id]')
      .filter({ hasText: originalText })
      .first();
    messageId = await bubble.getAttribute('data-message-id');
    expect(messageId).toBeTruthy();

    // Edit via actions menu.
    await bubble.locator('[data-testid="msg-actions-menu"]').click();
    await bubble.locator('[data-testid="msg-edit-action"]').click();
    const editInput = bubble.locator('[data-testid="msg-edit-input"]');
    await expect(editInput).toBeVisible();
    await editInput.fill(editedText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/messages/${messageId}`) &&
          r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      bubble.locator('[data-testid="msg-edit-save"]').click(),
    ]);

    const editedBubble = clientPage
      .locator('[data-message-id]')
      .filter({ hasText: editedText })
      .first();
    await expect(editedBubble).toBeVisible({ timeout: 15_000 });
    await expect(editedBubble.locator('[data-testid="msg-edited-badge"]')).toBeVisible();

    // DB check: edited_at + edit_count.
    const sb = adminClient();
    const { data: row } = await sb
      .from('messages')
      .select('body, edited_at, edit_count, deleted_at')
      .eq('id', messageId!)
      .single();
    expect(row?.body).toBe(editedText);
    expect(row?.edited_at).toBeTruthy();
    expect(row?.edit_count).toBeGreaterThanOrEqual(1);

    const { data: editAudits } = await sb
      .from('audit_log')
      .select('action')
      .eq('entity_id', messageId!)
      .eq('action', 'message.edited');
    expect((editAudits ?? []).length).toBeGreaterThanOrEqual(1);

    // Delete via actions menu (auto-confirm window.confirm).
    clientPage.once('dialog', (d) => {
      void d.accept();
    });
    await editedBubble.locator('[data-testid="msg-actions-menu"]').click();
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/messages/${messageId}`) &&
          r.request().method() === 'DELETE',
        { timeout: 15_000 },
      ),
      editedBubble.locator('[data-testid="msg-delete-action"]').click(),
    ]);

    await expect(
      clientPage
        .locator('[data-message-id]')
        .filter({ has: clientPage.locator('[data-testid="msg-deleted-placeholder"]') })
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    const { data: deletedRow } = await sb
      .from('messages')
      .select('deleted_at')
      .eq('id', messageId!)
      .single();
    expect(deletedRow?.deleted_at).toBeTruthy();

    const { data: delAudits } = await sb
      .from('audit_log')
      .select('action')
      .eq('entity_id', messageId!)
      .eq('action', 'message.deleted');
    expect((delAudits ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
