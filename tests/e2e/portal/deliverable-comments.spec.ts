/**
 * Phase 2E PR-B - deliverable comments.
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

const stamp = randomBytes(3).toString('hex');
const parentText = `parent comment ${stamp}`;
const replyText = `reply ${stamp}`;
const editedText = `parent edited ${stamp}`;

test.describe('Phase 2E PR-B - deliverable comments', () => {
  let engagementId: string | null = null;
  let deliverableId: string | null = null;

  test.beforeAll(async () => {
    const sb = adminClient();
    const { data: org } = await sb
      .from('organizations')
      .select('id')
      .eq('slug', ACME_SLUG)
      .maybeSingle();
    test.skip(!org?.id, 'Acme org not found.');
    const { data: eng } = await sb
      .from('engagements')
      .select('id')
      .eq('organization_id', org!.id)
      .limit(1);
    test.skip(!eng?.[0]?.id, 'Acme engagement not found.');
    engagementId = eng![0].id as string;

    const { data: del, error } = await sb
      .from('deliverables')
      .insert({
        engagement_id: engagementId,
        title: `2E test deliverable ${stamp}`,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error || !del) throw error ?? new Error('deliverable insert failed');
    deliverableId = del.id as string;
  });

  test.afterAll(async () => {
    const sb = adminClient();
    if (deliverableId) {
      await sb.from('deliverable_comments').delete().eq('deliverable_id', deliverableId);
      await sb
        .from('audit_log')
        .delete()
        .eq('entity_type', 'deliverable_comment')
        .eq('organization_id', null);
      await sb.from('deliverables').delete().eq('id', deliverableId);
    }
  });

  test('client comments, replies, edits, deletes', async ({ clientPage, baseURL }) => {
    test.skip(
      !!baseURL && /www\.sageideas\.dev$/i.test(new URL(baseURL).host),
      'Skipping against prod — PR-B routes only exist on the Vercel preview.',
    );
    test.skip(!engagementId || !deliverableId, 'fixtures not seeded');
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(
      `/portal/projects/${engagementId}?tab=deliverables`,
      { waitUntil: 'domcontentloaded' },
    );

    const toggle = clientPage.locator(
      `[data-testid="deliverable-comments-toggle-${deliverableId}"]`,
    );
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await toggle.click();

    const compose = clientPage.locator('[data-testid="deliverable-comment-compose"]');
    await expect(compose).toBeVisible({ timeout: 15_000 });
    await compose.fill(parentText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/deliverables/${deliverableId}/comments`) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      clientPage.locator('[data-testid="deliverable-comment-submit"]').click(),
    ]);

    const parentBubble = clientPage
      .locator('[data-testid^="deliverable-comment-bubble-"]')
      .filter({ hasText: parentText })
      .first();
    await expect(parentBubble).toBeVisible({ timeout: 15_000 });

    // Capture comment id from the bubble's testid for later DB checks.
    const parentTestId = await parentBubble.getAttribute('data-testid');
    const parentCommentId = parentTestId?.replace('deliverable-comment-bubble-', '') ?? null;
    expect(parentCommentId).toBeTruthy();

    // Reply.
    await parentBubble.locator('[data-testid="deliverable-comment-reply-btn"]').click();
    await compose.fill(replyText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/deliverables/${deliverableId}/comments`) &&
          r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      clientPage.locator('[data-testid="deliverable-comment-submit"]').click(),
    ]);
    await expect(
      clientPage
        .locator('[data-testid^="deliverable-comment-bubble-"]')
        .filter({ hasText: replyText }),
    ).toBeVisible({ timeout: 15_000 });

    // Edit parent — re-derive bubble by id since hasText changes after edit.
    const parentById = clientPage.locator(
      `[data-testid="deliverable-comment-bubble-${parentCommentId}"]`,
    );
    await parentById.locator('[data-testid="deliverable-comment-edit-btn"]').click();
    const editInput = parentById.locator('[data-testid="deliverable-comment-edit-input"]');
    await expect(editInput).toBeVisible();
    await editInput.fill(editedText);
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/deliverable-comments/${parentCommentId}`) &&
          r.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      parentById.locator('[data-testid="deliverable-comment-edit-save"]').click(),
    ]);
    await expect(parentById).toContainText(editedText, { timeout: 15_000 });
    await expect(
      parentById.locator('[data-testid="deliverable-comment-edited-badge"]'),
    ).toBeVisible();

    // Delete parent.
    clientPage.once('dialog', (d) => {
      void d.accept();
    });
    await Promise.all([
      clientPage.waitForResponse(
        (r) =>
          r.url().includes(`/api/deliverable-comments/${parentCommentId}`) &&
          r.request().method() === 'DELETE',
        { timeout: 15_000 },
      ),
      parentById.locator('[data-testid="deliverable-comment-delete-btn"]').click(),
    ]);
    await expect(parentById).toContainText('Comment deleted', { timeout: 15_000 });

    // Service-role read.
    const sb = adminClient();
    const { data: rows } = await sb
      .from('deliverable_comments')
      .select('id, parent_id, body, edited_at, deleted_at')
      .eq('deliverable_id', deliverableId!);
    expect((rows ?? []).length).toBe(2);
    const parent = (rows ?? []).find((r) => !r.parent_id);
    expect(parent?.edited_at).toBeTruthy();
    expect(parent?.deleted_at).toBeTruthy();
  });
});
