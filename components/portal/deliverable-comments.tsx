'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  CornerDownRight,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Textarea } from '@/components/portal/ui/input';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { cn, formatRelative } from '@/lib/utils';

export type DeliverableComment = {
  id: string;
  deliverable_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string | null;
  body: string;
  resolved_at: string | null;
  resolved_by: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export function DeliverableComments({
  deliverableId,
  currentUserId,
  currentUserIsAdmin,
}: {
  deliverableId: string;
  currentUserId: string;
  currentUserIsAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<DeliverableComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/comments`);
      if (!res.ok) return;
      const json = (await res.json()) as { comments: DeliverableComment[] };
      setComments(json.comments ?? []);
      setLoaded(true);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    if (open && !loaded) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded]);

  const visibleCount = useMemo(
    () => comments.filter((c) => !c.deleted_at).length,
    [comments],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, DeliverableComment[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const arr = map.get(c.parent_id) ?? [];
      arr.push(c);
      map.set(c.parent_id, arr);
    }
    return map;
  }, [comments]);

  const topLevel = useMemo(
    () =>
      comments
        .filter((c) => !c.parent_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [comments],
  );

  async function submitCompose() {
    const body = composeBody.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, parent_id: replyTo?.id ?? null }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? 'Submit failed');
      }
      setComposeBody('');
      setReplyTo(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(commentId: string, newBody: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/deliverable-comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: newBody }),
      });
      if (!res.ok) throw new Error('Edit failed');
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm('Delete this comment?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/deliverable-comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolve(commentId: string, resolved: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/deliverable-comments/${commentId}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) throw new Error('Resolve failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resolve failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-[#22d3ee] hover:text-[#67e8f9]"
        data-testid={`deliverable-comments-toggle-${deliverableId}`}
        aria-expanded={open}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Comments {loaded ? `(${visibleCount})` : ''}
      </button>

      {open ? (
        <Card className="mt-3">
          <CardContent className="p-4 space-y-3">
            {!loaded ? (
              <p className="text-xs text-[#71717a]">Loading…</p>
            ) : topLevel.length === 0 ? (
              <p className="text-xs text-[#71717a]">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {topLevel.map((c) => {
                  const replies = childrenByParent.get(c.id) ?? [];
                  return (
                    <li key={c.id} className="space-y-2">
                      <CommentBubble
                        comment={c}
                        currentUserId={currentUserId}
                        currentUserIsAdmin={currentUserIsAdmin}
                        editingId={editingId}
                        onStartEdit={() => setEditingId(c.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={(value) => saveEdit(c.id, value)}
                        onDelete={() => deleteComment(c.id)}
                        onToggleResolve={(r) => toggleResolve(c.id, r)}
                        onReply={() => {
                          setReplyTo({
                            id: c.id,
                            author: c.author_name ?? 'someone',
                          });
                          requestAnimationFrame(() => composerRef.current?.focus());
                        }}
                      />
                      {replies.length > 0 ? (
                        <ul className="ml-6 space-y-2 border-l-2 border-[#27272a] pl-3">
                          {replies.map((r) => (
                            <li key={r.id}>
                              <CommentBubble
                                comment={r}
                                currentUserId={currentUserId}
                                currentUserIsAdmin={currentUserIsAdmin}
                                editingId={editingId}
                                onStartEdit={() => setEditingId(r.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onSaveEdit={(value) => saveEdit(r.id, value)}
                                onDelete={() => deleteComment(r.id)}
                                onToggleResolve={(rs) => toggleResolve(r.id, rs)}
                                onReply={() => {
                                  setReplyTo({
                                    id: c.id,
                                    author: c.author_name ?? 'someone',
                                  });
                                  requestAnimationFrame(() => composerRef.current?.focus());
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {replyTo ? (
              <div className="text-[11px] text-[#a5f3fc] inline-flex items-center gap-2 rounded-md border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-2 py-1">
                <CornerDownRight className="w-3 h-3" />
                <span>Replying to {replyTo.author}</span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="hover:text-white"
                  aria-label="Clear reply"
                >
                  ×
                </button>
              </div>
            ) : null}

            <div className="space-y-2">
              <Textarea
                ref={composerRef}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={2}
                maxLength={8000}
                placeholder="Add a comment…"
                data-testid="deliverable-comment-compose"
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  role="status"
                  aria-live="polite"
                  className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
                >
                  {error ?? '·'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !composeBody.trim()}
                  onClick={submitCompose}
                  data-testid="deliverable-comment-submit"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Comment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CommentBubble({
  comment,
  currentUserId,
  currentUserIsAdmin,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleResolve,
  onReply,
}: {
  comment: DeliverableComment;
  currentUserId: string;
  currentUserIsAdmin: boolean;
  editingId: string | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (value: string) => void;
  onDelete: () => void;
  onToggleResolve: (resolved: boolean) => void;
  onReply: () => void;
}) {
  const isMine = comment.author_id === currentUserId;
  const canMutate = !comment.deleted_at && (isMine || currentUserIsAdmin);
  const isEditing = editingId === comment.id;
  const isResolved = !!comment.resolved_at;
  const isDeleted = !!comment.deleted_at;

  return (
    <div
      data-testid={`deliverable-comment-bubble-${comment.id}`}
      data-comment-id={comment.id}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm space-y-1',
        isResolved
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-[#27272a] bg-[#0f0f12]',
        isDeleted && 'italic text-[#52525b]',
      )}
    >
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-[#71717a]">
        <span className="font-medium text-[#a1a1aa]">
          {comment.author_name ?? 'Sage Studio'}
        </span>
        <span>{formatRelative(comment.created_at)}</span>
      </div>
      {isDeleted ? (
        <div data-testid="deliverable-comment-deleted-placeholder">
          Comment deleted.
        </div>
      ) : isEditing ? (
        <EditingComment
          initial={comment.body}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      ) : (
        <>
          <div className="whitespace-pre-wrap text-[#fafafa]">{comment.body}</div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {isResolved ? (
              <Badge tone="emerald">✓ Resolved</Badge>
            ) : null}
            {comment.edited_at ? (
              <span
                className="text-[10px] text-[#52525b]"
                data-testid="deliverable-comment-edited-badge"
              >
                (edited)
              </span>
            ) : null}
            {!isResolved ? (
              <button
                type="button"
                onClick={onReply}
                className="text-[11px] text-[#a1a1aa] hover:text-[#fafafa]"
                data-testid="deliverable-comment-reply-btn"
              >
                Reply
              </button>
            ) : null}
            {canMutate ? (
              <>
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="text-[11px] text-[#a1a1aa] hover:text-[#fafafa] inline-flex items-center gap-1"
                  data-testid="deliverable-comment-edit-btn"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-[11px] text-[#a1a1aa] hover:text-[#f43f5e] inline-flex items-center gap-1"
                  data-testid="deliverable-comment-delete-btn"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => onToggleResolve(!isResolved)}
                  className="text-[11px] text-[#a1a1aa] hover:text-emerald-300 inline-flex items-center gap-1"
                  data-testid="deliverable-comment-resolve-btn"
                >
                  {isResolved ? (
                    <>
                      <RotateCcw className="w-3 h-3" /> Unresolve
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" /> Resolve
                    </>
                  )}
                </button>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function EditingComment({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        maxLength={8000}
        autoFocus
        data-testid="deliverable-comment-edit-input"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(value.trim())}
          disabled={!value.trim()}
          data-testid="deliverable-comment-edit-save"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
