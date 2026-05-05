// RLS isolation tests for Sage Ideas Studio.
// Uses Supabase REST (PostgREST) directly with the anon key — verifies that an
// unauthenticated client cannot read or write protected tables.
//
// Run: node tests/rls/run.mjs

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hocrntqhgvmeaxwlhzwl.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_B25xhSjOc977b-IDH76Hlg_kzn6ency';

const BASE = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const READ_TABLES = [
  'profiles',
  'engagements',
  'invoices',
  'messages',
  'audit_log',
  'time_entries',
];

const WRITE_TABLES = [
  { table: 'profiles', payload: { email: 'fake@example.com', full_name: 'Fake' } },
  { table: 'engagements', payload: { name: 'Fake Engagement', client_id: '00000000-0000-0000-0000-000000000000' } },
  { table: 'invoices', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', amount_cents: 1 } },
  { table: 'contracts', payload: { engagement_id: '00000000-0000-0000-0000-000000000000', body: 'fake' } },
];

let pass = 0;
let fail = 0;
const failures = [];

function ok(msg) {
  pass += 1;
  console.log(`  PASS  ${msg}`);
}

function bad(msg) {
  fail += 1;
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
}

async function readBlocked(table) {
  // Anon read: RLS should either return empty, 401, or 403.
  // A non-empty array means data leaked.
  const url = `${BASE}/${table}?select=*&limit=1`;
  let res;
  try {
    res = await fetch(url, { headers: HEADERS });
  } catch (err) {
    return bad(`${table}: fetch threw ${String(err)}`);
  }
  if (res.status === 401 || res.status === 403) return ok(`${table}: anon SELECT blocked (${res.status})`);
  if (!res.ok) {
    // Could be 404 if table missing, 400 for bad request — treat as non-leak
    return ok(`${table}: anon SELECT non-200 (${res.status})`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return ok(`${table}: anon SELECT returned non-JSON (likely empty)`);
  }
  if (Array.isArray(body) && body.length === 0) {
    return ok(`${table}: anon SELECT returned empty []`);
  }
  return bad(`${table}: anon SELECT leaked ${Array.isArray(body) ? body.length : 'non-array'} rows`);
}

async function writeBlocked({ table, payload }) {
  const url = `${BASE}/${table}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return bad(`${table}: INSERT fetch threw ${String(err)}`);
  }
  if (res.status >= 400) return ok(`${table}: anon INSERT blocked (${res.status})`);
  return bad(`${table}: anon INSERT succeeded (${res.status}) — RLS leak`);
}

async function main() {
  console.log(`RLS tests against ${SUPABASE_URL}`);
  console.log('Reads:');
  for (const t of READ_TABLES) await readBlocked(t);
  console.log('Writes:');
  for (const w of WRITE_TABLES) await writeBlocked(w);

  console.log('');
  console.log(`Result: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
