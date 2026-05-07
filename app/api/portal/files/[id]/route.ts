import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deleteProjectFile, restoreProjectFileVersion } from '@/lib/portal/storage';
import { badRequest, forbidden, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const supabase = await createSupabaseServerClient();
  try {
    await deleteProjectFile({ fileId: id, supabase });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    return serverError(msg);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (body.action !== 'restore') return badRequest('Unknown action');

  const supabase = await createSupabaseServerClient();
  try {
    const { row } = await restoreProjectFileVersion({
      fileId: id,
      uploaderId: ctx.user.id,
      supabase,
    });
    return NextResponse.json({ row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Restore failed';
    if (/not found/i.test(msg)) return notFound(msg);
    return serverError(msg);
  }
}
