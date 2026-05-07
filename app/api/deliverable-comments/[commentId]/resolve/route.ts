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

const schema = z.object({
  resolved: z.boolean(),
});

type CommentJoin = {
  id: string;
  author_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  deleted_at: string | null;
  deliverables: { engagement_id: string; engagements: { organization_id: string | null } | { organization_id: string | null }[] | null } | null;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const ctx = await getPortalContext();
  if (!ctx.user.id) return unauthorized();

  let raw: unknown = { resolved: true };
  try {
    raw = await req.json();
  } catch {
    // tolerate empty body — default is resolve.
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);

  const sb = supabaseAdmin();
  const { data } = await sb
    .from('deliverable_comments')
    .select(
      'id, author_id, resolved_at, resolved_by, deleted_at, deliverables:deliverable_id(engagement_id, engagements:engagement_id(organization_id))',
    )
    .eq('id', commentId)
    .maybeSingle();
  if (!data) return notFound('Comment not found');
  const c = data as unknown as CommentJoin;
  if (c.deleted_at) return badRequest('Comment is deleted');
  const deliverables = c.deliverables;
  const eng = deliverables
    ? Array.isArray(deliverables)
      ? deliverables[0]?.engagements
      : deliverables.engagements
    : null;
  const engRow = Array.isArray(eng) ? eng[0] : eng;
  const organizationId = engRow?.organization_id ?? null;

  if (!ctx.isAdmin && organizationId !== ctx.organizationId) return forbidden();
  if (!ctx.isAdmin && c.author_id !== ctx.user.id) return forbidden();

  const update = parsed.data.resolved
    ? { resolved_at: new Date().toISOString(), resolved_by: ctx.user.id }
    : { resolved_at: null, resolved_by: null };

  const { error } = await sb
    .from('deliverable_comments')
    .update(update)
    .eq('id', commentId);
  if (error) return serverError(error.message);

  try {
    await sb.from('audit_log').insert({
      action: parsed.data.resolved
        ? 'deliverable_comment.resolved'
        : 'deliverable_comment.unresolved',
      entity_type: 'deliverable_comment',
      entity_id: commentId,
      organization_id: organizationId,
      actor_id: ctx.user.id,
      after: update,
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, resolved: parsed.data.resolved });
}
