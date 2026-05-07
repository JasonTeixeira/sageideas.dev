import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { forbidden, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const supabase = await createSupabaseServerClient();
  const { data: anchor } = await supabase
    .from('files')
    .select('id, organization_id, parent_id')
    .eq('id', id)
    .maybeSingle();
  if (!anchor) return notFound('File not found');
  if ((anchor.organization_id as string) !== ctx.organizationId && !ctx.isAdmin) {
    return forbidden();
  }

  const rootId = (anchor.parent_id as string | null) ?? (anchor.id as string);
  try {
    const { data, error } = await supabase
      .from('files')
      .select(
        'id, name, version, is_latest, size_bytes, mime_type, uploaded_by, created_at, deleted_at',
      )
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order('version', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ versions: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'List failed';
    return serverError(msg);
  }
}
