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
    .select('id, number, organization_id, dunning_status, reminder_count')
    .eq('id', id)
    .maybeSingle();
  if (!inv) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await sb
    .from('invoices')
    .update({
      last_reminder_at: new Date().toISOString(),
      reminder_count: (inv.reminder_count ?? 0) + 1,
      dunning_status:
        inv.dunning_status === 'current' || inv.dunning_status === 'grace'
          ? 'reminded_1'
          : inv.dunning_status,
    })
    .eq('id', id);

  if (inv.organization_id) {
    const { data: members } = await sb
      .from('org_memberships')
      .select('user_id')
      .eq('organization_id', inv.organization_id);
    const rows = (members ?? [])
      .filter((m) => m.user_id)
      .map((m) => ({
        user_id: m.user_id,
        kind: 'invoice_reminder',
        title: 'Invoice reminder',
        body: `Manual reminder sent for invoice ${inv.number ?? inv.id.slice(0, 8)}.`,
        link: `/portal/invoices/${inv.id}`,
      }));
    if (rows.length > 0) await sb.from('notifications').insert(rows);
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'invoice.remind',
    entityType: 'invoice',
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
