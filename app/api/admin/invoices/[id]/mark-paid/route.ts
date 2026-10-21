import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { fromZodError, notFound, serverError } from '@/lib/api-errors';
import { assertSupabaseSuccess } from '@/lib/billing/integrity';

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
  const invoiceLookup = await sb
    .from('invoices')
    .select('id, status, organization_id, total, amount_due')
    .eq('id', id)
    .maybeSingle();
  const inv = assertSupabaseSuccess(invoiceLookup, 'manual payment invoice lookup');
  if (!inv) return notFound('Invoice not found');

  const paymentResult = await sb.rpc('record_manual_invoice_payment', {
    p_invoice_id: id,
    p_method: body.method ?? 'manual',
    p_note: body.note ?? null,
    p_actor_email: guard.email,
  });
  let paymentOutcome: unknown;
  try {
    paymentOutcome = assertSupabaseSuccess(paymentResult, 'manual invoice payment');
  } catch (error) {
    console.error('[admin/invoices/mark-paid]', error);
    return serverError('Unable to record payment');
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.mark_paid',
    entityType: 'invoice',
    entityId: id,
    before: { status: inv.status },
    after: { status: 'paid', method: body.method ?? 'manual', outcome: paymentOutcome },
  });

  return NextResponse.json({ ok: true });
}
