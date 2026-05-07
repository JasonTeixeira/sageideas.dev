import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { uploadProjectFile, replaceProjectFile } from '@/lib/portal/storage';
import { scanBuffer } from '@/lib/portal/virus-scan';
import { badRequest, forbidden, fromZodError, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 50 * 1024 * 1024; // mirror client-uploads bucket limit

const fieldsSchema = z.object({
  engagement_id: z.string().uuid().nullable().optional(),
  iteration_id: z.string().uuid().nullable().optional(),
  replace_file_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const ctx = await getPortalContext();
  if (!ctx.organizationId) return forbidden('No active organization');

  const form = await req.formData();
  const rawFields = {
    engagement_id: (form.get('engagement_id') as string | null) || null,
    iteration_id: (form.get('iteration_id') as string | null) || null,
    replace_file_id: (form.get('replace_file_id') as string | null) || null,
  };
  const parsed = fieldsSchema.safeParse(rawFields);
  if (!parsed.success) return fromZodError(parsed.error);

  const fileEntry = form.get('file');
  if (!(fileEntry instanceof File)) {
    return badRequest('Missing file');
  }
  if (fileEntry.size === 0) return badRequest('Empty file');
  if (fileEntry.size > MAX_BYTES) {
    return badRequest(`File too large. Max ${Math.floor(MAX_BYTES / 1024 / 1024)} MB.`);
  }

  const buf = await fileEntry.arrayBuffer();
  const scan = await scanBuffer(buf);
  if (!scan.ok) return badRequest(`Rejected: ${scan.reason}`);

  const supabase = await createSupabaseServerClient();

  try {
    if (parsed.data.replace_file_id) {
      const { row } = await replaceProjectFile({
        existingFileId: parsed.data.replace_file_id,
        uploaderId: ctx.user.id,
        file: {
          name: fileEntry.name,
          size: fileEntry.size,
          mimeType: fileEntry.type || 'application/octet-stream',
          bytes: buf,
        },
        supabase,
      });
      return NextResponse.json({ row });
    }

    const { row } = await uploadProjectFile({
      orgId: ctx.organizationId,
      engagementId: parsed.data.engagement_id ?? null,
      iterationId: parsed.data.iteration_id ?? null,
      uploaderId: ctx.user.id,
      file: {
        name: fileEntry.name,
        size: fileEntry.size,
        mimeType: fileEntry.type || 'application/octet-stream',
        bytes: buf,
      },
      supabase,
    });
    return NextResponse.json({ row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    if (/quota/i.test(message)) {
      return badRequest('Org storage quota exceeded (5 GB).');
    }
    if (/already exists|duplicate/i.test(message)) {
      return badRequest('A file with that path already exists.');
    }
    console.error('[portal/files] upload', err);
    return serverError(message);
  }
}
