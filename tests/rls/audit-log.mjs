// Phase 2B PR-A — audit_log RLS isolation.
//
// Verifies the al_org_member_read policy added in 0008_audit_log_org_view.sql:
//   - client1 can read audit_log rows for Acme Test Co
//   - client1 CANNOT read audit_log rows for Beta Test Co (other org)
//   - and the symmetric checks for client2.
//
// Implementation seeds one row per org via the service role, signs in as each
// client, then asserts visibility / hiding under RLS using the user's own JWT.
//
// Run: node tests/rls/audit-log.mjs

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

const ACTION_TAG = `rls_audit_check_${Date.now()}`;

let pass = 0;
let fail = 0;
const failures = [];
const cleanup = []; // ids to delete in finally

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

async function adminFetch(path, init = {}) {
  if (!SERVICE_KEY) return null;
  const res = await fetch(`${REST}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`admin ${init.method ?? 'GET'} ${path} -> ${res.status} ${txt}`);
  }
  if (res.status === 204) return null;
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

async function seedRow(orgId, label) {
  const inserted = await adminFetch(`/audit_log?select=id`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      action: ACTION_TAG,
      entity_type: 'rls_test',
      entity_id: label,
      organization_id: orgId,
      actor_email: 'rls-suite@sageideas.dev',
      after: { synthetic: true, label },
    }),
  });
  const id = inserted?.[0]?.id;
  if (id) cleanup.push(id);
  return id;
}

async function authedSelect(token, path) {
  const res = await fetch(`${REST}${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
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

async function expectVisible(token, rowId, label) {
  const r = await authedSelect(token, `/audit_log?id=eq.${rowId}&select=id`);
  if (Array.isArray(r.body) && r.body.length === 1) return ok(`${label}: visible`);
  return bad(`${label}: NOT visible (status=${r.status}, body=${JSON.stringify(r.body)})`);
}

async function expectBlocked(token, rowId, label) {
  const r = await authedSelect(token, `/audit_log?id=eq.${rowId}&select=id`);
  if (!r.ok) return ok(`${label}: blocked (${r.status})`);
  if (Array.isArray(r.body) && r.body.length === 0)
    return ok(`${label}: hidden by RLS (empty array)`);
  return bad(`${label}: leaked ${Array.isArray(r.body) ? r.body.length : 'non-array'} rows`);
}

async function main() {
  console.log(`Audit log RLS tests against ${SUPABASE_URL}`);
  if (!SERVICE_KEY) {
    console.log('  SKIP: SUPABASE_SERVICE_ROLE_KEY missing.');
    process.exit(0);
  }

  const orgA = await findOrgIdForEmail(ACCOUNTS.client1.email);
  const orgB = await findOrgIdForEmail(ACCOUNTS.client2.email);
  if (!orgA || !orgB) {
    console.log('  SKIP: cannot resolve org ids (seed not run).');
    process.exit(0);
  }
  if (orgA === orgB) {
    console.log('  SKIP: client1 and client2 share an org — invalid fixture.');
    process.exit(0);
  }

  let rowA;
  let rowB;
  try {
    rowA = await seedRow(orgA, 'orgA-fixture');
    rowB = await seedRow(orgB, 'orgB-fixture');
    if (!rowA || !rowB) {
      console.log('  SKIP: seed insert returned no id');
      process.exit(0);
    }

    const tokenA = await signIn(ACCOUNTS.client1.email, ACCOUNTS.client1.password);
    await expectVisible(tokenA, rowA, 'client1 -> orgA audit row');
    await expectBlocked(tokenA, rowB, 'client1 -> orgB audit row');

    const tokenB = await signIn(ACCOUNTS.client2.email, ACCOUNTS.client2.password);
    await expectVisible(tokenB, rowB, 'client2 -> orgB audit row');
    await expectBlocked(tokenB, rowA, 'client2 -> orgA audit row');
  } finally {
    for (const id of cleanup) {
      try {
        await adminFetch(`/audit_log?id=eq.${id}`, { method: 'DELETE' });
      } catch {}
    }
  }

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
