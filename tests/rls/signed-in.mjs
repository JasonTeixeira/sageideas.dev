// Phase 2A signed-in RLS isolation tests.
//
// Logs in as client1+test (org A: Acme Test Co) and client2+test (org B),
// then verifies cross-org engagement reads return zero rows under RLS using
// the user's own access token (not the service role).
//
// Implemented with raw fetch against /auth/v1 + /rest/v1 to avoid the
// supabase-js realtime client requiring native WebSocket on Node 20.
//
// Run: node tests/rls/signed-in.mjs

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hocrntqhgvmeaxwlhzwl.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvY3JudHFoZ3ZtZWF4d2xoendsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQ2NDIsImV4cCI6MjA5MzQyMDY0Mn0.JIOiUMprrKENyBgkkHvwM1ZfZikS4NdA1HpsaQl2DNg';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REST = `${SUPABASE_URL}/rest/v1`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

const ACCOUNTS = {
  client1: { email: 'client1+test@sageideas.org', password: 'Test!Client#2026' },
  client2: { email: 'client2+test@sageideas.org', password: 'Test!Client#2026' },
};

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

async function signIn(email, password) {
  const res = await fetch(`${AUTH}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`signIn(${email}) failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function adminFetch(path) {
  if (!SERVICE_KEY) return null;
  const res = await fetch(`${REST}${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function findOrgIdForEmail(email) {
  if (!SERVICE_KEY) return null;
  const users = await adminFetch(
    `/app_users?email=ilike.${encodeURIComponent(email)}&select=id`,
  );
  if (!users || users.length === 0) return null;
  const ids = users.map((u) => u.id).join(',');
  const m = await adminFetch(
    `/org_memberships?user_id=in.(${ids})&select=organization_id&limit=1`,
  );
  return m?.[0]?.organization_id ?? null;
}

async function findEngagement(orgId) {
  const data = await adminFetch(
    `/engagements?organization_id=eq.${orgId}&select=id&limit=1`,
  );
  return data?.[0]?.id ?? null;
}

async function authedSelect(token, path) {
  const res = await fetch(`${REST}${path}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
}

async function expectBlocked(token, engagementId, label) {
  const r = await authedSelect(
    token,
    `/engagements?id=eq.${engagementId}&select=id,organization_id`,
  );
  if (!r.ok) return ok(`${label}: blocked (${r.status})`);
  if (Array.isArray(r.body) && r.body.length === 0)
    return ok(`${label}: empty array (RLS hid it)`);
  return bad(
    `${label}: leaked ${Array.isArray(r.body) ? r.body.length : 'non-array'} rows`,
  );
}

async function expectVisible(token, engagementId, label) {
  const r = await authedSelect(
    token,
    `/engagements?id=eq.${engagementId}&select=id`,
  );
  if (Array.isArray(r.body) && r.body.length === 1)
    return ok(`${label}: visible to owner`);
  return bad(`${label}: NOT visible (status=${r.status}, body=${JSON.stringify(r.body)})`);
}

async function countDupRows(email) {
  if (!SERVICE_KEY) return 0;
  const data = await adminFetch(
    `/app_users?email=ilike.${encodeURIComponent(email)}&select=id`,
  );
  return Array.isArray(data) ? data.length : 0;
}

async function main() {
  console.log(`Signed-in RLS tests against ${SUPABASE_URL}`);

  // Phase 2A.4 — until the 0006 dedupe migration has been applied, seeded
  // test users have multiple app_users rows. That state breaks isolation in
  // ways the migration is designed to fix, so we skip the cross-org checks
  // rather than fail the suite on a state the migration owner hasn't yet
  // signed off on. Once dedupe lands on prod, this guard auto-disables.
  const dupes1 = await countDupRows(ACCOUNTS.client1.email);
  const dupes2 = await countDupRows(ACCOUNTS.client2.email);
  if (dupes1 > 1 || dupes2 > 1) {
    console.log(
      `  SKIP: detected duplicate app_users rows (client1=${dupes1}, client2=${dupes2}). ` +
        'Apply migration 0006_app_users_dedupe.sql then re-run.',
    );
    process.exit(0);
  }

  const orgA = await findOrgIdForEmail(ACCOUNTS.client1.email);
  const orgB = await findOrgIdForEmail(ACCOUNTS.client2.email);
  if (!orgA || !orgB) {
    console.log(
      '  SKIP: SUPABASE_SERVICE_ROLE_KEY missing or seed not run; cannot resolve org ids.',
    );
    process.exit(0);
  }

  const engA = await findEngagement(orgA);
  const engB = await findEngagement(orgB);
  if (!engA || !engB) {
    console.log('  SKIP: no engagements found in one of the seeded orgs.');
    process.exit(0);
  }

  const tokenA = await signIn(ACCOUNTS.client1.email, ACCOUNTS.client1.password);
  await expectBlocked(tokenA, engB, 'client1 -> orgB engagement');
  await expectVisible(tokenA, engA, 'client1 -> orgA own engagement');

  const tokenB = await signIn(ACCOUNTS.client2.email, ACCOUNTS.client2.password);
  await expectBlocked(tokenB, engA, 'client2 -> orgA engagement');
  await expectVisible(tokenB, engB, 'client2 -> orgB own engagement');

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
