/**
 * Phase 0 — idempotent seed for E2E + manual QA.
 *
 * Creates a deterministic test fixture:
 *   - 1 admin profile (sage+admin@sageideas.org)
 *   - 2 client profiles (client1+test@, client2+test@) — both members of the same org
 *   - 1 pending profile (pending+test@) — awaiting admin approval
 *   - 1 organization "Acme Test Co" containing both clients
 *   - 2 engagements: one in `discovery` (pending contract) + one `active` (signed)
 *   - 1 unsigned + 1 signed document per engagement (pulled from contract_templates)
 *   - 1 open + 1 paid invoice (with line items + a recorded payment)
 *   - 5 calendar events, 3 deliverables, 1 thread + 2 messages
 *
 * Idempotency:
 *   - Auth users matched by email; password reset on every run
 *   - Profiles upserted by id
 *   - Organizations matched by `slug` ('acme-test-co')
 *   - Engagements matched by (organization_id, title)
 *   - Documents matched by (engagement_id, title)
 *   - Invoices matched by `number`
 *   - Calendar events / deliverables / threads / messages cleared by org+title before insert
 *
 * Tagging (for cleanup):
 *   - All seeded user emails contain `+test@` or `+admin@` or `+pending@`
 *   - Organization carries `notes = 'TEST_RUN_ID:phase-0-seed'`
 *   - Engagements carry `tags` including `test_run_id:phase-0-seed`
 *
 * Run with:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-test-data.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TEST_RUN_ID = 'phase-0-seed';
const ORG_SLUG = 'acme-test-co';
const ORG_NAME = 'Acme Test Co';
const TEST_TAG = `test_run_id:${TEST_RUN_ID}`;

const ACCOUNTS = {
  admin: { email: 'sage+admin@sageideas.org', password: 'Test!Admin#2026', full_name: 'Sage Admin (Test)' },
  client1: { email: 'client1+test@sageideas.org', password: 'Test!Client#2026', full_name: 'Client One Test' },
  client2: { email: 'client2+test@sageideas.org', password: 'Test!Client#2026', full_name: 'Client Two Test' },
  pending: { email: 'pending+test@sageideas.org', password: 'Test!Pending#2026', full_name: 'Pending User Test' },
} as const;

type AccountKey = keyof typeof ACCOUNTS;

function need(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function ensureAuthUser(
  sb: SupabaseClient,
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  // List + match — admin.listUsers paginates; we look up by email through getUserByEmail-style scan.
  // Supabase JS exposes admin.getUserById but not by-email; use listUsers with paging.
  let userId: string | undefined;
  let page = 1;
  // Cap pages to avoid runaway.
  while (page <= 20) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      userId = found.id;
      break;
    }
    if (data.users.length < 200) break;
    page++;
  }

  if (userId) {
    // Idempotent: reset password + ensure email confirmed + update name metadata.
    const { error: updErr } = await sb.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (updErr) throw new Error(`updateUser ${email}: ${updErr.message}`);
    return userId;
  }

  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  if (!created.user) throw new Error(`createUser ${email}: no user returned`);
  return created.user.id;
}

async function upsertProfile(
  sb: SupabaseClient,
  id: string,
  email: string,
  fullName: string,
  appRole: 'admin' | 'client' | 'pending',
  approvalStatus: 'approved' | 'pending',
) {
  const payload = {
    id,
    email,
    full_name: fullName,
    app_role: appRole,
    approval_status: approvalStatus,
    approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
  };
  const { error } = await sb.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(`upsert profile ${email}: ${error.message}`);
}

async function upsertOrg(sb: SupabaseClient, ownerId: string): Promise<string> {
  const payload = {
    name: ORG_NAME,
    slug: ORG_SLUG,
    industry: 'SaaS',
    primary_contact_email: ACCOUNTS.client1.email,
    status: 'active',
    pipeline_stage: 'engaged',
    annual_value: 60000,
    notes: `TEST_RUN_ID:${TEST_RUN_ID}`,
    owner_id: ownerId,
  };
  const { data, error } = await sb
    .from('organizations')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')
    .single();
  if (error) throw new Error(`upsert organization: ${error.message}`);
  return data.id;
}

async function ensureMembership(
  sb: SupabaseClient,
  userId: string,
  orgId: string,
  role: 'owner' | 'member',
) {
  const payload = { user_id: userId, organization_id: orgId, role };
  const { error } = await sb
    .from('org_memberships')
    .upsert(payload, { onConflict: 'user_id,organization_id' });
  if (error) throw new Error(`upsert membership ${userId}/${orgId}: ${error.message}`);
}

async function upsertEngagement(
  sb: SupabaseClient,
  orgId: string,
  ownerId: string,
  fields: {
    title: string;
    pipeline_stage: string;
    status: string;
    contract_value: number;
    budget_hours: number;
    description: string;
  },
): Promise<string> {
  // Match by (organization_id, title).
  const { data: existing, error: lookupErr } = await sb
    .from('engagements')
    .select('id')
    .eq('organization_id', orgId)
    .eq('title', fields.title)
    .maybeSingle();
  if (lookupErr) throw new Error(`engagement lookup: ${lookupErr.message}`);

  const payload = {
    organization_id: orgId,
    owner_id: ownerId,
    title: fields.title,
    pipeline_stage: fields.pipeline_stage,
    status: fields.status,
    contract_value: fields.contract_value,
    budget_hours: fields.budget_hours,
    description: fields.description,
    tags: [TEST_TAG],
    health: 'green',
    priority: 'normal',
  };

  if (existing) {
    const { error } = await sb.from('engagements').update(payload).eq('id', existing.id);
    if (error) throw new Error(`update engagement: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await sb.from('engagements').insert(payload).select('id').single();
  if (error) throw new Error(`insert engagement: ${error.message}`);
  return data.id;
}

async function upsertDocument(
  sb: SupabaseClient,
  orgId: string,
  engagementId: string,
  fields: { title: string; type: string; status: string; templateId: string | null; signed: boolean; createdBy: string },
): Promise<string> {
  const { data: existing, error: lookupErr } = await sb
    .from('documents')
    .select('id')
    .eq('engagement_id', engagementId)
    .eq('title', fields.title)
    .maybeSingle();
  if (lookupErr) throw new Error(`doc lookup: ${lookupErr.message}`);

  const payload: Record<string, unknown> = {
    organization_id: orgId,
    engagement_id: engagementId,
    type: fields.type,
    title: fields.title,
    status: fields.status,
    template_id: fields.templateId,
    body_md: `# ${fields.title}\n\nSeeded by Phase 0 — TEST_RUN_ID:${TEST_RUN_ID}.`,
    created_by: fields.createdBy,
    version: 1,
  };
  if (fields.signed) {
    payload.signed_at = new Date().toISOString();
    payload.signature_name = ACCOUNTS.client1.full_name;
    payload.signature_timestamp = new Date().toISOString();
  }

  if (existing) {
    const { error } = await sb.from('documents').update(payload).eq('id', existing.id);
    if (error) throw new Error(`update document: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await sb.from('documents').insert(payload).select('id').single();
  if (error) throw new Error(`insert document: ${error.message}`);
  return data.id;
}

async function upsertInvoice(
  sb: SupabaseClient,
  orgId: string,
  engagementId: string,
  fields: { number: string; status: 'open' | 'paid'; subtotal: number; tax: number; lineDescription: string },
): Promise<string> {
  const total = fields.subtotal + fields.tax;
  const payload: Record<string, unknown> = {
    organization_id: orgId,
    engagement_id: engagementId,
    number: fields.number,
    status: fields.status,
    amount_due: fields.status === 'paid' ? 0 : total,
    amount_paid: fields.status === 'paid' ? total : 0,
    currency: 'usd',
    subtotal: fields.subtotal,
    tax: fields.tax,
    total,
    sent_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
    due_date: new Date(Date.now() + 14 * 86400_000).toISOString(),
    paid_at: fields.status === 'paid' ? new Date().toISOString() : null,
    dunning_status: 'current',
    notes: `TEST_RUN_ID:${TEST_RUN_ID}`,
  };

  const { data: existing, error: lookupErr } = await sb
    .from('invoices')
    .select('id')
    .eq('number', fields.number)
    .maybeSingle();
  if (lookupErr) throw new Error(`invoice lookup: ${lookupErr.message}`);

  let invoiceId: string;
  if (existing) {
    const { error } = await sb.from('invoices').update(payload).eq('id', existing.id);
    if (error) throw new Error(`update invoice: ${error.message}`);
    invoiceId = existing.id;
  } else {
    const { data, error } = await sb.from('invoices').insert(payload).select('id').single();
    if (error) throw new Error(`insert invoice: ${error.message}`);
    invoiceId = data.id;
  }

  // Replace line items deterministically.
  await sb.from('invoice_line_items').delete().eq('invoice_id', invoiceId);
  const { error: liErr } = await sb.from('invoice_line_items').insert([
    {
      invoice_id: invoiceId,
      description: fields.lineDescription,
      quantity: 1,
      unit_price: fields.subtotal,
      amount: fields.subtotal,
      position: 0,
    },
  ]);
  if (liErr) throw new Error(`insert line items: ${liErr.message}`);

  if (fields.status === 'paid') {
    // Replace payment row idempotently — match on stripe_payment_intent_id (deterministic test value).
    const pi = `pi_test_${fields.number}`;
    await sb.from('payments').delete().eq('stripe_payment_intent_id', pi);
    const { error: payErr } = await sb.from('payments').insert({
      invoice_id: invoiceId,
      organization_id: orgId,
      stripe_payment_intent_id: pi,
      amount: total,
      currency: 'usd',
      status: 'succeeded',
      paid_at: new Date().toISOString(),
    });
    if (payErr) throw new Error(`insert payment: ${payErr.message}`);
  }

  return invoiceId;
}

async function replaceCalendarEvents(
  sb: SupabaseClient,
  orgId: string,
  engagementId: string,
  ownerId: string,
) {
  // Delete the org's existing test events, then re-insert.
  await sb.from('calendar_events').delete().eq('organization_id', orgId);

  const now = Date.now();
  const events = [
    { title: 'Kickoff Call', offsetDays: -7, durationHours: 1, type: 'meeting' },
    { title: 'Discovery Workshop', offsetDays: -3, durationHours: 2, type: 'meeting' },
    { title: 'Sprint Review', offsetDays: 2, durationHours: 1, type: 'review' },
    { title: 'Stakeholder Demo', offsetDays: 7, durationHours: 1, type: 'demo' },
    { title: 'Retrospective', offsetDays: 14, durationHours: 1, type: 'meeting' },
  ];
  const rows = events.map((e) => ({
    organization_id: orgId,
    engagement_id: engagementId,
    owner_id: ownerId,
    title: e.title,
    description: `Seeded — TEST_RUN_ID:${TEST_RUN_ID}`,
    starts_at: new Date(now + e.offsetDays * 86400_000).toISOString(),
    ends_at: new Date(now + e.offsetDays * 86400_000 + e.durationHours * 3600_000).toISOString(),
    event_type: e.type,
    visible_to_client: true,
    attendees: [{ email: ACCOUNTS.admin.email }, { email: ACCOUNTS.client1.email }],
  }));
  const { error } = await sb.from('calendar_events').insert(rows);
  if (error) throw new Error(`insert calendar_events: ${error.message}`);
  return rows.length;
}

async function replaceDeliverables(sb: SupabaseClient, engagementId: string, assigneeId: string) {
  await sb.from('deliverables').delete().eq('engagement_id', engagementId);
  const rows = [
    { title: 'Brand Audit Report', status: 'in_review', due_date_offset: 7 },
    { title: 'Wireframes v1', status: 'in_progress', due_date_offset: 14 },
    { title: 'Design System Tokens', status: 'draft', due_date_offset: 21 },
  ].map((d) => ({
    engagement_id: engagementId,
    title: d.title,
    description: `Seeded — TEST_RUN_ID:${TEST_RUN_ID}`,
    status: d.status,
    due_date: new Date(Date.now() + d.due_date_offset * 86400_000).toISOString().slice(0, 10),
    assignee_id: assigneeId,
    current_iteration: 1,
  }));
  const { error } = await sb.from('deliverables').insert(rows);
  if (error) throw new Error(`insert deliverables: ${error.message}`);
  return rows.length;
}

async function replaceThreadAndMessages(
  sb: SupabaseClient,
  orgId: string,
  engagementId: string,
  adminId: string,
  clientId: string,
) {
  // Threads matched by (engagement_id, subject).
  const subject = 'Phase 0 Test Thread';
  const { data: existing } = await sb
    .from('threads')
    .select('id')
    .eq('engagement_id', engagementId)
    .eq('subject', subject)
    .maybeSingle();

  let threadId: string;
  if (existing) {
    threadId = existing.id;
    await sb.from('messages').delete().eq('thread_id', threadId);
    await sb.from('threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
  } else {
    const { data, error } = await sb
      .from('threads')
      .insert({
        organization_id: orgId,
        engagement_id: engagementId,
        subject,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`insert thread: ${error.message}`);
    threadId = data.id;
  }

  const { error: msgErr } = await sb.from('messages').insert([
    {
      thread_id: threadId,
      sender_id: adminId,
      body: 'Welcome to your client portal — this is a seeded test thread.',
    },
    {
      thread_id: threadId,
      sender_id: clientId,
      body: 'Got it, thanks. Looking forward to the kickoff.',
    },
  ]);
  if (msgErr) throw new Error(`insert messages: ${msgErr.message}`);
  return { threadId, count: 2 };
}

async function pickTemplateId(sb: SupabaseClient): Promise<string | null> {
  const { data } = await sb
    .from('contract_templates')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function main() {
  const url = need('NEXT_PUBLIC_SUPABASE_URL');
  const key = need('SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('▶ Phase 0 seed — TEST_RUN_ID:', TEST_RUN_ID);
  console.log('  target:', url);

  // 1. Auth users + profiles
  console.log('\n— Users & profiles —');
  const ids: Record<AccountKey, string> = {} as Record<AccountKey, string>;
  for (const [key, acct] of Object.entries(ACCOUNTS) as [AccountKey, typeof ACCOUNTS[AccountKey]][]) {
    ids[key] = await ensureAuthUser(sb, acct.email, acct.password, acct.full_name);
    console.log(`  auth user  → ${acct.email} (${ids[key]})`);
  }
  await upsertProfile(sb, ids.admin, ACCOUNTS.admin.email, ACCOUNTS.admin.full_name, 'admin', 'approved');
  await upsertProfile(sb, ids.client1, ACCOUNTS.client1.email, ACCOUNTS.client1.full_name, 'client', 'approved');
  await upsertProfile(sb, ids.client2, ACCOUNTS.client2.email, ACCOUNTS.client2.full_name, 'client', 'approved');
  await upsertProfile(sb, ids.pending, ACCOUNTS.pending.email, ACCOUNTS.pending.full_name, 'pending', 'pending');
  console.log('  profiles upserted: admin, client1, client2, pending');

  // 2. Organization + memberships
  console.log('\n— Organization & memberships —');
  const orgId = await upsertOrg(sb, ids.admin);
  console.log(`  org "${ORG_NAME}" → ${orgId}`);
  await ensureMembership(sb, ids.client1, orgId, 'owner');
  await ensureMembership(sb, ids.client2, orgId, 'member');
  console.log('  memberships: client1=owner, client2=member');

  // 3. Engagements
  console.log('\n— Engagements —');
  const discoveryId = await upsertEngagement(sb, orgId, ids.admin, {
    title: 'Acme — Brand Refresh (Discovery)',
    pipeline_stage: 'discovery',
    status: 'active',
    contract_value: 18000,
    budget_hours: 80,
    description: 'Discovery-phase brand refresh engagement (seeded).',
  });
  console.log(`  discovery engagement → ${discoveryId}`);

  const activeId = await upsertEngagement(sb, orgId, ids.admin, {
    title: 'Acme — Website Redesign (Active)',
    pipeline_stage: 'active',
    status: 'active',
    contract_value: 42000,
    budget_hours: 240,
    description: 'Active website redesign engagement (seeded).',
  });
  console.log(`  active engagement    → ${activeId}`);

  // 4. Documents (1 unsigned + 1 signed per engagement)
  console.log('\n— Documents —');
  const templateId = await pickTemplateId(sb);
  await upsertDocument(sb, orgId, discoveryId, {
    title: 'Discovery — Statement of Work',
    type: 'sow',
    status: 'sent',
    templateId,
    signed: false,
    createdBy: ids.admin,
  });
  await upsertDocument(sb, orgId, discoveryId, {
    title: 'Discovery — MSA',
    type: 'msa',
    status: 'signed',
    templateId,
    signed: true,
    createdBy: ids.admin,
  });
  await upsertDocument(sb, orgId, activeId, {
    title: 'Website Redesign — SOW',
    type: 'sow',
    status: 'signed',
    templateId,
    signed: true,
    createdBy: ids.admin,
  });
  await upsertDocument(sb, orgId, activeId, {
    title: 'Website Redesign — Change Order #1',
    type: 'change_order',
    status: 'sent',
    templateId,
    signed: false,
    createdBy: ids.admin,
  });
  console.log('  documents: 4 (2 unsigned, 2 signed)');

  // 5. Invoices (1 open + 1 paid)
  console.log('\n— Invoices —');
  await upsertInvoice(sb, orgId, activeId, {
    number: 'INV-TEST-001',
    status: 'paid',
    subtotal: 10500,
    tax: 0,
    lineDescription: 'Website Redesign — Phase 1 deposit',
  });
  await upsertInvoice(sb, orgId, activeId, {
    number: 'INV-TEST-002',
    status: 'open',
    subtotal: 10500,
    tax: 0,
    lineDescription: 'Website Redesign — Phase 2 milestone',
  });
  console.log('  invoices: INV-TEST-001 (paid), INV-TEST-002 (open)');

  // 6. Calendar events (5)
  console.log('\n— Calendar events —');
  const evCount = await replaceCalendarEvents(sb, orgId, activeId, ids.admin);
  console.log(`  ${evCount} calendar events`);

  // 7. Deliverables (3)
  console.log('\n— Deliverables —');
  const delivCount = await replaceDeliverables(sb, activeId, ids.admin);
  console.log(`  ${delivCount} deliverables`);

  // 8. Thread + 2 messages
  console.log('\n— Messages —');
  const { count } = await replaceThreadAndMessages(sb, orgId, activeId, ids.admin, ids.client1);
  console.log(`  1 thread, ${count} messages`);

  console.log('\n✔ Seed complete.');
  console.log('  test_run_id =', TEST_RUN_ID);
  console.log('  org slug    =', ORG_SLUG);
}

main().catch((err) => {
  console.error('\n✖ Seed failed:', err.message ?? err);
  process.exit(1);
});
