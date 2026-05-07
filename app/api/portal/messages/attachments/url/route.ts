import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MESSAGE_ATTACHMENTS_BUCKET, getSignedUrl } from '@/lib/portal/storage';
import { badRequest, forbidden, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  if (!path) return badRequest('Missing path');

  // Path layout: <org_id>/<thread_id>/<filename>. Confirm the caller belongs
  // to that org before minting a URL — RLS would also block the
  // createSignedUrl call, but failing fast keeps the error message clean.
  const orgFromPath = path.split('/')[0] ?? '';
  if (!ctx.isAdmin && orgFromPath !== ctx.organizationId) return forbidden();

  const supabase = await createSupabaseServerClient();
  try {
    const signed = await getSignedUrl({
      bucket: MESSAGE_ATTACHMENTS_BUCKET,
      path,
      expiresIn: 60 * 10,
      supabase,
    });
    return NextResponse.json({ url: signed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signed URL failed';
    return serverError(msg);
  }
}
