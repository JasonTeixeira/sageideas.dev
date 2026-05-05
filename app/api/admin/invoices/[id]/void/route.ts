import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await sb
    .from('invoices')
    .update({ status: 'void', dunning_status: 'written_off' })
    .eq('id', id);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.void',
    entityType: 'invoice',
    entityId: id,
    before: { status: inv.status },
    after: { status: 'void' },
  });

  return NextResponse.json({ ok: true });
}
