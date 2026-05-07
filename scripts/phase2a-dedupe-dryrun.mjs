#!/usr/bin/env node
/**
 * Phase 2A.4 — non-destructive dry-run for migration 0006_app_users_dedupe.sql.
 *
 * Reads (via service role) every app_users row pair where one is `seed_*` and
 * the other is a real auth UUID, then for each pair counts how many FK rows
 * would be moved across each affected table. Prints a report; touches nothing.
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY=... node scripts/phase2a-dedupe-dryrun.mjs
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hocrntqhgvmeaxwlhzwl.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(2);
}
const REST = `${URL}/rest/v1`;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(path) {
  const res = await fetch(`${REST}${path}`, { headers: H });
  if (!res.ok) {
    return { error: `${res.status} ${await res.text()}`, data: [] };
  }
  return { data: await res.json() };
}

async function count(table, col, val) {
  const res = await fetch(`${REST}/${table}?${col}=eq.${val}&select=id`, {
    headers: { ...H, Prefer: 'count=exact' },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range') ?? '';
  const m = range.match(/\/(\d+|\*)$/);
  if (m && m[1] !== '*') return parseInt(m[1], 10);
  const body = await res.json();
  return Array.isArray(body) ? body.length : 0;
}

async function main() {
  // Pull all app_users rows, then pair them in JS by lower(email).
  const { data: rows, error } = await rest(
    `/app_users?select=id,clerk_id,email,role,created_at&order=email`,
  );
  if (error) {
    console.error(`Failed to read app_users: ${error}`);
    process.exit(1);
  }

  const byEmail = new Map();
  for (const r of rows) {
    const k = (r.email ?? '').toLowerCase();
    if (!byEmail.has(k)) byEmail.set(k, []);
    byEmail.get(k).push(r);
  }

  const pairs = [];
  for (const [email, list] of byEmail) {
    if (list.length < 2) continue;
    const seeds = list.filter((r) => r.clerk_id?.startsWith('seed_'));
    const auths = list.filter((r) => !r.clerk_id?.startsWith('seed_'));
    if (seeds.length === 0 || auths.length === 0) continue;
    for (const seed of seeds) {
      // Pair with the oldest non-seed row.
      const auth = auths.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      pairs.push({ email, seed, auth });
    }
  }

  console.log(`Phase 2A.4 dry-run report — ${URL}`);
  console.log(`Total app_users rows: ${rows.length}`);
  console.log(`Distinct emails: ${byEmail.size}`);
  console.log(`Seed/auth duplicate pairs: ${pairs.length}`);
  console.log('');

  for (const [i, { email, seed, auth }] of pairs.entries()) {
    const [
      memberships,
      itersSubmitted,
      itersReviewed,
      files,
      documents,
      sigs,
      messages,
      activity,
    ] = await Promise.all([
      count('org_memberships', 'user_id', seed.id),
      count('iterations', 'submitted_by', seed.id),
      count('iterations', 'reviewed_by', seed.id),
      count('files', 'uploaded_by', seed.id),
      count('documents', 'created_by', seed.id),
      count('signature_audits', 'signer_id', seed.id),
      count('messages', 'sender_id', seed.id),
      count('activity', 'actor_id', seed.id),
    ]);

    console.log(`#${i + 1} ${email}`);
    console.log(`  seed: id=${seed.id} clerk_id=${seed.clerk_id}`);
    console.log(`  auth: id=${auth.id} clerk_id=${auth.clerk_id}`);
    console.log(
      `  rows to repoint: memberships=${memberships}, iters(sub/rev)=${itersSubmitted}/${itersReviewed},`,
    );
    console.log(
      `                  files=${files}, docs=${documents}, sigs=${sigs}, msgs=${messages}, act=${activity}`,
    );
  }

  if (pairs.length === 0) {
    console.log('No duplicates found — migration would only add the unique index.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
