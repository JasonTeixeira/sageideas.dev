import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError, notFound } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z
  .object({
    method: z.string().max(50).optional(),
    note: z.string().max(2_000).optional(),
  })
  .strict();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // Empty body is allowed.
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data;

  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, status, organization_id, total, amount')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return notFound('Invoice not found');

  const amount = Number(inv.total ?? inv.amount ?? 0);
  const paidAt = new Date().toISOString();

  await sb
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method_used: body.method ?? 'manual',
      dunning_status: 'current',
    })
    .eq('id', id);

  const { error: payErr } = await sb.from('payments').insert({
    invoice_id: id,
    organization_id: inv.organization_id,
    amount,
    currency: 'usd',
    status: 'succeeded',
    paid_at: paidAt,
    failure_reason: null,
    raw_event: { manual: true, note: body.note ?? null, by: guard.email },
  });
  if (payErr) return badRequest(payErr.message);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.mark_paid',
    entityType: 'invoice',
    entityId: id,
    before: { status: inv.status },
    after: { status: 'paid', method: body.method ?? 'manual' },
  });

  return NextResponse.json({ ok: true });
}
