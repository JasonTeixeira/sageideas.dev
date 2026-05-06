import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyDocumentShared } from '@/lib/email/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const MetaSchema = z.object({
  title: z.string().trim().min(1, 'Display name is required').max(200),
  organization_id: z.string().uuid('Organization is required'),
  engagement_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  share: z.boolean().optional().default(true),
});

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180) || 'file';
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 25MB' }, { status: 413 });
  }
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: PDF, DOC, DOCX, PNG, JPG.' },
      { status: 415 },
    );
  }

  const meta = MetaSchema.safeParse({
    title: form.get('title'),
    organization_id: form.get('organization_id'),
    engagement_id: form.get('engagement_id') || undefined,
    description: form.get('description') || undefined,
    share: form.get('share') === 'true' || form.get('share') === 'on',
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: meta.error.issues[0]?.message ?? 'invalid_body' },
      { status: 400 },
    );
  }
  const { title, organization_id, engagement_id, description, share } = meta.data;

  const sb = supabaseAdmin();

  // Verify org + (optional) engagement belong together.
  const { data: org } = await sb
    .from('organizations')
    .select('id, name')
    .eq('id', organization_id)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  if (engagement_id) {
    const { data: eng } = await sb
      .from('engagements')
      .select('id, organization_id')
      .eq('id', engagement_id)
      .maybeSingle();
    if (!eng || eng.organization_id !== organization_id) {
      return NextResponse.json(
        { error: 'Engagement does not belong to this organization' },
        { status: 400 },
      );
    }
  }

  // Insert metadata row first so we can use its id in the storage path.
  const status = share ? 'shared' : 'draft';
  const { data: doc, error: insertErr } = await sb
    .from('documents')
    .insert({
      organization_id,
      engagement_id: engagement_id ?? null,
      title,
      description: description ?? null,
      type: 'other',
      status,
      mime_type: mime,
      size_bytes: file.size,
      uploaded_by: guard.userId,
      sent_at: share ? new Date().toISOString() : null,
    })
    .select('id, title, organization_id, status')
    .maybeSingle();
  if (insertErr || !doc) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'insert_failed' },
      { status: 400 },
    );
  }

  const safeName = sanitizeFilename(file.name || `${title}`);
  const path = `${organization_id}/${doc.id}/${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await sb.storage
    .from('documents')
    .upload(path, buf, { contentType: mime, upsert: false });
  if (uploadErr) {
    // Roll back the DB row so we don't leave orphaned metadata.
    await sb.from('documents').delete().eq('id', doc.id);
    return NextResponse.json({ error: uploadErr.message }, { status: 400 });
  }

  await sb
    .from('documents')
    .update({ storage_path: path })
    .eq('id', doc.id);

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'document.upload',
    entityType: 'document',
    entityId: doc.id,
    after: { title, organization_id, engagement_id, status, size_bytes: file.size, mime_type: mime },
  });

  if (share) {
    try {
      await notifyDocumentShared(doc.id);
    } catch (err) {
      console.warn('[documents] notifyDocumentShared failed:', err);
    }
  }

  return NextResponse.json({ id: doc.id, title: doc.title, status });
}
