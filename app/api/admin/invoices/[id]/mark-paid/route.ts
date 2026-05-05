import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    method?: string;
    note?: string;
  };

  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, status, organization_id, total, amount')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

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

  await sb.from('payments').insert({
    invoice_id: id,
    organization_id: inv.organization_id,
    amount,
    currency: 'usd',
    status: 'succeeded',
    paid_at: paidAt,
    failure_reason: null,
    raw_event: { manual: true, note: body.note ?? null, by: guard.email },
  });

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
