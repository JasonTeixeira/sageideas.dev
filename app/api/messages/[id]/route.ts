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

type ThreadRel = { id: string; organization_id: string | null };

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string | null;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  edit_count: number | null;
  threads: ThreadRel | ThreadRel[] | null;
};

async function loadMessageAndOrg(id: string): Promise<MessageRow | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('messages')
    .select(
      'id, thread_id, sender_id, body, edited_at, deleted_at, edit_count, threads:thread_id(id, organization_id)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return data as unknown as MessageRow;
}

function threadOrg(msg: MessageRow): string | null {
  const t = msg.threads;
  if (!t) return null;
  if (Array.isArray(t)) return t[0]?.organization_id ?? null;
  return t.organization_id;
}

function canMutate(
  msg: MessageRow,
  ctxUserId: string,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  return msg.sender_id === ctxUserId;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  const newBody = parsed.data.body.trim();
  if (!newBody) return badRequest('Empty body');

  const msg = await loadMessageAndOrg(id);
  if (!msg) return notFound('Message not found');
  if (msg.deleted_at) return badRequest('Cannot edit a deleted message');

  // Org membership check (mirrors RLS) before role check.
  const orgId = threadOrg(msg);
  if (!ctx.isAdmin && orgId !== ctx.organizationId) return forbidden();
  if (!canMutate(msg, ctx.user.id, ctx.isAdmin)) return forbidden();

  const sb = supabaseAdmin();
  const editedAt = new Date().toISOString();
  const before = { body: msg.body, edited_at: msg.edited_at };
  const { data: updated, error } = await sb
    .from('messages')
    .update({
      body: newBody,
      edited_at: editedAt,
      edit_count: (msg.edit_count ?? 0) + 1,
    })
    .eq('id', id)
    .select('id, body, edited_at, edit_count')
    .single();
  if (error || !updated) return serverError(error?.message ?? 'Update failed');

  try {
    await sb.from('audit_log').insert({
      action: 'message.edited',
      entity_type: 'message',
      entity_id: id,
      organization_id: orgId,
      actor_id: ctx.user.id,
      before,
      after: { body: newBody, edited_at: editedAt },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, message: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx.user.id) return unauthorized();

  const msg = await loadMessageAndOrg(id);
  if (!msg) return notFound('Message not found');
  if (msg.deleted_at) {
    return NextResponse.json({ ok: true, already_deleted: true });
  }

  const orgId = threadOrg(msg);
  if (!ctx.isAdmin && orgId !== ctx.organizationId) return forbidden();
  if (!canMutate(msg, ctx.user.id, ctx.isAdmin)) return forbidden();

  const sb = supabaseAdmin();
  const deletedAt = new Date().toISOString();
  const { error } = await sb
    .from('messages')
    .update({ deleted_at: deletedAt })
    .eq('id', id);
  if (error) return serverError(error.message);

  try {
    await sb.from('audit_log').insert({
      action: 'message.deleted',
      entity_type: 'message',
      entity_id: id,
      organization_id: orgId,
      actor_id: ctx.user.id,
      before: { body: msg.body },
      after: { deleted_at: deletedAt },
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, deleted_at: deletedAt });
}
