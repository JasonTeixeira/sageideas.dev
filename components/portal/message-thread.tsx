'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Paperclip,
  Send,
  X,
  FileText,
  Download,
  CornerDownRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Smile,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
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

export type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  attachments?: Attachment[] | null;
  parent_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  edit_count?: number | null;
  pending?: boolean;
};

export type ReactionEntry = {
  message_id: string;
  user_id: string;
  emoji: string;
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

const QUICK_REACTIONS: { name: string; emoji: string }[] = [
  { name: 'thumbs-up', emoji: '👍' },
  { name: 'heart', emoji: '❤️' },
  { name: 'tada', emoji: '🎉' },
  { name: 'eyes', emoji: '👀' },
  { name: 'rocket', emoji: '🚀' },
  { name: 'joy', emoji: '😂' },
];
const EMOJI_TO_NAME: Record<string, string> = Object.fromEntries(
  QUICK_REACTIONS.map((r) => [r.emoji, r.name]),
);
const NAME_TO_EMOJI: Record<string, string> = Object.fromEntries(
  QUICK_REACTIONS.map((r) => [r.name, r.emoji]),
);

function nameForEmoji(emoji: string): string {
  return EMOJI_TO_NAME[emoji] ?? 'other';
}

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
  currentUserIsAdmin: boolean;
  initialMessages: ThreadMessage[];
  initialReactions: ReactionEntry[];
}

type ReactionAggregate = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type ReplyTarget = {
  id: string; // root parent id (we flatten to depth 1)
  authorName: string;
  snippet: string;
};

export function MessageThread({
  engagementId,
  engagementTitle,
  threadId,
  currentUserId,
  currentUserAuthId,
  currentUserName,
  currentUserIsAdmin,
  initialMessages,
  initialReactions,
}: Props) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [reactions, setReactions] = useState<ReactionEntry[]>(initialReactions);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
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

  // Read receipts on mount.
  useEffect(() => {
    if (initialMessages.length === 0) return;
    const rows = initialMessages.map((m) => ({
      message_id: m.id,
      user_id: currentUserAuthId,
    }));
    void supabase
      .from('message_read_receipts')
      .upsert(rows, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
  }, [supabase, initialMessages, currentUserAuthId]);

  // Track current message ids in a ref so the reactions handlers can filter
  // INSERT/DELETE rows to the active thread without re-subscribing every
  // time a message lands.
  const messageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // Realtime — messages INSERT / UPDATE for this thread + reactions
  // INSERT / DELETE for messages in this thread.
  useEffect(() => {
    const channel = supabase.channel(`thread:${threadId}`);

    channel.on(
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
          parent_id: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          edit_count: number | null;
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
          // Drop pending optimistic that matches body+sender (parent_id may
          // be null on optimistic, which is fine).
          const withoutPending = prev.filter(
            (m) =>
              !(m.pending && m.sender_id === incoming.sender_id && m.body === incoming.body),
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
              parent_id: incoming.parent_id,
              edited_at: incoming.edited_at,
              deleted_at: incoming.deleted_at,
              edit_count: incoming.edit_count,
            },
          ];
        });
        scrollToBottom();
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const updated = payload.new as {
          id: string;
          body: string;
          edited_at: string | null;
          deleted_at: string | null;
          edit_count: number | null;
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  body: updated.body,
                  edited_at: updated.edited_at,
                  deleted_at: updated.deleted_at,
                  edit_count: updated.edit_count,
                }
              : m,
          ),
        );
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
      },
      (payload) => {
        const r = payload.new as {
          message_id: string;
          user_id: string;
          emoji: string;
        };
        if (!messageIdsRef.current.has(r.message_id)) return;
        setReactions((prev) => {
          if (
            prev.some(
              (x) =>
                x.message_id === r.message_id &&
                x.user_id === r.user_id &&
                x.emoji === r.emoji,
            )
          ) {
            return prev;
          }
          return [...prev, r];
        });
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions',
      },
      (payload) => {
        const r = payload.old as {
          message_id: string;
          user_id: string;
          emoji: string;
        };
        setReactions((prev) =>
          prev.filter(
            (x) =>
              !(
                x.message_id === r.message_id &&
                x.user_id === r.user_id &&
                x.emoji === r.emoji
              ),
          ),
        );
      },
    );

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload as { userId?: string; userName?: string; typing?: boolean };
      if (!data.userId || data.userId === currentUserAuthId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.typing) {
          next.set(data.userId!, data.userName ?? 'Someone');
        } else {
          next.delete(data.userId!);
        }
        return next;
      });
    });

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, threadId, currentUserAuthId, scrollToBottom]);

  // Aggregate reactions per message + emoji.
  const reactionAggByMessage = useMemo(() => {
    const map = new Map<string, ReactionAggregate[]>();
    for (const r of reactions) {
      const arr = map.get(r.message_id) ?? [];
      const existing = arr.find((a) => a.emoji === r.emoji);
      if (existing) {
        existing.count += 1;
        if (r.user_id === currentUserAuthId) existing.reactedByMe = true;
      } else {
        arr.push({
          emoji: r.emoji,
          count: 1,
          reactedByMe: r.user_id === currentUserAuthId,
        });
      }
      map.set(r.message_id, arr);
    }
    return map;
  }, [reactions, currentUserAuthId]);

  // Build a parent → children index for nested rendering.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, ThreadMessage[]>();
    for (const m of messages) {
      if (!m.parent_id) continue;
      const arr = map.get(m.parent_id) ?? [];
      arr.push(m);
      map.set(m.parent_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return map;
  }, [messages]);

  const topLevelMessages = useMemo(
    () =>
      messages
        .filter((m) => !m.parent_id)
        .sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [messages],
  );

  // Typing broadcast — debounced.
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    channelRef.current = supabase.channel(`thread:${threadId}:presence`);
    channelRef.current.subscribe();
    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [supabase, threadId]);

  function broadcastTyping(typing: boolean) {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserAuthId, userName: currentUserName, typing },
    });
  }

  function noteTyping() {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTyping(true);
    }
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
      broadcastTyping(false);
    }, 1500);
  }

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
            p.id === pending.id ? { ...p, status: 'error', error: 'Network error' } : p,
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

  function startReply(target: ThreadMessage) {
    // Flatten beyond depth 1: if user clicked Reply on a reply, the chip
    // points to the root of the chain.
    const rootId = target.parent_id ?? target.id;
    const rootMsg = messages.find((m) => m.id === rootId) ?? target;
    const author = rootMsg.sender_id === currentUserId ? 'yourself' : (rootMsg.sender_name ?? 'Sage Studio');
    const snippet = (rootMsg.body ?? '').slice(0, 80);
    setReplyTarget({ id: rootId, authorName: author, snippet });
    setExpandedRoots((prev) => new Set([...prev, rootId]));
    requestAnimationFrame(() => {
      composerRef.current?.focus();
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
      parent_id: replyTarget?.id ?? null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setPendingUploads([]);
    const stagedReply = replyTarget;
    setReplyTarget(null);
    scrollToBottom();
    if (isTypingRef.current) {
      isTypingRef.current = false;
      broadcastTyping(false);
    }

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          threadId,
          body,
          attachments: attachmentsForSend,
          parentId: stagedReply?.id ?? null,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error((detail as { error?: string }).error ?? 'Failed to send');
      }
      // Swap optimistic temp id with the canonical row from the server so
      // immediate follow-on actions (reply, react, edit, delete) hit the
      // correct UUID without waiting for the realtime INSERT to land.
      const json = (await res.json().catch(() => null)) as
        | { message?: { id?: string; created_at?: string; parent_id?: string | null } }
        | null;
      const real = json?.message;
      if (real?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: real.id as string,
                  created_at: real.created_at ?? m.created_at,
                  parent_id: (real.parent_id as string | null | undefined) ?? m.parent_id ?? null,
                  pending: false,
                }
              : m,
          ),
        );
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

  async function toggleReaction(messageId: string, emoji: string) {
    const aliasName = nameForEmoji(emoji);
    // Optimistic toggle.
    setReactions((prev) => {
      const has = prev.some(
        (r) =>
          r.message_id === messageId &&
          r.user_id === currentUserAuthId &&
          r.emoji === emoji,
      );
      if (has) {
        return prev.filter(
          (r) =>
            !(
              r.message_id === messageId &&
              r.user_id === currentUserAuthId &&
              r.emoji === emoji
            ),
        );
      }
      return [...prev, { message_id: messageId, user_id: currentUserAuthId, emoji }];
    });
    setOpenPickerFor(null);
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emoji: aliasName ?? emoji }),
      });
      if (!res.ok) throw new Error('reaction request failed');
    } catch {
      // Roll back optimistic update if request failed.
      setReactions((prev) => {
        const has = prev.some(
          (r) =>
            r.message_id === messageId &&
            r.user_id === currentUserAuthId &&
            r.emoji === emoji,
        );
        if (has) {
          return prev.filter(
            (r) =>
              !(
                r.message_id === messageId &&
                r.user_id === currentUserAuthId &&
                r.emoji === emoji
              ),
          );
        }
        return [...prev, { message_id: messageId, user_id: currentUserAuthId, emoji }];
      });
    }
  }

  function startEdit(message: ThreadMessage) {
    setEditingId(message.id);
    setEditDraft(message.body);
    setOpenActionsFor(null);
  }

  async function saveEdit(message: ThreadMessage) {
    const newBody = editDraft.trim();
    if (!newBody) return;
    if (newBody === message.body) {
      setEditingId(null);
      return;
    }
    // Optimistic update.
    const previous = { body: message.body, edited_at: message.edited_at, edit_count: message.edit_count };
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              body: newBody,
              edited_at: new Date().toISOString(),
              edit_count: (m.edit_count ?? 0) + 1,
            }
          : m,
      ),
    );
    setEditingId(null);
    try {
      const res = await fetch(`/api/messages/${message.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
      if (!res.ok) throw new Error('edit failed');
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                body: previous.body,
                edited_at: previous.edited_at ?? null,
                edit_count: previous.edit_count ?? 0,
              }
            : m,
        ),
      );
      setError('Edit failed.');
    }
  }

  async function deleteMessage(message: ThreadMessage) {
    setOpenActionsFor(null);
    if (!window.confirm('Delete this message?')) return;
    const prev = messages;
    setMessages((curr) =>
      curr.map((m) =>
        m.id === message.id ? { ...m, deleted_at: new Date().toISOString() } : m,
      ),
    );
    try {
      const res = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    } catch {
      setMessages(prev);
      setError('Delete failed.');
    }
  }

  const typingNames = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 max-w-4xl w-full mx-auto"
      >
        {topLevelMessages.length === 0 ? (
          <div className="text-center text-sm text-[#71717a] py-20">
            No messages yet. Start the conversation.
          </div>
        ) : (
          <ul className="space-y-4">
            {topLevelMessages.map((m) => {
              const replies = childrenByParent.get(m.id) ?? [];
              const expanded = expandedRoots.has(m.id);
              return (
                <li key={m.id} className="space-y-2">
                  <Bubble
                    msg={m}
                    isReply={false}
                    currentUserId={currentUserId}
                    currentUserAuthId={currentUserAuthId}
                    currentUserIsAdmin={currentUserIsAdmin}
                    reactions={reactionAggByMessage.get(m.id) ?? []}
                    onReply={() => startReply(m)}
                    onToggleReaction={(emoji) => toggleReaction(m.id, emoji)}
                    pickerOpen={openPickerFor === m.id}
                    onTogglePicker={() =>
                      setOpenPickerFor((cur) => (cur === m.id ? null : m.id))
                    }
                    actionsOpen={openActionsFor === m.id}
                    onToggleActions={() =>
                      setOpenActionsFor((cur) => (cur === m.id ? null : m.id))
                    }
                    onStartEdit={() => startEdit(m)}
                    onDelete={() => deleteMessage(m)}
                    isEditing={editingId === m.id}
                    editDraft={editDraft}
                    onEditDraftChange={setEditDraft}
                    onSaveEdit={() => saveEdit(m)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                  {replies.length > 0 ? (
                    <div className="ml-12">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRoots((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-[#22d3ee] hover:text-[#67e8f9]"
                        data-testid="replies-expander"
                        aria-expanded={expanded}
                      >
                        <CornerDownRight className="w-3 h-3" />
                        {expanded ? 'Hide' : 'Show'} {replies.length} repl
                        {replies.length === 1 ? 'y' : 'ies'}
                      </button>
                      {expanded ? (
                        <ul className="mt-2 space-y-3 border-l-2 border-[#27272a] pl-4">
                          {replies.map((r) => (
                            <li key={r.id} data-testid="reply-bubble">
                              <Bubble
                                msg={r}
                                isReply
                                currentUserId={currentUserId}
                                currentUserAuthId={currentUserAuthId}
                                currentUserIsAdmin={currentUserIsAdmin}
                                reactions={reactionAggByMessage.get(r.id) ?? []}
                                onReply={() => startReply(r)}
                                onToggleReaction={(emoji) => toggleReaction(r.id, emoji)}
                                pickerOpen={openPickerFor === r.id}
                                onTogglePicker={() =>
                                  setOpenPickerFor((cur) => (cur === r.id ? null : r.id))
                                }
                                actionsOpen={openActionsFor === r.id}
                                onToggleActions={() =>
                                  setOpenActionsFor((cur) => (cur === r.id ? null : r.id))
                                }
                                onStartEdit={() => startEdit(r)}
                                onDelete={() => deleteMessage(r)}
                                isEditing={editingId === r.id}
                                editDraft={editDraft}
                                onEditDraftChange={setEditDraft}
                                onSaveEdit={() => saveEdit(r)}
                                onCancelEdit={() => setEditingId(null)}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
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
          {typingNames.length > 0 ? (
            <div
              className="text-[11px] text-[#71717a] mb-1.5"
              data-testid="typing-indicator"
            >
              {typingNames.length === 1
                ? `${typingNames[0]} is typing…`
                : `${typingNames.length} people are typing…`}
            </div>
          ) : null}
          {replyTarget ? (
            <div
              className="mb-2 inline-flex items-center gap-2 rounded-md border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-2 py-1 text-[11px] text-[#a5f3fc]"
              data-testid="compose-reply-chip"
            >
              <CornerDownRight className="w-3 h-3" />
              <span>
                Replying to{' '}
                <span className="font-medium">{replyTarget.authorName}</span>
                {replyTarget.snippet ? (
                  <>
                    {' '}
                    · <span className="opacity-80">&ldquo;{replyTarget.snippet}&rdquo;</span>
                  </>
                ) : null}
              </span>
              <button
                type="button"
                aria-label="Clear reply"
                className="text-[#a5f3fc] hover:text-white"
                onClick={() => setReplyTarget(null)}
                data-testid="compose-reply-chip-clear"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : null}
          {error && <div className="mb-2 text-xs text-[#f43f5e]">{error}</div>}
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
              ref={composerRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                noteTyping();
              }}
              onBlur={() => {
                if (isTypingRef.current) {
                  isTypingRef.current = false;
                  broadcastTyping(false);
                }
              }}
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

function Bubble({
  msg,
  isReply,
  currentUserId,
  currentUserAuthId,
  currentUserIsAdmin,
  reactions,
  onReply,
  onToggleReaction,
  pickerOpen,
  onTogglePicker,
  actionsOpen,
  onToggleActions,
  onStartEdit,
  onDelete,
  isEditing,
  editDraft,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
}: {
  msg: ThreadMessage;
  isReply: boolean;
  currentUserId: string;
  currentUserAuthId: string;
  currentUserIsAdmin: boolean;
  reactions: ReactionAggregate[];
  onReply: () => void;
  onToggleReaction: (emoji: string) => void;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  actionsOpen: boolean;
  onToggleActions: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const mine = msg.sender_id === currentUserId;
  const isDeleted = !!msg.deleted_at;
  const canMutate = !isDeleted && (mine || currentUserIsAdmin);

  return (
    <div
      data-message-id={msg.id}
      className={cn('flex gap-3', mine ? 'flex-row-reverse' : 'flex-row')}
    >
      <Avatar name={msg.sender_name ?? 'Sage Studio'} url={msg.sender_avatar} />
      <div className={cn('max-w-[70%] min-w-0', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'flex items-baseline gap-2 mb-1 text-xs text-[#71717a]',
            mine && 'justify-end',
          )}
        >
          <span className="font-medium text-[#a1a1aa]">
            {mine ? 'You' : msg.sender_name ?? 'Sage Studio'}
          </span>
          <time>
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {msg.edited_at && !isDeleted ? (
            <span
              className="text-[10px] text-[#52525b]"
              title={`Edited ${new Date(msg.edited_at).toLocaleString()}`}
              data-testid="msg-edited-badge"
            >
              (edited)
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            'group relative rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words space-y-2',
            isDeleted
              ? 'bg-[#0f0f12] border border-dashed border-[#27272a] text-[#52525b] italic'
              : mine
                ? 'bg-[#06b6d4] text-[#09090b]'
                : 'bg-[#18181b] text-[#fafafa] border border-[#27272a]',
            msg.pending && 'opacity-70',
            isReply && 'text-[13px]',
          )}
        >
          {isDeleted ? (
            <div data-testid="msg-deleted-placeholder">
              {msg.sender_name ? `${msg.sender_name} deleted this message.` : 'Message deleted.'}
            </div>
          ) : isEditing ? (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-md border border-[#3f3f46] bg-[#0f0f12] text-[#fafafa] px-2 py-1.5 text-sm focus:outline-none focus:border-[#06b6d4]"
                value={editDraft}
                onChange={(e) => onEditDraftChange(e.target.value)}
                rows={3}
                data-testid="msg-edit-input"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelEdit}
                  data-testid="msg-edit-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSaveEdit}
                  data-testid="msg-edit-save"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {msg.body ? <div>{msg.body}</div> : null}
              {msg.attachments && msg.attachments.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {msg.attachments.map((a) => (
                    <MessageAttachment key={a.path} attachment={a} mine={mine} />
                  ))}
                </div>
              ) : null}
            </>
          )}

          {!isDeleted && !isEditing ? (
            <div
              className={cn(
                'absolute -top-3 flex items-center gap-1 rounded-full border border-[#27272a] bg-[#0a0a0d] shadow opacity-60 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
                mine ? 'left-2' : 'right-2',
              )}
            >
              <button
                type="button"
                onClick={onTogglePicker}
                className="px-1.5 py-1 text-[#a1a1aa] hover:text-[#fafafa]"
                aria-label="Add reaction"
                data-testid="reaction-picker-toggle"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onReply}
                className="px-1.5 py-1 text-[#a1a1aa] hover:text-[#fafafa] text-[11px]"
                data-testid="message-reply-btn"
              >
                Reply
              </button>
              {canMutate ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={onToggleActions}
                    className="px-1.5 py-1 text-[#a1a1aa] hover:text-[#fafafa]"
                    aria-label="More actions"
                    data-testid="msg-actions-menu"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {actionsOpen ? (
                    <div className="absolute right-0 mt-1 z-20 w-32 rounded-md border border-[#27272a] bg-[#0f0f12] py-1 text-xs shadow-lg">
                      <button
                        type="button"
                        onClick={onStartEdit}
                        className="w-full px-3 py-1.5 text-left text-[#fafafa] hover:bg-[#18181b] flex items-center gap-2"
                        data-testid="msg-edit-action"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={onDelete}
                        className="w-full px-3 py-1.5 text-left text-[#f43f5e] hover:bg-[#18181b] flex items-center gap-2"
                        data-testid="msg-delete-action"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {pickerOpen && !isDeleted ? (
            <div
              className={cn(
                'absolute z-30 mt-1 flex items-center gap-1 rounded-full border border-[#27272a] bg-[#0f0f12] px-2 py-1 shadow-lg',
                mine ? 'right-0' : 'left-0',
              )}
            >
              {QUICK_REACTIONS.map((r) => (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => onToggleReaction(r.emoji)}
                  className="text-base hover:scale-110 transition-transform"
                  aria-label={r.name}
                  data-testid={`reaction-quick-${r.name}`}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {reactions.length > 0 && !isDeleted ? (
          <div
            className={cn(
              'mt-1.5 flex flex-wrap gap-1',
              mine ? 'justify-end' : 'justify-start',
            )}
          >
            {reactions.map((r) => {
              const name = nameForEmoji(r.emoji);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onToggleReaction(r.emoji)}
                  data-testid={`reaction-chip-${name}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] tabular-nums',
                    r.reactedByMe
                      ? 'border-[#06b6d4] bg-[#06b6d4]/15 text-[#67e8f9]'
                      : 'border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] hover:border-[#52525b]',
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
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

void NAME_TO_EMOJI; // referenced only by tests; keep export shape stable.
