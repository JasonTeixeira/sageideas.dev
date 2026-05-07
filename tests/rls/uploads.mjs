// Phase 2C PR-A — RLS isolation for client-uploads bucket.
//
// Verifies that:
//   - client1 (member of Acme) can read objects in Acme's path
//   - client1 CANNOT read objects in client2's Beta-owner path
//   - anon SELECT returns 0 rows from public.files
//
// Run: node tests/rls/uploads.mjs

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hocrntqhgvmeaxwlhzwl.supabase.co';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvY3JudHFoZ3ZtZWF4d2xoendsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQ2NDIsImV4cCI6MjA5MzQyMDY0Mn0.JIOiUMprrKENyBgkkHvwM1ZfZikS4NdA1HpsaQl2DNg';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const REST = `${SUPABASE_URL}/rest/v1`;
const AUTH = `${SUPABASE_URL}/auth/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const BUCKET = 'client-uploads';

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
  return (await res.json()).access_token;
}

async function adminFetch(path, init = {}) {
  if (!SERVICE_KEY) return null;
  const res = await fetch(`${REST}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function findOrgBySlug(slug) {
  const data = await adminFetch(
    `/organizations?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
  );
  return data?.[0]?.id ?? null;
}

async function findOrgClient1IsNotIn() {
  const c1 = await adminFetch(
    `/app_users?email=ilike.${encodeURIComponent('client1+test@sageideas.org')}&select=id&limit=1`,
  );
  const c1Id = c1?.[0]?.id;
  if (!c1Id) return { id: null, ephemeral: false };
  const c1Memberships = await adminFetch(
    `/org_memberships?user_id=eq.${c1Id}&select=organization_id`,
  );
  const ownedIds = new Set((c1Memberships ?? []).map((r) => r.organization_id));
  const allOrgs = await adminFetch(`/organizations?select=id,slug&limit=200`);
  for (const o of allOrgs ?? []) {
    if (!ownedIds.has(o.id)) return { id: o.id, ephemeral: false };
  }
  // None found — create a one-off org just for this assertion. We do NOT
  // add a membership so client1 has no claim on it.
  const stamp = Date.now();
  const slug = `phase2c-rls-${stamp}`;
  const created = await fetch(`${REST}/organizations`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ name: `RLS test ${stamp}`, slug }),
  });
  if (!created.ok) return { id: null, ephemeral: false };
  const body = await created.json();
  const id = Array.isArray(body) ? body[0]?.id : body?.id;
  return { id: id ?? null, ephemeral: true };
}

async function deleteOrgIfEphemeral(orgId) {
  if (!orgId) return;
  await fetch(`${REST}/organizations?id=eq.${orgId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function uploadAsService(orgId, filename, body) {
  if (!SERVICE_KEY) throw new Error('Need service role to seed an object');
  const path = `${orgId}/general/${filename}`;
  const res = await fetch(`${STORAGE}/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'text/plain',
      'x-upsert': 'true',
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`seed upload ${path} failed: ${res.status} ${await res.text()}`);
  }
  return path;
}

async function deleteAsService(path) {
  if (!SERVICE_KEY) return;
  await fetch(`${STORAGE}/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function downloadAsToken(token, path) {
  const res = await fetch(`${STORAGE}/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status };
}

async function anonSelectFiles() {
  const res = await fetch(`${REST}/files?select=id&limit=1`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  let body = [];
  try {
    body = await res.json();
  } catch {
    body = [];
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  if (!SERVICE_KEY) {
    console.log('SUPABASE_SERVICE_ROLE_KEY missing — skipping seeded checks.');
  }

  console.log('Phase 2C uploads RLS suite');

  // 1. anon SELECT on public.files returns 0 rows.
  const anon = await anonSelectFiles();
  if (anon.ok && Array.isArray(anon.body) && anon.body.length === 0) {
    ok('public.files: anon SELECT returned []');
  } else {
    bad(`public.files: anon SELECT not blocked — status ${anon.status}, body ${JSON.stringify(anon.body).slice(0, 80)}`);
  }

  // 2. seed an Acme object + an out-of-membership object (service role) and
  // verify cross-org reads. client1 is a member of Acme + Beta after 0009, so
  // we need a third org where client1 is NOT a member.
  const acmeOrgId = await findOrgBySlug('acme-test-co');
  const other = await findOrgClient1IsNotIn();
  if (!acmeOrgId) {
    bad('could not find acme-test-co — skipping cross-org checks');
  } else if (!other?.id) {
    bad('could not find or create a non-member org — skipping cross-org checks');
  } else if (!SERVICE_KEY) {
    console.log('  SKIP  cross-org checks (need service key)');
  } else {
    const stamp = Date.now();
    const acmePath = await uploadAsService(acmeOrgId, `acme-rls-${stamp}.txt`, 'acme');
    const otherPath = await uploadAsService(other.id, `other-rls-${stamp}.txt`, 'other');

    const client1Token = await signIn(ACCOUNTS.client1.email, ACCOUNTS.client1.password);

    const acmeRead = await downloadAsToken(client1Token, acmePath);
    if (acmeRead.ok) ok('client1 reads Acme object (200)');
    else bad(`client1 reads Acme object: status ${acmeRead.status}`);

    const otherRead = await downloadAsToken(client1Token, otherPath);
    if (!otherRead.ok) ok(`client1 blocked from non-member org object (${otherRead.status})`);
    else bad('client1 was NOT blocked from non-member org object');

    await deleteAsService(acmePath);
    await deleteAsService(otherPath);
    if (other.ephemeral) {
      await deleteOrgIfEphemeral(other.id);
    }
  }

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
