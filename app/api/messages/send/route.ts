import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type AttachmentInput = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

function isAttachmentArray(v: unknown): v is AttachmentInput[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (a) =>
      a !== null &&
      typeof a === 'object' &&
      typeof (a as { path?: unknown }).path === 'string' &&
      typeof (a as { name?: unknown }).name === 'string' &&
      typeof (a as { mime?: unknown }).mime === 'string' &&
      typeof (a as { size?: unknown }).size === 'number',
  );
}

export async function POST(req: Request) {
  let payload: {
    engagementId?: string;
    threadId?: string;
    body?: string;
    attachments?: unknown;
    parentId?: string | null;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const body = (payload.body ?? '').trim();
  const engagementId = payload.engagementId;
  const threadId = payload.threadId;
  const attachments: AttachmentInput[] = isAttachmentArray(payload.attachments)
    ? payload.attachments
    : [];
  const parentIdInput =
    typeof payload.parentId === 'string' && payload.parentId.length > 0
      ? payload.parentId
      : null;

  // Allow attachment-only messages (e.g. dropping a file with no text).
  if (!body && attachments.length === 0) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  if (body.length > 8000) return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  if (attachments.length > 10) {
    return NextResponse.json({ error: 'Too many attachments' }, { status: 400 });
  }
  if (!engagementId || !threadId) {
    return NextResponse.json({ error: 'Missing engagementId or threadId' }, { status: 400 });
  }

  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: thread } = await sb
    .from('threads')
    .select('id, engagement_id, organization_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  if (thread.engagement_id !== engagementId) {
    return NextResponse.json({ error: 'Thread does not match engagement' }, { status: 400 });
  }
  if (!ctx.isAdmin && thread.organization_id !== ctx.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Threaded replies are flattened to depth 1: if parentIdInput points to a
  // message that itself has a parent_id, hop up to the root so a "reply to a
  // reply" still anchors at the original parent.
  let parentId: string | null = null;
  if (parentIdInput) {
    const { data: parentRow } = await sb
      .from('messages')
      .select('id, thread_id, parent_id')
      .eq('id', parentIdInput)
      .maybeSingle();
    if (!parentRow) {
      return NextResponse.json({ error: 'Parent message not found' }, { status: 400 });
    }
    if (parentRow.thread_id !== threadId) {
      return NextResponse.json(
        { error: 'Parent belongs to another thread' },
        { status: 400 },
      );
    }
    parentId = (parentRow.parent_id as string | null) ?? (parentRow.id as string);
  }

  const { data: inserted, error } = await sb
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: ctx.user.id,
      body,
      attachments: attachments.length > 0 ? attachments : null,
      parent_id: parentId,
    })
    .select('id, thread_id, body, sender_id, attachments, created_at, parent_id')
    .single();
  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  await sb
    .from('threads')
    .update({ last_message_at: inserted.created_at })
    .eq('id', threadId);

  await sb
    .from('message_read_receipts')
    .upsert(
      { message_id: inserted.id, user_id: ctx.user.clerk_id },
      { onConflict: 'message_id,user_id', ignoreDuplicates: true },
    );

  return NextResponse.json({ message: inserted });
}
