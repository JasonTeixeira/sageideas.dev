/**
 * Phase 2C PR-B - message attachments.
 *
 * Auth as client1 (Acme cookie pinned), navigate to a thread, upload a small
 * PNG and a small PDF via the paperclip composer, send the message, assert
 * the image thumbnail + PDF chip render, and verify the download link
 * resolves to a signed URL with HTTP 200.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
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

const pngBuf = readFileSync(join(process.cwd(), 'tests/fixtures/sample.png'));
const pdfBuf = readFileSync(join(process.cwd(), 'tests/fixtures/sample.pdf'));

test.describe('Phase 2C PR-B - message attachments', () => {
  const attachmentPaths: string[] = [];
  const messageIds: string[] = [];

  test.afterAll(async () => {
    const sb = adminClient();
    if (attachmentPaths.length > 0) {
      await sb.storage.from('message-attachments').remove(attachmentPaths);
    }
    if (messageIds.length > 0) {
      await sb.from('messages').delete().in('id', messageIds);
    }
  });

  test('paperclip uploads + image thumbnail + PDF chip + download', async ({
    clientPage,
    baseURL,
  }) => {
    const ctx = await getAcmeEngagement();
    test.skip(!ctx, 'Acme has no engagement seeded.');
    const { orgId, engagementId } = ctx!;

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto(`/portal/messages/${engagementId}`);
    await expect(clientPage.locator('[data-testid="message-attach-button"]')).toBeVisible();

    const fileInput = clientPage.locator('[data-testid="message-attach-input"]');
    await fileInput.setInputFiles([
      { name: 'sample.png', mimeType: 'image/png', buffer: pngBuf },
      { name: 'sample.pdf', mimeType: 'application/pdf', buffer: pdfBuf },
    ]);

    // Wait for both uploads to flip to "Ready".
    await expect(
      clientPage.locator('[data-testid="message-attach-list"] li', { hasText: 'Ready' }),
    ).toHaveCount(2, { timeout: 20_000 });

    const body = `attachment smoke ${Date.now()}`;
    await clientPage
      .locator('textarea')
      .first()
      .fill(body);
    const sendButton = clientPage.getByRole('button', { name: /^Send$/i });
    await sendButton.click();

    // Image thumbnail + PDF chip render once the message lands.
    await expect(
      clientPage.locator('[data-testid="message-attachment-image"]').first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      clientPage.locator('[data-testid="message-attachment-chip"]'),
    ).toBeVisible({ timeout: 15_000 });

    // Track for cleanup.
    const sb = adminClient();
    const { data: thread } = await sb
      .from('threads')
      .select('id')
      .eq('engagement_id', engagementId)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (thread?.id) {
      const { data: msgs } = await sb
        .from('messages')
        .select('id, attachments')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(5);
      for (const m of (msgs ?? []) as Array<{ id: string; attachments: unknown }>) {
        if (Array.isArray(m.attachments) && m.attachments.length > 0) {
          messageIds.push(m.id);
          for (const a of m.attachments as Array<{ path?: string }>) {
            if (typeof a.path === 'string') attachmentPaths.push(a.path);
          }
        }
      }
    }

    // The chip carries data-testid=message-attachment-download as a child icon.
    // Verify the resolver returns a signed URL with 200.
    if (attachmentPaths.length > 0) {
      const path = attachmentPaths[0];
      const resp = await clientPage.request.get(
        `/api/portal/messages/attachments/url?path=${encodeURIComponent(path)}`,
      );
      expect(resp.ok()).toBeTruthy();
      const json = (await resp.json()) as { url?: string };
      expect(typeof json.url).toBe('string');
      expect((json.url ?? '').length).toBeGreaterThan(0);
    }

    // Sanity: org was the right one for the path layout.
    expect(attachmentPaths.every((p) => p.startsWith(`${orgId}/`))).toBe(true);
  });
});
