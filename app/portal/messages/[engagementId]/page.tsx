import { notFound, redirect } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { MessageThread } from '@/components/portal/message-thread';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conversation' };

type EngagementRow = {
  id: string;
  title: string;
  organization_id: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  body: string;
  sender_id: string | null;
  created_at: string;
  attachments: unknown;
  parent_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  edit_count: number | null;
};

type ReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
};

type AttachmentLike = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

function parseAttachments(raw: unknown): AttachmentLike[] | null {
  if (!Array.isArray(raw)) return null;
  const out: AttachmentLike[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { path?: unknown }).path === 'string' &&
      typeof (item as { name?: unknown }).name === 'string' &&
      typeof (item as { mime?: unknown }).mime === 'string' &&
      typeof (item as { size?: unknown }).size === 'number'
    ) {
      out.push(item as AttachmentLike);
    }
  }
  return out.length > 0 ? out : null;
}

type SenderRow = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export default async function EngagementMessagesPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data: eng } = await sb
    .from('engagements')
    .select('id, title, organization_id')
    .eq('id', engagementId)
    .maybeSingle();
  if (!eng) notFound();
  const engagement = eng as EngagementRow;

  if (!ctx.isAdmin && engagement.organization_id !== ctx.organizationId) {
    redirect('/portal/messages');
  }

  let { data: thread } = await sb
    .from('threads')
    .select('id')
    .eq('engagement_id', engagement.id)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!thread) {
    const { data: created } = await sb
      .from('threads')
      .insert({
        engagement_id: engagement.id,
        organization_id: engagement.organization_id,
        subject: engagement.title,
      })
      .select('id')
      .single();
    thread = created;
  }

  if (!thread) notFound();
  const threadId = (thread as { id: string }).id;

  const { data: msgsData } = await sb
    .from('messages')
    .select(
      'id, thread_id, body, sender_id, attachments, created_at, parent_id, edited_at, deleted_at, edit_count',
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(500);
  const messages: MessageRow[] = (msgsData ?? []) as MessageRow[];

  const messageIds = messages.map((m) => m.id);
  let reactions: ReactionRow[] = [];
  if (messageIds.length > 0) {
    const { data: rxs } = await sb
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    reactions = (rxs ?? []) as ReactionRow[];
  }

  const senderIds = Array.from(
    new Set(messages.map((m) => m.sender_id).filter((id): id is string => Boolean(id))),
  );
  const sendersById = new Map<string, SenderRow>();
  if (senderIds.length) {
    const { data: senders } = await sb
      .from('app_users')
      .select('id, full_name, email, avatar_url')
      .in('id', senderIds);
    for (const s of (senders ?? []) as SenderRow[]) sendersById.set(s.id, s);
  }

  const initialMessages = messages.map((m) => ({
    id: m.id,
    body: m.body,
    created_at: m.created_at,
    sender_id: m.sender_id,
    sender_name: m.sender_id ? sendersById.get(m.sender_id)?.full_name ?? null : null,
    sender_avatar: m.sender_id ? sendersById.get(m.sender_id)?.avatar_url ?? null : null,
    attachments: parseAttachments(m.attachments),
    parent_id: m.parent_id,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    edit_count: m.edit_count ?? 0,
  }));

  const initialReactions = reactions.map((r) => ({
    message_id: r.message_id,
    user_id: r.user_id,
    emoji: r.emoji,
  }));

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Dashboard', href: '/portal' },
          { label: 'Messages', href: '/portal/messages' },
          { label: engagement.title },
        ]}
      />
      <MessageThread
        engagementId={engagement.id}
        engagementTitle={engagement.title}
        threadId={threadId}
        currentUserId={ctx.user.id}
        currentUserAuthId={ctx.user.clerk_id}
        currentUserName={ctx.user.full_name ?? ctx.user.email}
        currentUserIsAdmin={ctx.isAdmin}
        initialMessages={initialMessages}
        initialReactions={initialReactions}
      />
    </>
  );
}
