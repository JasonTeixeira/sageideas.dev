import { NextResponse } from 'next/server';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyDocumentShared } from '@/lib/email/orchestrator';

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

  const { data: doc } = await sb
    .from('documents')
    .select('id, status, deleted_at, organization_id')
    .eq('id', id)
    .maybeSingle();
  if (!doc || doc.deleted_at) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { error } = await sb
    .from('documents')
    .update({ status: 'shared', sent_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'document.share',
    entityType: 'document',
    entityId: id,
    before: { status: doc.status },
    after: { status: 'shared' },
  });

  try {
    await notifyDocumentShared(id);
  } catch (err) {
    console.warn('[documents] notifyDocumentShared failed:', err);
  }

  return NextResponse.json({ ok: true });
}
