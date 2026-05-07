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
} from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const postSchema = z.object({
  body: z.string().min(1).max(8000),
  parent_id: z.string().uuid().nullable().optional(),
});

async function loadDeliverableOrg(deliverableId: string): Promise<
  | { deliverableId: string; engagementId: string; organizationId: string | null }
  | null
> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('deliverables')
    .select('id, engagement_id, engagements:engagement_id(organization_id)')
    .eq('id', deliverableId)
    .maybeSingle();
  if (!data) return null;
  const eng = (data as {
    engagements: { organization_id: string | null } | { organization_id: string | null }[] | null;
  }).engagements;
  const orgId = Array.isArray(eng) ? eng[0]?.organization_id ?? null : eng?.organization_id ?? null;
  return {
    deliverableId: data.id as string,
    engagementId: data.engagement_id as string,
    organizationId: orgId,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  const meta = await loadDeliverableOrg(id);
  if (!meta) return notFound('Deliverable not found');
  if (!ctx.isAdmin && meta.organizationId !== ctx.organizationId) return forbidden();

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('deliverable_comments')
    .select(
      'id, deliverable_id, parent_id, author_id, body, mentions, resolved_at, resolved_by, edited_at, deleted_at, created_at',
    )
    .eq('deliverable_id', id)
    .order('created_at', { ascending: true });
  if (error) return serverError(error.message);

  const authorIds = Array.from(
    new Set(((data ?? []) as Array<{ author_id: string | null }>)
      .map((c) => c.author_id)
      .filter((x): x is string => !!x)),
  );
  const authorsById = new Map<string, { full_name: string | null; email: string | null }>();
  if (authorIds.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, email')
      .in('id', authorIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      authorsById.set(p.id, { full_name: p.full_name, email: p.email });
    }
  }

  return NextResponse.json({
    comments: (data ?? []).map((c) => {
      const row = c as {
        id: string;
        deliverable_id: string;
        parent_id: string | null;
        author_id: string | null;
        body: string;
        resolved_at: string | null;
        resolved_by: string | null;
        edited_at: string | null;
        deleted_at: string | null;
        created_at: string;
      };
      const author = row.author_id ? authorsById.get(row.author_id) : null;
      return {
        ...row,
        author_name: author?.full_name ?? author?.email ?? null,
      };
    }),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const body = parsed.data.body.trim();
  if (!body) return badRequest('Empty body');

  const meta = await loadDeliverableOrg(id);
  if (!meta) return notFound('Deliverable not found');
  if (!ctx.isAdmin && meta.organizationId !== ctx.organizationId) return forbidden();

  let parentId: string | null = null;
  if (parsed.data.parent_id) {
    const sb = supabaseAdmin();
    const { data: parent } = await sb
      .from('deliverable_comments')
      .select('id, deliverable_id, parent_id')
      .eq('id', parsed.data.parent_id)
      .maybeSingle();
    if (!parent) return badRequest('Parent comment not found');
    if (parent.deliverable_id !== id) {
      return badRequest('Parent belongs to another deliverable');
    }
    parentId = (parent.parent_id as string | null) ?? (parent.id as string);
  }

  const sb = supabaseAdmin();
  const { data: inserted, error } = await sb
    .from('deliverable_comments')
    .insert({
      deliverable_id: id,
      parent_id: parentId,
      author_id: ctx.user.id,
      body,
    })
    .select(
      'id, deliverable_id, parent_id, author_id, body, mentions, resolved_at, resolved_by, edited_at, deleted_at, created_at',
    )
    .single();
  if (error || !inserted) return serverError(error?.message ?? 'Insert failed');

  try {
    await sb.from('audit_log').insert({
      action: 'deliverable_comment.added',
      entity_type: 'deliverable_comment',
      entity_id: inserted.id,
      organization_id: meta.organizationId,
      actor_id: ctx.user.id,
      after: { deliverable_id: id, parent_id: parentId },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ comment: inserted });
}
