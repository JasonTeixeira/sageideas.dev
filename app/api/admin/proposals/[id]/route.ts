import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError, notFound, serverError } from '@/lib/api-errors';
import { sendProposalEmail } from '@/lib/email/proposals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const lineItemSchema = z.object({
  name: z.string().min(1).max(250),
  qty: z.number().min(0).max(1_000_000),
  unit_price: z.number().min(0).max(10_000_000),
});

const patchSchema = z.object({
  organization_id: z.string().uuid().optional(),
  title: z.string().min(1).max(250).optional(),
  intro: z.string().max(10_000).nullable().optional(),
  currency: z.string().min(3).max(8).optional(),
  line_items: z.array(lineItemSchema).min(1).optional(),
  discount: z.number().min(0).max(10_000_000).optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  send: z.boolean().optional(),
  action: z.enum(['withdraw', 'mark_expired']).optional(),
});

function computeTotals(items: Array<{ qty: number; unit_price: number }>, discount: number) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  return { subtotal, total: Math.max(0, subtotal - discount) };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;

  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from('proposals')
    .select('*, organizations(name, primary_contact_email)')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return notFound('Proposal not found');

  // Top-level admin action: withdraw / mark_expired
  if (body.action === 'withdraw' || body.action === 'mark_expired') {
    const newStatus = body.action === 'withdraw' ? 'withdrawn' : 'expired';
    const { error } = await sb
      .from('proposals')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) return serverError(error.message);
    await logAudit({
      actorId: guard.userId,
      actorEmail: guard.email,
      action: `proposal.${newStatus}`,
      entityType: 'proposal',
      entityId: id,
      after: { status: newStatus },
    });
    return NextResponse.json({ ok: true, status: newStatus });
  }

  const update: Record<string, unknown> = {};
  if (body.organization_id) update.organization_id = body.organization_id;
  if (body.title) update.title = body.title;
  if ('intro' in body) update.intro = body.intro ?? null;
  if (body.currency) update.currency = body.currency.toUpperCase();
  if (body.line_items) update.line_items = body.line_items;
  if (typeof body.discount === 'number') update.discount = body.discount;
  if ('expires_at' in body) update.expires_at = body.expires_at ?? null;
  if ('notes' in body) update.notes = body.notes ?? null;
  if ('template_id' in body) update.template_id = body.template_id ?? null;

  // Recompute totals if relevant fields changed.
  const items =
    body.line_items ??
    ((existing.line_items as Array<{ qty: number; unit_price: number }> | null) ?? []);
  const discount =
    typeof body.discount === 'number'
      ? body.discount
      : Number(existing.discount ?? 0);
  const totals = computeTotals(
    items.map((it) => ({ qty: Number(it.qty) || 0, unit_price: Number(it.unit_price) || 0 })),
    discount,
  );
  update.subtotal = totals.subtotal;
  update.total = totals.total;

  const isSending = body.send === true;
  if (isSending) {
    if (existing.status === 'accepted' || existing.status === 'declined') {
      return badRequest('Cannot resend an accepted or declined proposal');
    }
    const token = randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    update.status = 'sent';
    update.acceptance_token = token;
    update.acceptance_token_expires = expiry.toISOString();
    update.sent_at = new Date().toISOString();
  }

  const { data, error } = await sb
    .from('proposals')
    .update(update)
    .eq('id', id)
    .select('id, acceptance_token, status, organization_id, organizations(primary_contact_email)')
    .single();
  if (error || !data) return serverError(error?.message ?? 'Update failed');

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: isSending ? 'proposal.sent' : 'proposal.updated',
    entityType: 'proposal',
    entityId: id,
    after: { ...update },
  });

  if (isSending) {
    void sendProposalEmail({
      to:
        (data.organizations as { primary_contact_email?: string | null } | null)
          ?.primary_contact_email ?? null,
      proposalTitle: (body.title ?? existing.title) as string,
      proposalId: id,
      token: update.acceptance_token as string,
    }).catch(() => undefined);
  }

  return NextResponse.json({ id, status: data.status });
}
