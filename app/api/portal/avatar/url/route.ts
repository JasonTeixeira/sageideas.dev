import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AVATARS_BUCKET, getSignedUrl } from '@/lib/portal/storage';
import { serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const _ctx = await getPortalContext();
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  if (!path) return NextResponse.json({ url: null });

  // If the stored value is already an absolute URL (e.g., an OAuth provider
  // avatar from sign-in), pass it through untouched.
  if (/^https?:\/\//i.test(path)) {
    return NextResponse.json({ url: path });
  }

  const supabase = await createSupabaseServerClient();
  try {
    const signed = await getSignedUrl({
      bucket: AVATARS_BUCKET,
      path,
      expiresIn: 60 * 60 * 24,
      supabase,
    });
    return NextResponse.json({ url: signed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signed URL failed';
    return serverError(msg);
  }
}
