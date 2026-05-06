import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: doc } = await sb
    .from('documents')
    .select('id, storage_path, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (!doc || doc.deleted_at || !doc.storage_path) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: signed, error } = await sb.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 60 * 5);
  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? 'sign_failed' },
      { status: 400 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
