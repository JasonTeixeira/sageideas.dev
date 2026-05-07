import { test, expect } from '../../fixtures/auth';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe('No phantom Workspace org (Phase 2A.4)', () => {
  test('client1+test sees Acme Test Co, not a phantom workspace', async ({ clientPage }) => {
    await clientPage.goto('/portal');
    // Sidebar org label, visible at >=lg viewport (default Playwright is 1280x720).
    await expect(clientPage.getByText(/Acme Test Co/i).first()).toBeVisible();
    await expect(clientPage.getByText(/Workspace/i, { exact: false })).not.toContainText(
      /Client.s Workspace/i,
    );
  });

  test('exactly one app_users row exists for client1+test email', async () => {
    const sb = adminClient();
    const { data, error } = await sb
      .from('app_users')
      .select('id, clerk_id, email')
      .ilike('email', 'client1+test@sageideas.org');
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });
});
