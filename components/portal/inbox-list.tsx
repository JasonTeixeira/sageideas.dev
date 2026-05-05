'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, MailOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

type Page = {
  items: NotificationRow[];
  page: number;
  pageSize: number;
  total: number;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function InboxList() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/all?page=${page}&filter=${filter}`, {
        cache: 'no-store',
      });
      if (res.ok) setData((await res.json()) as Page);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const markRead = useCallback(async (id: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((n) =>
          n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      };
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setData((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        items: prev.items.map((n) => (n.read_at ? n : { ...n, read_at: now })),
      };
    });
  }, []);

  const handleClick = useCallback(
    (n: NotificationRow) => {
      if (!n.read_at) markRead(n.id);
      const url = (n.payload as { url?: string } | null)?.url ?? n.link;
      if (url) router.push(url);
    },
    [markRead, router],
  );

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#27272a] bg-[#0f0f12] p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === f ? 'bg-[#18181b] text-[#fafafa]' : 'text-[#a1a1aa] hover:text-[#fafafa]',
              )}
            >
              {f === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Mark all as read
        </button>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-[#71717a]">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Inbox className="w-8 h-8 mx-auto text-[#52525b] mb-3" />
            <div className="text-sm text-[#a1a1aa]">No notifications.</div>
            <div className="text-xs text-[#52525b] mt-1">
              You are caught up. Updates will land here as they happen.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[#1f1f23]">
            {items.map((n) => {
              const unread = !n.read_at;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-5 py-4 hover:bg-[#131316] transition-colors flex items-start gap-3',
                      unread ? '' : 'opacity-70',
                    )}
                  >
                    <div className="mt-1 shrink-0">
                      {unread ? (
                        <span className="block w-2 h-2 rounded-full bg-[#06b6d4]" />
                      ) : (
                        <MailOpen className="w-3.5 h-3.5 text-[#52525b]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-sm font-medium text-[#fafafa] truncate">{n.title}</div>
                        <div className="text-[11px] text-[#52525b] shrink-0">
                          {formatRelative(n.created_at)}
                        </div>
                      </div>
                      {n.body && (
                        <p className="text-xs text-[#a1a1aa] mt-1 line-clamp-2">{n.body}</p>
                      )}
                      <div className="text-[10px] uppercase tracking-wider text-[#52525b] mt-1.5 font-mono">
                        {n.kind}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-[#71717a]">
          <span>
            Page {data.page} of {totalPages} - {data.total} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] disabled:opacity-40 hover:text-[#fafafa] disabled:hover:text-[#a1a1aa]"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] disabled:opacity-40 hover:text-[#fafafa] disabled:hover:text-[#a1a1aa]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
