/**
 * Phase 2C PR-A — drag-drop upload on /portal/documents.
 *
 * Asserts that a small file uploaded by client1 (Acme-pinned) appears in the
 * Files list and that the storage usage chip increments.
 */

import { test, expect, setActiveOrgCookie, ACME_SLUG } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findAcmeOrgId(): Promise<string> {
  const sb = adminClient();
  const { data } = await sb.from('organizations').select('id').eq('slug', ACME_SLUG).maybeSingle();
  if (!data?.id) throw new Error('Acme org not found');
  return data.id as string;
}

test.describe('Phase 2C PR-A — document uploader', () => {
  let orgId = '';
  const createdFileIds: string[] = [];

  test.beforeAll(async () => {
    orgId = await findAcmeOrgId();
  });

  test.afterAll(async () => {
    if (createdFileIds.length === 0) return;
    const sb = adminClient();
    const { data: rows } = await sb
      .from('files')
      .select('id, storage_path')
      .in('id', createdFileIds);
    if (rows && rows.length > 0) {
      const paths = rows
        .map((r) => r.storage_path as string | null)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await sb.storage.from('client-uploads').remove(paths);
      }
      await sb.from('files').delete().in('id', createdFileIds);
    }
  });

  test('uploads a file and shows it in the list', async ({ clientPage, baseURL }) => {
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/documents');
    await expect(clientPage.locator('[data-testid="document-uploader"]')).toBeVisible();

    const filename = `phase2c-upload-${randomUUID().slice(0, 8)}.txt`;
    const payload = `Phase 2C upload smoke test ${Date.now()}`;

    const input = clientPage.locator('[data-testid="upload-input"]');
    await input.setInputFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from(payload, 'utf8'),
    });

    await expect(clientPage.locator('[data-testid="file-row"]', { hasText: filename })).toBeVisible({
      timeout: 15_000,
    });

    // Track for cleanup.
    const sb = adminClient();
    const { data: created } = await sb
      .from('files')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', filename)
      .limit(5);
    for (const r of created ?? []) {
      if (r.id) createdFileIds.push(r.id as string);
    }

    // Storage chip should now reflect non-zero usage.
    const chip = clientPage.locator('[data-testid="storage-usage-chip"]');
    await expect(chip).toBeVisible();
    await expect(chip).not.toContainText(/^0 B of/);
  });
});
