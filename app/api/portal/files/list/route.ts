import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOrgUsage } from '@/lib/portal/storage';
import { forbidden, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const url = new URL(req.url);
  const engagementId = url.searchParams.get('engagement_id');

  const supabase = await createSupabaseServerClient();
  try {
    let query = supabase
      .from('files')
      .select(
        'id, organization_id, engagement_id, name, storage_path, mime_type, size_bytes, version, is_latest, uploaded_by, created_at, deleted_at, parent_id',
      )
      .eq('organization_id', ctx.organizationId)
      .eq('is_latest', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (engagementId) {
      query = query.eq('engagement_id', engagementId);
    }
    const { data: files, error } = await query;
    if (error) throw error;

    const quota = await getOrgUsage({ orgId: ctx.organizationId, supabase });
    return NextResponse.json({ files: files ?? [], quota });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'List failed';
    return serverError(msg);
  }
}
