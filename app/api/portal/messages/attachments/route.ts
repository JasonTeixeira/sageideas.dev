import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { MESSAGE_ATTACHMENTS_BUCKET, uploadToBucket } from '@/lib/portal/storage';
import { badRequest, forbidden, notFound, fromZodError, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

const fieldsSchema = z.object({
  thread_id: z.string().uuid(),
});

function safeFilename(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 0x20 || ch === '/' || ch === '\\') {
      out += '_';
    } else {
      out += ch;
    }
  }
  return out.slice(0, 200);
}

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const form = await req.formData();
  const parsed = fieldsSchema.safeParse({ thread_id: form.get('thread_id') });
  if (!parsed.success) return fromZodError(parsed.error);
  const threadId = parsed.data.thread_id;

  const fileEntry = form.get('file');
  if (!(fileEntry instanceof File)) return badRequest('Missing file');
  if (fileEntry.size === 0) return badRequest('Empty file');
  if (fileEntry.size > MAX_BYTES) {
    return badRequest(`Attachment too large. Max ${Math.floor(MAX_BYTES / 1024 / 1024)} MB.`);
  }

  // Verify caller has access to the thread (and capture its org for RLS path).
  const sbAdmin = supabaseAdmin();
  const { data: thread } = await sbAdmin
    .from('threads')
    .select('id, organization_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return notFound('Thread not found');
  const threadOrgId = (thread.organization_id as string | null) ?? null;
  if (!threadOrgId) return forbidden();
  if (!ctx.isAdmin && threadOrgId !== ctx.organizationId) return forbidden();

  const supabase = await createSupabaseServerClient();
  const path = `${threadOrgId}/${threadId}/${randomUUID()}-${safeFilename(fileEntry.name)}`;
  const buf = await fileEntry.arrayBuffer();
  const mimeType = fileEntry.type || 'application/octet-stream';

  try {
    await uploadToBucket({
      bucket: MESSAGE_ATTACHMENTS_BUCKET,
      path,
      bytes: buf,
      contentType: mimeType,
      supabase,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return serverError(msg);
  }

  return NextResponse.json({
    attachment: {
      path,
      name: fileEntry.name,
      mime: mimeType,
      size: fileEntry.size,
    },
  });
}
