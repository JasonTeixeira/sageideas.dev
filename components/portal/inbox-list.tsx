'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Inbox, MailOpen, Check, Archive } from 'lucide-react';
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

type TypeFilter = 'all' | 'messages' | 'deliverables' | 'invoices';

const TYPE_CHIPS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'messages', label: 'Messages' },
  { value: 'deliverables', label: 'Deliverables' },
  { value: 'invoices', label: 'Invoices' },
];

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
  const pathname = usePathname() ?? '/portal/inbox';
  const searchParams = useSearchParams();
  const initialType = (searchParams?.get('type') ?? 'all') as TypeFilter;
  const validInitial: TypeFilter = TYPE_CHIPS.some((c) => c.value === initialType)
    ? initialType
    : 'all';

  const [type, setType] = useState<TypeFilter>(validInitial);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const updateUrlType = useCallback(
    (next: TypeFilter) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next === 'all') params.delete('type');
      else params.set('type', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, searchParams, pathname],
  );

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          filter: 'all',
          type,
        });
        const res = await fetch(`/api/notifications/all?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as Page;
        setTotal(data.total);
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        if (data.items.length < data.pageSize) setDone(true);
        else setDone(false);
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  // Reset when type changes.
  useEffect(() => {
    setItems([]);
    setSelected(new Set());
    setPage(1);
    setDone(false);
    loadPage(1, true);
  }, [type, loadPage]);

  // IntersectionObserver-based infinite scroll.
  useEffect(() => {
    if (done || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const next = page + 1;
          // Stop if we've already loaded everything.
          if (items.length >= total && total > 0) {
            setDone(true);
            return;
          }
          setPage(next);
          loadPage(next, false);
        }
      },
      { rootMargin: '200px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [done, loading, page, total, items.length, loadPage]);

  const allSelected = items.length > 0 && selected.size === items.length;
  const anySelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: 'mark_read' | 'archive') => {
    if (!anySelected) return;
    const ids = Array.from(selected);
    const res = await fetch('/api/portal/inbox/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) return;
    if (action === 'mark_read') {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) => (selected.has(n.id) ? { ...n, read_at: n.read_at ?? now } : n)),
      );
    } else {
      // archive: drop them from the list optimistically.
      setItems((prev) => prev.filter((n) => !selected.has(n.id)));
    }
    setSelected(new Set());
  };

  const markRead = useCallback(async (id: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  }, []);

  const handleClick = useCallback(
    (n: NotificationRow) => {
      if (!n.read_at) markRead(n.id);
      const url = (n.payload as { url?: string } | null)?.url ?? n.link;
      if (url) router.push(url);
    },
    [markRead, router],
  );

  const liveAnnouncement = useMemo(() => {
    if (loading) return 'Loading inbox…';
    if (items.length === 0) return 'Inbox is empty.';
    return `Showing ${items.length} of ${total} items.`;
  }, [loading, items.length, total]);

  return (
    <div className="space-y-4">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="inbox-live"
      >
        {liveAnnouncement}
      </div>

      <div
        className="flex items-center justify-between gap-3 flex-wrap"
        data-testid="inbox-filter-bar"
      >
        <div
          className="inline-flex rounded-lg border border-[#27272a] bg-[#0f0f12] p-1"
          role="tablist"
          aria-label="Filter by type"
        >
          {TYPE_CHIPS.map((c) => {
            const active = type === c.value;
            return (
              <button
                key={c.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`inbox-chip-${c.value}`}
                onClick={() => {
                  setType(c.value);
                  updateUrlType(c.value);
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  active
                    ? 'bg-[#18181b] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:text-[#fafafa]',
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {anySelected && (
          <div
            className="flex items-center gap-2"
            data-testid="inbox-bulk-bar"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <span className="text-xs text-[#a1a1aa]">{selected.size} selected</span>
            <button
              type="button"
              data-testid="inbox-bulk-mark-read"
              onClick={() => runBulk('mark_read')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Mark read
            </button>
            <button
              type="button"
              data-testid="inbox-bulk-archive"
              onClick={() => runBulk('archive')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#27272a] bg-[#0f0f12] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
        {items.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#1f1f23] bg-[#0c0c0f]">
            <input
              type="checkbox"
              data-testid="inbox-select-all"
              aria-label="Select all visible items"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-[#3f3f46] bg-[#0f0f12] accent-[#06b6d4] cursor-pointer"
            />
            <span className="text-xs text-[#71717a]">
              {allSelected ? 'All selected' : 'Select all'}
            </span>
          </div>
        )}

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
              const isSelected = selected.has(n.id);
              return (
                <li
                  key={n.id}
                  data-testid="inbox-item"
                  className={cn(
                    'flex items-start gap-3 px-5 py-4 hover:bg-[#131316] transition-colors',
                    !unread && 'opacity-70',
                  )}
                >
                  <input
                    type="checkbox"
                    data-testid="inbox-item-checkbox"
                    aria-label={`Select notification: ${n.title}`}
                    checked={isSelected}
                    onChange={() => toggleOne(n.id)}
                    className="mt-1 h-4 w-4 rounded border-[#3f3f46] bg-[#0f0f12] accent-[#06b6d4] cursor-pointer shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="flex-1 min-w-0 text-left flex items-start gap-3"
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
                        <div className="text-sm font-medium text-[#fafafa] truncate">
                          {n.title}
                        </div>
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

      <div ref={sentinelRef} aria-hidden className="h-2" />
      {items.length > 0 && loading && (
        <div className="text-xs text-[#71717a] text-center" data-testid="inbox-loading-more">
          Loading more…
        </div>
      )}
      {items.length > 0 && done && !loading && (
        <div className="text-xs text-[#52525b] text-center" data-testid="inbox-end">
          End of inbox
        </div>
      )}
    </div>
  );
}
