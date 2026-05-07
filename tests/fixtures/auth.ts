/* eslint-disable react-hooks/rules-of-hooks -- `use` is the Playwright fixture callback, not React's hook. */
/**
 * Phase 0 — Playwright auth fixture.
 *
 * Mints a Supabase session via the admin API and injects it into the browser
 * context so tests can hit `/admin/*` and `/portal/*` without round-tripping
 * through email magic-link or OAuth.
 *
 * Fixtures provided:
 *   - `adminPage`    → page authenticated as `sage+admin@sageideas.org`
 *   - `clientPage`   → page authenticated as `client1+test@sageideas.org`
 *   - `pendingPage`  → page authenticated as `pending+test@sageideas.org`
 *
 * Required env (load from `vercel env pull` or `.env.local`):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth';
 *   test('admin can see users page', async ({ adminPage }) => {
 *     await adminPage.goto('/admin/users');
 *     await expect(adminPage.getByRole('heading', { name: /users/i })).toBeVisible();
 *   });
 */

import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const TEST_USERS = {
  admin: { email: 'sage+admin@sageideas.org', password: 'Test!Admin#2026' },
  client: { email: 'client1+test@sageideas.org', password: 'Test!Client#2026' },
  client2: { email: 'client2+test@sageideas.org', password: 'Test!Client#2026' },
  pending: { email: 'pending+test@sageideas.org', password: 'Test!Pending#2026' },
} as const;

type UserKey = keyof typeof TEST_USERS;

interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: unknown;
}

/**
 * Mint a Supabase session by signing in with email+password against the public auth API.
 * We hit the REST endpoint directly so we don't import @supabase/ssr (which requires Next cookies).
 */
async function mintSession(email: string, password: string): Promise<SupabaseAuthSession> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — run `vercel env pull` first.',
    );
  }

  // Ensure the user exists / password is current via the service role.
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (service) {
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Look up the user; if missing, the seed script hasn't run — bail loudly.
    let found: { id: string } | undefined;
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const u = data?.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (u) {
        found = { id: u.id };
        break;
      }
      if (!data || data.users.length < 200) break;
    }
    if (!found) {
      throw new Error(
        `Test user ${email} not found in Supabase — run \`npm run seed:test-data\` before tests.`,
      );
    }
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to mint session for ${email}: ${res.status} ${body}`);
  }
  return (await res.json()) as SupabaseAuthSession;
}

/**
 * Inject the session into the browser by setting the cookie that @supabase/ssr expects.
 * The cookie name follows the format `sb-<project-ref>-auth-token` and the value is a
 * base64-prefixed JSON array containing the access + refresh tokens (Supabase v2 format).
 */
async function attachSession(context: BrowserContext, baseURL: string, session: SupabaseAuthSession) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = new URL(url).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  // @supabase/ssr v0.5+ stores the session as base64-prefixed JSON.
  const json = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  });
  const value = `base64-${Buffer.from(json, 'utf8').toString('base64')}`;

  const { hostname } = new URL(baseURL);
  await context.addCookies([
    {
      name: cookieName,
      value,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: baseURL.startsWith('https://'),
      sameSite: 'Lax',
      expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
}

async function authedPage(context: BrowserContext, baseURL: string, who: UserKey): Promise<Page> {
  const acct = TEST_USERS[who];
  const session = await mintSession(acct.email, acct.password);
  await attachSession(context, baseURL, session);
  return await context.newPage();
}

type Fixtures = {
  adminPage: Page;
  clientPage: Page;
  client2Page: Page;
  pendingPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error('baseURL must be configured in playwright config');
    const page = await authedPage(context, baseURL, 'admin');
    await use(page);
    await page.close();
  },
  clientPage: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error('baseURL must be configured in playwright config');
    const page = await authedPage(context, baseURL, 'client');
    await use(page);
    await page.close();
  },
  client2Page: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error('baseURL must be configured in playwright config');
    const page = await authedPage(context, baseURL, 'client2');
    await use(page);
    await page.close();
  },
  pendingPage: async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error('baseURL must be configured in playwright config');
    const page = await authedPage(context, baseURL, 'pending');
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
