/**
 * Phase 2B PR-C — client-initiated message threads.
 *
 * Asserts that a client can open a new thread modal from /portal/messages,
 * fill subject + body + engagement, submit, and land on the engagement's
 * thread route. The new thread is then verified via the service role:
 *  - the threads row exists with the expected subject + organization,
 *  - the messages row exists with the expected body,
 *  - notifications fan-out created at least one row for an admin user.
 *
 * Newly created rows are cleaned up in afterAll so the test is rerunnable.
 */

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

// Pin to Acme. After migration 0009 client1 belongs to Acme + Beta; the
// new-thread modal is server-rendered with the active org's engagements,
// so the engagement we look up must match the org we set as active.
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

test.describe('Phase 2B PR-C — client-initiated thread create', () => {
  let createdThreadId: string | null = null;
  let notifIdsForCleanup: string[] = [];
  const subject = `PR-C client thread ${Date.now()}`;
  const messageBody = 'Body from client-thread-create.spec — please ignore.';

  test.afterAll(async () => {
    const sb = adminClient();
    if (notifIdsForCleanup.length) {
      await sb.from('notifications').delete().in('id', notifIdsForCleanup);
    }
    if (createdThreadId) {
      await sb.from('messages').delete().eq('thread_id', createdThreadId);
      await sb.from('threads').delete().eq('id', createdThreadId);
    }
  });

  test('client opens new thread, redirects to engagement, message + admin notification appear', async ({
    clientPage,
    baseURL,
  }) => {
    const ctx = await getAcmeEngagement();
    test.skip(!ctx, 'Acme has no engagement to thread against — seed not run.');

    await setActiveOrgCookie(clientPage.context(), baseURL!, ACME_SLUG);
    await clientPage.goto('/portal/messages');
    await expect(clientPage.getByTestId('new-thread-button')).toBeVisible({ timeout: 15_000 });
    await clientPage.getByTestId('new-thread-button').click();
    await expect(clientPage.getByTestId('new-thread-modal')).toBeVisible();

    // Engagement select defaults to first option; pick the one we resolved
    // via service role so the assertions later line up.
    if (ctx) {
      await clientPage.getByTestId('new-thread-engagement').selectOption(ctx.engagementId);
    }
    await clientPage.getByTestId('new-thread-subject').fill(subject);
    await clientPage.getByTestId('new-thread-body').fill(messageBody);
    await clientPage.getByTestId('new-thread-submit').click();

    // Redirects to /portal/messages/<engagementId>
    await clientPage.waitForURL(/\/portal\/messages\/[a-f0-9-]+/i, { timeout: 15_000 });
    if (ctx) {
      expect(clientPage.url()).toContain(`/portal/messages/${ctx.engagementId}`);
    }

    // Verify via service role that the row stack landed.
    const sb = adminClient();
    const { data: thread } = await sb
      .from('threads')
      .select('id, subject, organization_id, engagement_id')
      .eq('subject', subject)
      .maybeSingle();
    expect(thread).toBeTruthy();
    if (thread) {
      createdThreadId = (thread as { id: string }).id;
      if (ctx) {
        expect((thread as { organization_id: string }).organization_id).toBe(ctx.orgId);
        expect((thread as { engagement_id: string }).engagement_id).toBe(ctx.engagementId);
      }
    }

    if (createdThreadId) {
      const { data: messages } = await sb
        .from('messages')
        .select('id, body')
        .eq('thread_id', createdThreadId);
      expect((messages ?? []).length).toBeGreaterThanOrEqual(1);
      expect((messages ?? []).some((m) => (m as { body: string }).body === messageBody)).toBe(
        true,
      );

      const { data: notifs } = await sb
        .from('notifications')
        .select('id, user_id, kind, title')
        .eq('kind', 'thread_created')
        .ilike('title', `%${subject}%`);
      const arr = notifs ?? [];
      expect(arr.length).toBeGreaterThanOrEqual(1);
      notifIdsForCleanup = arr.map((n) => (n as { id: string }).id);

      // At least one notification must target an admin user.
      const userIds = arr.map((n) => (n as { user_id: string }).user_id);
      if (userIds.length) {
        const { data: admins } = await sb
          .from('app_users')
          .select('clerk_id')
          .eq('role', 'admin')
          .in('clerk_id', userIds);
        expect((admins ?? []).length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
