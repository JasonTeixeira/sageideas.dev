import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: doc } = await sb
    .from('documents')
    .select('id, organization_id, storage_path, status, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (!doc || doc.deleted_at) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (doc.status !== 'shared') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!ctx.isAdmin && doc.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!doc.storage_path) {
    return NextResponse.json({ error: 'missing_file' }, { status: 404 });
  }

  const { data: signed, error } = await sb.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? 'sign_failed' },
      { status: 400 },
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
