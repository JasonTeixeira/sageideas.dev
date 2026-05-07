/**
 * Phase 2C PR-A — file versioning + restore.
 *
 * Uploads two files with the same name; expands the versions disclosure;
 * verifies v2 is shown and v1 carries a Restore button.
 */

import { test, expect, setActiveOrgCookie, ACME_SLUG } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error('Missing supabase env');
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

test.describe('Phase 2C PR-A — versioning + restore', () => {
  let orgId = '';
  const filename = `phase2c-version-${randomUUID().slice(0, 8)}.txt`;

  test.beforeAll(async () => {
    orgId = await findAcmeOrgId();
  });

  test.afterAll(async () => {
    const sb = adminClient();
    const { data: rows } = await sb
      .from('files')
      .select('id, storage_path')
      .eq('organization_id', orgId)
      .eq('name', filename);
    if (rows && rows.length > 0) {
      const paths = rows
        .map((r) => r.storage_path as string | null)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await sb.storage.from('client-uploads').remove(paths);
      }
      await sb.from('files').delete().in(
        'id',
        rows.map((r) => r.id as string),
      );
    }
  });

  test('same-name re-upload bumps version, restore is offered for older', async ({
    clientPage,
    baseURL,
  }) => {
    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/documents');
    await expect(clientPage.locator('[data-testid="document-uploader"]')).toBeVisible();

    const input = clientPage.locator('[data-testid="upload-input"]');

    // First upload
    await input.setInputFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from('version 1', 'utf8'),
    });
    await expect(
      clientPage.locator('[data-testid="file-row"]', { hasText: filename }),
    ).toBeVisible({ timeout: 15_000 });

    // Second upload (same name -> replace)
    await input.setInputFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from('version 2 contents', 'utf8'),
    });
    // The latest row should now show v2
    await expect(
      clientPage.locator('[data-testid="file-row"]', { hasText: filename }),
    ).toContainText(/v2/, { timeout: 15_000 });

    // Expand versions
    const fileRow = clientPage
      .locator('[data-testid="file-row"]', { hasText: filename })
      .first();
    await fileRow.locator('[data-testid="versions-toggle"]').click();
    const versionRows = fileRow.locator('[data-testid="version-row"]');
    await expect(versionRows.first()).toBeVisible({ timeout: 10_000 });
    await expect(versionRows).toHaveCount(2, { timeout: 10_000 });

    // Restore button is visible for the non-latest version.
    const restoreBtn = fileRow.locator('[data-testid="restore-version"]').first();
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    // After restore the chain has a v3 entry.
    await expect(
      clientPage.locator('[data-testid="file-row"]', { hasText: filename }),
    ).toContainText(/v3/, { timeout: 15_000 });
  });
});
