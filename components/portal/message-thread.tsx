'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/portal/ui/button';
import { Textarea } from '@/components/portal/ui/input';
import { initials, cn } from '@/lib/utils';

type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  pending?: boolean;
};

interface Props {
  engagementId: string;
  engagementTitle: string;
  threadId: string;
  currentUserId: string;
  currentUserAuthId: string;
  currentUserName: string;
  initialMessages: ThreadMessage[];
}

export function MessageThread({
  engagementId,
  engagementTitle,
  threadId,
  currentUserId,
  currentUserAuthId,
  currentUserName,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const rows = ids.map((message_id) => ({
        message_id,
        user_id: currentUserAuthId,
      }));
      await supabase
        .from('message_read_receipts')
        .upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    },
    [supabase, currentUserAuthId],
  );

  useEffect(() => {
    const ids = initialMessages.map((m) => m.id);
    void markRead(ids);
  }, [initialMessages, markRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:thread=${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const incoming = payload.new as {
            id: string;
            body: string;
            created_at: string;
            sender_id: string | null;
          };
          let senderName: string | null = null;
          let senderAvatar: string | null = null;
          if (incoming.sender_id) {
            const { data } = await supabase
              .from('app_users')
              .select('full_name, avatar_url')
              .eq('id', incoming.sender_id)
              .maybeSingle();
            const sender = data as { full_name: string | null; avatar_url: string | null } | null;
            senderName = sender?.full_name ?? null;
            senderAvatar = sender?.avatar_url ?? null;
          }
          setMessages((prev) => {
            const withoutPending = prev.filter(
              (m) => !(m.pending && m.sender_id === incoming.sender_id && m.body === incoming.body),
            );
            if (withoutPending.some((m) => m.id === incoming.id)) return withoutPending;
            return [
              ...withoutPending,
              {
                id: incoming.id,
                body: incoming.body,
                created_at: incoming.created_at,
                sender_id: incoming.sender_id,
                sender_name: senderName,
                sender_avatar: senderAvatar,
              },
            ];
          });
          scrollToBottom();
          if (incoming.sender_id !== currentUserId) {
            void markRead([incoming.id]);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, threadId, currentUserId, scrollToBottom, markRead]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setError(null);
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_avatar: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    scrollToBottom();

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ engagementId, threadId, body }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error((detail as { error?: string }).error ?? 'Failed to send');
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(body);
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 max-w-4xl w-full mx-auto"
      >
        {messages.length === 0 ? (
          <div className="text-center text-sm text-[#71717a] py-20">
            No messages yet. Start the conversation.
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <li
                  key={m.id}
                  className={cn('flex gap-3', mine ? 'flex-row-reverse' : 'flex-row')}
                >
                  <Avatar name={m.sender_name ?? 'Sage Studio'} url={m.sender_avatar} />
                  <div className={cn('max-w-[70%]', mine ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'flex items-baseline gap-2 mb-1 text-xs text-[#71717a]',
                        mine && 'justify-end',
                      )}
                    >
                      <span className="font-medium text-[#a1a1aa]">
                        {mine ? 'You' : m.sender_name ?? 'Sage Studio'}
                      </span>
                      <time>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    </div>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
                        mine
                          ? 'bg-[#06b6d4] text-[#09090b]'
                          : 'bg-[#18181b] text-[#fafafa] border border-[#27272a]',
                        m.pending && 'opacity-70',
                      )}
                    >
                      {m.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-[#27272a] bg-[#0a0a0c] px-6 lg:px-8 py-4"
      >
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-2 text-xs text-[#f43f5e]">{error}</div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message about ${engagementTitle}…`}
              rows={2}
              className="min-h-[44px] max-h-40"
            />
            <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="text-[10px] text-[#52525b] mt-1.5 text-right">
            Cmd/Ctrl + Enter to send
          </p>
        </div>
      </form>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full shrink-0 object-cover border border-[#27272a]"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full shrink-0 bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[10px] font-medium text-[#a1a1aa]">
      {initials(name || '·')}
    </div>
  );
}
