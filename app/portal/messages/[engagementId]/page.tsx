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
};

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
    .select('id, thread_id, body, sender_id, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(500);
  const messages: MessageRow[] = (msgsData ?? []) as MessageRow[];

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
        initialMessages={initialMessages}
      />
    </>
  );
}
