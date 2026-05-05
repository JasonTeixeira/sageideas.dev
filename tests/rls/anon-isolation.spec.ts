// Same RLS checks as tests/rls/run.mjs but as a Playwright test for CI.
// Skipped from default e2e config testDir; included for completeness.
import { test, expect } from '@playwright/test';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hocrntqhgvmeaxwlhzwl.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_B25xhSjOc977b-IDH76Hlg_kzn6ency';

const BASE = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

const READ_TABLES = [
  'profiles',
  'engagements',
  'invoices',
  'messages',
  'audit_log',
  'time_entries',
];

for (const table of READ_TABLES) {
  test(`RLS: anon SELECT on ${table} returns empty or denied`, async ({ request }) => {
    const res = await request.get(`${BASE}/${table}?select=*&limit=1`, { headers: HEADERS });
    if (res.status() === 401 || res.status() === 403) {
      expect(true).toBe(true);
      return;
    }
    if (!res.ok()) {
      expect(res.status()).toBeLessThan(500);
      return;
    }
    const body = await res.json();
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });
}

const WRITE_CASES: Array<{ table: string; payload: Record<string, unknown> }> = [
  { table: 'profiles', payload: { email: 'fake@example.com', full_name: 'Fake' } },
  { table: 'engagements', payload: { name: 'Fake', client_id: '00000000-0000-0000-0000-000000000000' } },
  { table: 'invoices', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', amount_cents: 1 } },
  { table: 'contracts', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', body: 'fake' } },
];

for (const { table, payload } of WRITE_CASES) {
  test(`RLS: anon INSERT on ${table} blocked`, async ({ request }) => {
    const res = await request.post(`${BASE}/${table}`, {
      headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      data: payload,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
}
