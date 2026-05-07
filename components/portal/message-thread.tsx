'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, Send, X, FileText, Download } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/portal/ui/button';
import { Textarea } from '@/components/portal/ui/input';
import { initials, cn } from '@/lib/utils';

export type Attachment = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  attachments?: Attachment[] | null;
  pending?: boolean;
};

type PendingUpload = {
  id: string;
  name: string;
  size: number;
  mime: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  path?: string;
  controller: AbortController;
};

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME_RE = /^image\//i;

function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function isAttachmentArray(v: unknown): v is Attachment[] {
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
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
            attachments: unknown;
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
          const attachments: Attachment[] | null = isAttachmentArray(incoming.attachments)
            ? incoming.attachments
            : null;
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
                attachments,
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

  function handlePickAttachments(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    setError(null);

    const next: PendingUpload[] = [];
    for (const f of picked) {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        setError(`${f.name} is larger than 25 MB.`);
        continue;
      }
      next.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        mime: f.type || 'application/octet-stream',
        progress: 0,
        status: 'uploading',
        controller: new AbortController(),
      });
    }
    if (next.length === 0) return;
    setPendingUploads((prev) => [...prev, ...next]);

    next.forEach((pending, i) => {
      const file = picked[i];
      if (!file) return;
      const fd = new FormData();
      fd.append('thread_id', threadId);
      fd.append('file', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/portal/messages/attachments');
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
        setPendingUploads((prev) =>
          prev.map((p) => (p.id === pending.id ? { ...p, progress: pct } : p)),
        );
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let path: string | undefined;
          try {
            const j = JSON.parse(xhr.responseText) as { attachment?: { path?: string } };
            path = j.attachment?.path;
          } catch {
            // ignore
          }
          if (path) {
            setPendingUploads((prev) =>
              prev.map((p) =>
                p.id === pending.id ? { ...p, progress: 100, status: 'done', path } : p,
              ),
            );
          } else {
            setPendingUploads((prev) =>
              prev.map((p) =>
                p.id === pending.id
                  ? { ...p, status: 'error', error: 'Missing path in response' }
                  : p,
              ),
            );
          }
        } else {
          let msg = 'Upload failed';
          try {
            const j = JSON.parse(xhr.responseText) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            // ignore
          }
          setPendingUploads((prev) =>
            prev.map((p) =>
              p.id === pending.id ? { ...p, status: 'error', error: msg } : p,
            ),
          );
        }
      };
      xhr.onerror = () => {
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.id === pending.id
              ? { ...p, status: 'error', error: 'Network error' }
              : p,
          ),
        );
      };
      pending.controller.signal.addEventListener('abort', () => xhr.abort());
      xhr.send(fd);
    });
  }

  function removePending(id: string) {
    setPendingUploads((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item && item.status === 'uploading') item.controller.abort();
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    const ready = pendingUploads.filter((p) => p.status === 'done' && p.path);
    const hasUploading = pendingUploads.some((p) => p.status === 'uploading');
    if (hasUploading) {
      setError('Wait for attachments to finish uploading.');
      return;
    }
    if (!body && ready.length === 0) return;
    if (sending) return;
    setError(null);
    setSending(true);

    const attachmentsForSend: Attachment[] = ready.map((p) => ({
      path: p.path as string,
      name: p.name,
      mime: p.mime,
      size: p.size,
    }));

    const tempId = `temp-${Date.now()}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_avatar: null,
      attachments: attachmentsForSend.length > 0 ? attachmentsForSend : null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setPendingUploads([]);
    scrollToBottom();

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          threadId,
          body,
          attachments: attachmentsForSend,
        }),
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
                        'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words space-y-2',
                        mine
                          ? 'bg-[#06b6d4] text-[#09090b]'
                          : 'bg-[#18181b] text-[#fafafa] border border-[#27272a]',
                        m.pending && 'opacity-70',
                      )}
                    >
                      {m.body ? <div>{m.body}</div> : null}
                      {m.attachments && m.attachments.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {m.attachments.map((a) => (
                            <MessageAttachment key={a.path} attachment={a} mine={mine} />
                          ))}
                        </div>
                      ) : null}
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
          {pendingUploads.length > 0 ? (
            <ul className="mb-2 flex flex-wrap gap-2" data-testid="message-attach-list">
              {pendingUploads.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px]',
                    p.status === 'error'
                      ? 'border-[#f43f5e]/40 bg-[#f43f5e]/10 text-[#f43f5e]'
                      : 'border-[#27272a] bg-[#0f0f12] text-[#a1a1aa]',
                  )}
                >
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[12rem]">{p.name}</span>
                  <span className="tabular-nums text-[10px]">
                    {p.status === 'error'
                      ? p.error ?? 'Error'
                      : p.status === 'done'
                        ? 'Ready'
                        : `${p.progress}%`}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove"
                    className="text-[#71717a] hover:text-[#fafafa]"
                    onClick={() => removePending(p.id)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handlePickAttachments}
              data-testid="message-attach-input"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              data-testid="message-attach-button"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message about ${engagementTitle}…`}
              rows={2}
              className="min-h-[44px] max-h-40"
            />
            <Button
              type="submit"
              disabled={
                sending ||
                pendingUploads.some((p) => p.status === 'uploading') ||
                (!draft.trim() && pendingUploads.filter((p) => p.status === 'done').length === 0)
              }
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="text-[10px] text-[#52525b] mt-1.5 text-right">
            Cmd/Ctrl + Enter to send · 25 MB per attachment
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

function MessageAttachment({
  attachment,
  mine,
}: {
  attachment: Attachment;
  mine: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = IMAGE_MIME_RE.test(attachment.mime);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const res = await fetch(
          `/api/portal/messages/attachments/url?path=${encodeURIComponent(attachment.path)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { url?: string };
        if (!cancelled && json.url) setSignedUrl(json.url);
      } catch {
        // non-fatal
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [attachment.path]);

  if (isImage) {
    return signedUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        data-testid="message-attachment-download"
      >
        <img
          src={signedUrl}
          alt={attachment.name}
          className="max-w-[300px] max-h-[300px] rounded-md border border-[#27272a] object-cover"
          data-testid="message-attachment-image"
        />
      </a>
    ) : (
      <div
        className="w-[200px] h-[120px] rounded-md border border-[#27272a] bg-[#18181b]"
        data-testid="message-attachment-image"
        aria-busy="true"
      />
    );
  }

  return (
    <a
      href={signedUrl ?? '#'}
      target={signedUrl ? '_blank' : undefined}
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!signedUrl) e.preventDefault();
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs no-underline',
        mine
          ? 'border-[#0e7490] bg-[#06b6d4]/30 text-[#09090b] hover:bg-[#06b6d4]/40'
          : 'border-[#27272a] bg-[#0f0f12] text-[#fafafa] hover:bg-[#131316]',
      )}
      data-testid="message-attachment-chip"
    >
      <FileText className="w-3.5 h-3.5" />
      <span className="truncate max-w-[14rem]">{attachment.name}</span>
      <span className="opacity-70 tabular-nums">{formatBytes(attachment.size)}</span>
      <Download className="w-3 h-3" data-testid="message-attachment-download" />
    </a>
  );
}
