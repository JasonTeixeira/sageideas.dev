import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError, serverError } from '@/lib/api-errors';
import { sendProposalEmail } from '@/lib/email/proposals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const lineItemSchema = z.object({
  name: z.string().min(1).max(250),
  qty: z.number().min(0).max(1_000_000),
  unit_price: z.number().min(0).max(10_000_000),
});

const createSchema = z.object({
  organization_id: z.string().uuid(),
  title: z.string().min(1).max(250),
  intro: z.string().max(10_000).optional().nullable(),
  currency: z.string().min(3).max(8).default('USD'),
  line_items: z.array(lineItemSchema).min(1),
  discount: z.number().min(0).max(10_000_000).optional().default(0),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  send: z.boolean().optional().default(false),
});

function computeTotals(items: Array<{ qty: number; unit_price: number }>, discount: number) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  return { subtotal, total: Math.max(0, subtotal - discount) };
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;
  const totals = computeTotals(body.line_items, body.discount);
  const isSending = body.send === true;

  const insert: Record<string, unknown> = {
    organization_id: body.organization_id,
    created_by: guard.userId,
    title: body.title,
    intro: body.intro ?? null,
    currency: body.currency.toUpperCase(),
    line_items: body.line_items,
    subtotal: totals.subtotal,
    discount: body.discount,
    total: totals.total,
    status: isSending ? 'sent' : 'draft',
    expires_at: body.expires_at ?? null,
    notes: body.notes ?? null,
    template_id: body.template_id ?? null,
  };

  if (isSending) {
    const token = randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    insert.acceptance_token = token;
    insert.acceptance_token_expires = expiry.toISOString();
    insert.sent_at = new Date().toISOString();
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('proposals')
    .insert(insert)
    .select('*, organizations(name, primary_contact_email)')
    .single();
  if (error || !data) return serverError(error?.message ?? 'Insert failed');

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: isSending ? 'proposal.sent' : 'proposal.created',
    entityType: 'proposal',
    entityId: data.id as string,
    after: { title: body.title, total: totals.total, status: insert.status },
  });

  if (isSending) {
    const token = insert.acceptance_token as string;
    void sendProposalEmail({
      to:
        (data.organizations as { primary_contact_email?: string | null } | null)
          ?.primary_contact_email ?? null,
      proposalTitle: body.title,
      proposalId: data.id as string,
      token,
    }).catch(() => undefined);
  }

  return NextResponse.json({ id: data.id, status: insert.status });
}
