import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: doc } = await sb
    .from('documents')
    .select('id, deleted_at, status')
    .eq('id', id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (doc.deleted_at) return NextResponse.json({ ok: true });

  const { error } = await sb
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'document.delete',
    entityType: 'document',
    entityId: id,
    before: { status: doc.status, deleted_at: null },
    after: { deleted_at: 'now' },
  });

  return NextResponse.json({ ok: true });
}
