import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { MessageSquare } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { NewThreadButton } from '@/components/portal/new-thread-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages' };

type EngagementRow = { id: string; title: string };
type ThreadRow = {
  id: string;
  engagement_id: string | null;
  subject: string;
  last_message_at: string | null;
};
type MessageRow = {
  id: string;
  thread_id: string | null;
  body: string;
  created_at: string;
  sender_id: string | null;
};

export default async function MessagesPage() {
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  if (!ctx.organizationId) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Messages' }]} />
        <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
          <EmptyState />
        </div>
      </>
    );
  }

  const { data: engsData } = await sb
    .from('engagements')
    .select('id, title')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false });
  const engagements: EngagementRow[] = engsData ?? [];
  const engagementIds = engagements.map((e) => e.id);

  const threadsByEngagement = new Map<string, ThreadRow>();
  if (engagementIds.length) {
    const { data: threadsData } = await sb
      .from('threads')
      .select('id, engagement_id, subject, last_message_at')
      .in('engagement_id', engagementIds)
      .order('last_message_at', { ascending: false });
    for (const t of (threadsData ?? []) as ThreadRow[]) {
      if (!t.engagement_id) continue;
      const existing = threadsByEngagement.get(t.engagement_id);
      if (!existing) threadsByEngagement.set(t.engagement_id, t);
    }
  }

  const threadIds = Array.from(threadsByEngagement.values()).map((t) => t.id);

  const lastMessageByThread = new Map<string, MessageRow>();
  const messageIdsByThread = new Map<string, string[]>();
  if (threadIds.length) {
    const { data: msgsData } = await sb
      .from('messages')
      .select('id, thread_id, body, created_at, sender_id')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    for (const m of (msgsData ?? []) as MessageRow[]) {
      if (!m.thread_id) continue;
      if (!lastMessageByThread.has(m.thread_id)) lastMessageByThread.set(m.thread_id, m);
      const arr = messageIdsByThread.get(m.thread_id) ?? [];
      arr.push(m.id);
      messageIdsByThread.set(m.thread_id, arr);
    }
  }

  const allMessageIds = Array.from(messageIdsByThread.values()).flat();
  const readSet = new Set<string>();
  if (allMessageIds.length) {
    const { data: receipts } = await sb
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', ctx.user.clerk_id)
      .in('message_id', allMessageIds);
    for (const r of receipts ?? []) {
      readSet.add((r as { message_id: string }).message_id);
    }
  }

  const rows = engagements
    .map((eng) => {
      const thread = threadsByEngagement.get(eng.id);
      const last = thread ? lastMessageByThread.get(thread.id) : undefined;
      const ids = thread ? messageIdsByThread.get(thread.id) ?? [] : [];
      const unread = ids.filter((id) => !readSet.has(id)).length;
      const sortKey = last?.created_at ?? thread?.last_message_at ?? '';
      return { eng, thread, last, unread, sortKey };
    })
    .sort((a, b) => (a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0));

  const newThreadEngagements = engagements.map((e) => ({ id: e.id, title: e.title }));

  if (rows.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Messages' }]} />
        <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-4">
          {newThreadEngagements.length > 0 && (
            <div className="flex items-center justify-end">
              <NewThreadButton engagements={newThreadEngagements} />
            </div>
          )}
          <EmptyState />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={[{ label: 'Messages' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Messages</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              One thread per project. No email loops, no Slack channels.
            </p>
          </div>
          <NewThreadButton engagements={newThreadEngagements} />
        </div>
        <div className="space-y-2">
          {rows.map(({ eng, last, unread }) => (
            <Link key={eng.id} href={`/portal/messages/${eng.id}`} className="block">
              <Card className="hover:bg-[#131316]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-[#fafafa] truncate">{eng.title}</span>
                      {unread > 0 && (
                        <Badge tone="cyan">
                          {unread} new
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-[#71717a] shrink-0">
                      {last ? formatRelative(last.created_at) : 'No messages'}
                    </span>
                  </div>
                  <p className="text-xs text-[#a1a1aa] line-clamp-1">
                    {last?.body ?? 'Start the conversation in this thread.'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-4">
          <MessageSquare className="w-5 h-5 text-[#71717a]" />
        </div>
        <h3 className="font-semibold text-[#fafafa]">No conversations yet</h3>
        <p className="text-sm text-[#71717a] mt-1.5">
          Start an engagement and a thread will land here.
        </p>
      </CardContent>
    </Card>
  );
}
