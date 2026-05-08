import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  badRequest,
  forbidden,
  fromZodError,
  notFound,
  serverError,
  unauthorized,
} from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  body: z.string().min(1).max(8000),
});

type CommentRow = {
  id: string;
  deliverable_id: string;
  author_id: string | null;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  deliverables: { engagement_id: string; engagements: { organization_id: string | null } | { organization_id: string | null }[] | null } | null;
};

async function loadComment(id: string): Promise<{
  row: { id: string; deliverable_id: string; author_id: string | null; body: string; edited_at: string | null; deleted_at: string | null };
  organizationId: string | null;
} | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('deliverable_comments')
    .select(
      'id, deliverable_id, author_id, body, edited_at, deleted_at, deliverables:deliverable_id(engagement_id, engagements:engagement_id(organization_id))',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const c = data as unknown as CommentRow;
  const deliverables = c.deliverables;
  const eng = deliverables
    ? (Array.isArray(deliverables) ? deliverables[0]?.engagements : deliverables.engagements)
    : null;
  const engRow = Array.isArray(eng) ? eng[0] : eng;
  return {
    row: {
      id: c.id,
      deliverable_id: c.deliverable_id,
      author_id: c.author_id,
      body: c.body,
      edited_at: c.edited_at,
      deleted_at: c.deleted_at,
    },
    organizationId: engRow?.organization_id ?? null,
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const ctx = await getPortalContext();
  if (!ctx.user.id) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const meta = await loadComment(commentId);
  if (!meta) return notFound('Comment not found');
  if (meta.row.deleted_at) return badRequest('Comment is deleted');
  if (!ctx.isAdmin && meta.organizationId !== ctx.organizationId) return forbidden();
  if (!ctx.isAdmin && meta.row.author_id !== ctx.user.id) return forbidden();

  const sb = supabaseAdmin();
  const newBody = parsed.data.body.trim();
  const editedAt = new Date().toISOString();
  const { data, error } = await sb
    .from('deliverable_comments')
    .update({ body: newBody, edited_at: editedAt })
    .eq('id', commentId)
    .select('id, body, edited_at')
    .single();
  if (error) return serverError(error.message);

  try {
    await sb.from('audit_log').insert({
      action: 'deliverable_comment.edited',
      entity_type: 'deliverable_comment',
      entity_id: commentId,
      organization_id: meta.organizationId,
      actor_id: ctx.user.id,
      before: { body: meta.row.body, edited_at: meta.row.edited_at },
      after: { body: newBody, edited_at: editedAt },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const ctx = await getPortalContext();
  if (!ctx.user.id) return unauthorized();

  const meta = await loadComment(commentId);
  if (!meta) return notFound('Comment not found');
  if (meta.row.deleted_at) {
    return NextResponse.json({ ok: true, already_deleted: true });
  }
  if (!ctx.isAdmin && meta.organizationId !== ctx.organizationId) return forbidden();
  if (!ctx.isAdmin && meta.row.author_id !== ctx.user.id) return forbidden();

  const sb = supabaseAdmin();
  const deletedAt = new Date().toISOString();
  const { error } = await sb
    .from('deliverable_comments')
    .update({ deleted_at: deletedAt })
    .eq('id', commentId);
  if (error) return serverError(error.message);

  try {
    await sb.from('audit_log').insert({
      action: 'deliverable_comment.deleted',
      entity_type: 'deliverable_comment',
      entity_id: commentId,
      organization_id: meta.organizationId,
      actor_id: ctx.user.id,
      before: { body: meta.row.body },
      after: { deleted_at: deletedAt },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true });
}
