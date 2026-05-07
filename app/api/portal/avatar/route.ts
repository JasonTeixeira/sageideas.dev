import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { AVATARS_BUCKET, getSignedUrl } from '@/lib/portal/storage';
import { badRequest, forbidden, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.user.clerk_id) return forbidden();

  const form = await req.formData();
  const fileEntry = form.get('file');
  if (!(fileEntry instanceof File)) return badRequest('Missing file');
  if (fileEntry.size === 0) return badRequest('Empty file');
  if (fileEntry.size > MAX_BYTES) return badRequest('Avatar must be 5 MB or smaller.');
  const mime = fileEntry.type || 'application/octet-stream';
  if (!ALLOWED_TYPES.has(mime)) {
    return badRequest('Avatar must be a PNG, JPEG, or WebP image.');
  }

  const supabase = await createSupabaseServerClient();
  const path = `${ctx.user.clerk_id}/avatar-${Date.now()}.${extFromMime(mime)}`;
  const buf = await fileEntry.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, new Uint8Array(buf), {
      contentType: mime,
      upsert: false,
    });
  if (upErr) {
    return serverError(upErr.message);
  }

  // Persist the path (not a signed URL) so we can mint fresh signed URLs on
  // demand. The avatar_url field doubles as a public URL or as a path; the
  // GET handler below resolves either.
  const sbAdmin = supabaseAdmin();
  const { error: updErr } = await sbAdmin
    .from('app_users')
    .update({ avatar_url: path })
    .eq('id', ctx.user.id);
  if (updErr) {
    // Cleanup orphaned object so we don't leak storage when DB write fails.
    try {
      await supabase.storage.from(AVATARS_BUCKET).remove([path]);
    } catch {
      // best-effort
    }
    return serverError(updErr.message);
  }
  await sbAdmin
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', ctx.user.clerk_id);

  try {
    const url = await getSignedUrl({
      bucket: AVATARS_BUCKET,
      path,
      expiresIn: 60 * 60 * 24,
      supabase,
    });
    return NextResponse.json({ path, url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signed URL failed';
    return serverError(msg);
  }
}
