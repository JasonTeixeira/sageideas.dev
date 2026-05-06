/**
 * Phase 0 — wipe everything tagged by `scripts/seed-test-data.ts`.
 *
 * Cleanup walks down from these markers (no schema changes required):
 *   - profiles.email matches `+admin@sageideas.org`, `+test@sageideas.org`, `+pending@sageideas.org`
 *   - organizations.slug = 'acme-test-co'
 *   - engagements.tags @> ARRAY['test_run_id:phase-0-seed']
 *   - invoices.number LIKE 'INV-TEST-%'
 *   - payments.stripe_payment_intent_id LIKE 'pi_test_INV-TEST-%'
 *
 * Order is critical (children before parents) because most FKs do not cascade.
 *
 * Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx tests/db/cleanup.ts
 */

// Node 20 ships without a global WebSocket; supabase-js v2 imports the realtime
// client at module load even when realtime isn't used. Polyfill before importing.
import WebSocket from 'ws';
// @ts-expect-error — wiring a global polyfill on a Node runtime that lacks WebSocket.
if (typeof globalThis.WebSocket === 'undefined') globalThis.WebSocket = WebSocket;

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TEST_RUN_ID = 'phase-0-seed';
const ORG_SLUG = 'acme-test-co';
const TEST_TAG = `test_run_id:${TEST_RUN_ID}`;
const TEST_EMAIL_PATTERNS = [
  '%+admin@sageideas.org',
  '%+test@sageideas.org',
  '%+pending@sageideas.org',
];

function need(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function findOrgIds(sb: SupabaseClient): Promise<string[]> {
  const { data, error } = await sb.from('organizations').select('id').eq('slug', ORG_SLUG);
  if (error) throw new Error(`find org: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

async function findEngagementIds(sb: SupabaseClient, orgIds: string[]): Promise<string[]> {
  const ids = new Set<string>();
  if (orgIds.length) {
    const { data, error } = await sb
      .from('engagements')
      .select('id')
      .in('organization_id', orgIds);
    if (error) throw new Error(`find engagements by org: ${error.message}`);
    (data ?? []).forEach((r) => ids.add(r.id));
  }
  // Also catch any test-tagged engagements that might be orphaned from a stale org row.
  const { data: tagged, error: tagErr } = await sb
    .from('engagements')
    .select('id')
    .contains('tags', [TEST_TAG]);
  if (tagErr) throw new Error(`find engagements by tag: ${tagErr.message}`);
  (tagged ?? []).forEach((r) => ids.add(r.id));
  return Array.from(ids);
}

async function findInvoiceIds(sb: SupabaseClient, orgIds: string[], engIds: string[]): Promise<string[]> {
  const ids = new Set<string>();
  const { data: byNumber } = await sb.from('invoices').select('id').like('number', 'INV-TEST-%');
  (byNumber ?? []).forEach((r) => ids.add(r.id));
  if (orgIds.length) {
    const { data } = await sb.from('invoices').select('id').in('organization_id', orgIds);
    (data ?? []).forEach((r) => ids.add(r.id));
  }
  if (engIds.length) {
    const { data } = await sb.from('invoices').select('id').in('engagement_id', engIds);
    (data ?? []).forEach((r) => ids.add(r.id));
  }
  return Array.from(ids);
}

async function findThreadIds(sb: SupabaseClient, orgIds: string[], engIds: string[]): Promise<string[]> {
  const ids = new Set<string>();
  if (orgIds.length) {
    const { data } = await sb.from('threads').select('id').in('organization_id', orgIds);
    (data ?? []).forEach((r) => ids.add(r.id));
  }
  if (engIds.length) {
    const { data } = await sb.from('threads').select('id').in('engagement_id', engIds);
    (data ?? []).forEach((r) => ids.add(r.id));
  }
  return Array.from(ids);
}

async function deleteIn(sb: SupabaseClient, table: string, column: string, ids: string[]) {
  if (!ids.length) return 0;
  const { error, count } = await sb.from(table).delete({ count: 'exact' }).in(column, ids);
  if (error) throw new Error(`delete ${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteAuthUsers(sb: SupabaseClient): Promise<number> {
  // listUsers is paginated; collect anything that matches our test patterns and delete by id.
  const matches: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      const email = (u.email ?? '').toLowerCase();
      const isTest =
        email.endsWith('+test@sageideas.org') ||
        email.endsWith('+admin@sageideas.org') ||
        email.endsWith('+pending@sageideas.org');
      if (isTest) matches.push(u.id);
    }
    if (data.users.length < 200) break;
  }
  let deleted = 0;
  for (const id of matches) {
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) {
      console.warn(`  ✖ deleteUser ${id}: ${error.message}`);
      continue;
    }
    deleted++;
  }
  return deleted;
}

async function main() {
  const url = need('NEXT_PUBLIC_SUPABASE_URL');
  const key = need('SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('▶ Phase 0 cleanup — TEST_RUN_ID:', TEST_RUN_ID);
  console.log('  target:', url);

  const orgIds = await findOrgIds(sb);
  const engIds = await findEngagementIds(sb, orgIds);
  const invoiceIds = await findInvoiceIds(sb, orgIds, engIds);
  const threadIds = await findThreadIds(sb, orgIds, engIds);

  console.log(
    `\n  found: ${orgIds.length} orgs, ${engIds.length} engagements, ${invoiceIds.length} invoices, ${threadIds.length} threads`,
  );

  // 1. Leaf-most rows first.
  const messages = await deleteIn(sb, 'messages', 'thread_id', threadIds);
  console.log(`  ✓ messages: ${messages}`);

  const threads = await deleteIn(sb, 'threads', 'id', threadIds);
  console.log(`  ✓ threads: ${threads}`);

  const lineItems = await deleteIn(sb, 'invoice_line_items', 'invoice_id', invoiceIds);
  console.log(`  ✓ invoice_line_items: ${lineItems}`);

  const payments = await deleteIn(sb, 'payments', 'invoice_id', invoiceIds);
  // Catch any orphan payment rows by deterministic PI prefix.
  const { count: orphanPay } = await sb
    .from('payments')
    .delete({ count: 'exact' })
    .like('stripe_payment_intent_id', 'pi_test_INV-TEST-%');
  console.log(`  ✓ payments: ${payments + (orphanPay ?? 0)}`);

  const invoices = await deleteIn(sb, 'invoices', 'id', invoiceIds);
  console.log(`  ✓ invoices: ${invoices}`);

  const deliverables = await deleteIn(sb, 'deliverables', 'engagement_id', engIds);
  console.log(`  ✓ deliverables: ${deliverables}`);

  const calendarEvents = await deleteIn(sb, 'calendar_events', 'engagement_id', engIds);
  console.log(`  ✓ calendar_events: ${calendarEvents}`);

  const documents = await deleteIn(sb, 'documents', 'engagement_id', engIds);
  console.log(`  ✓ documents: ${documents}`);

  const engagements = await deleteIn(sb, 'engagements', 'id', engIds);
  console.log(`  ✓ engagements: ${engagements}`);

  if (orgIds.length) {
    const memberships = await deleteIn(sb, 'org_memberships', 'organization_id', orgIds);
    console.log(`  ✓ org_memberships: ${memberships}`);
  }

  const orgs = await deleteIn(sb, 'organizations', 'id', orgIds);
  console.log(`  ✓ organizations: ${orgs}`);

  // 2. profiles tagged by email (these reference auth.users; auth deletion below cascades).
  let profileCount = 0;
  for (const pat of TEST_EMAIL_PATTERNS) {
    const { count } = await sb.from('profiles').delete({ count: 'exact' }).like('email', pat);
    profileCount += count ?? 0;
  }
  console.log(`  ✓ profiles: ${profileCount}`);

  // Legacy app_users mirror (FK target for org_memberships) — wipe matching emails.
  let appUserCount = 0;
  for (const pat of TEST_EMAIL_PATTERNS) {
    const { count } = await sb.from('app_users').delete({ count: 'exact' }).like('email', pat);
    appUserCount += count ?? 0;
  }
  console.log(`  ✓ app_users: ${appUserCount}`);

  // 3. auth.users — last because profiles FK references it.
  const authDeleted = await deleteAuthUsers(sb);
  console.log(`  ✓ auth.users: ${authDeleted}`);

  console.log('\n✔ Cleanup complete.');
}

main().catch((err) => {
  console.error('\n✖ Cleanup failed:', err.message ?? err);
  process.exit(1);
});
