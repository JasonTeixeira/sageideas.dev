import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CLIENT_UPLOADS_BUCKET, getSignedUrl } from '@/lib/portal/storage';
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
  const { data: row } = await supabase
    .from('files')
    .select('id, organization_id, storage_path, name')
    .eq('id', id)
    .maybeSingle();
  if (!row) return notFound('File not found');

  if ((row.organization_id as string) !== ctx.organizationId && !ctx.isAdmin) {
    return forbidden();
  }

  try {
    const url = await getSignedUrl({
      bucket: CLIENT_UPLOADS_BUCKET,
      path: row.storage_path as string,
      expiresIn: 60 * 5,
      supabase,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Download failed';
    return serverError(msg);
  }
}
