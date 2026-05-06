'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Send, Trash2, Eye } from 'lucide-react';
import { formatRelative } from '@/lib/utils';

export type DocStatus = 'draft' | 'shared' | 'sent' | 'signed' | 'countersigned' | 'void';

export type DocRow = {
  id: string;
  title: string;
  status: DocStatus;
  organization_name: string | null;
  engagement_title: string | null;
  uploaded_by_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

const STATUS_TONE: Record<DocStatus, string> = {
  draft: 'bg-[#52525b]/15 text-[#a1a1aa] border-[#52525b]/30',
  shared: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  sent: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  signed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  countersigned: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  void: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsTable({ rows }: { rows: DocRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleShare(id: string) {
    if (!confirm('Share this document with the organization’s primary contact?')) return;
    setBusyId(id);
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/documents/${id}/share`, { method: 'POST' });
      setBusyId(null);
      if (!res.ok) {
        const msg = await res
          .json()
          .then((j: { error?: string }) => j?.error ?? 'Share failed')
          .catch(() => 'Share failed');
        setError(msg);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this document? It will be hidden from the client immediately.')) return;
    setBusyId(id);
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      setBusyId(null);
      if (!res.ok) {
        const msg = await res
          .json()
          .then((j: { error?: string }) => j?.error ?? 'Delete failed')
          .catch(() => 'Delete failed');
        setError(msg);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-10 text-center text-sm text-[#a1a1aa]">
        No documents yet. Upload one to share with a client.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b] border-b border-[#1f1f23]">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Organization</div>
          <div className="col-span-2">Engagement</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Size</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-[#1f1f23]">
          {rows.map((r) => {
            const canShare = r.status === 'draft';
            const isBusy = pending && busyId === r.id;
            return (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[#131316] transition-colors"
              >
                <div className="col-span-3 min-w-0">
                  <div className="text-sm font-medium text-[#fafafa] truncate" title={r.title}>
                    {r.title}
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate">
                    {r.uploaded_by_name ? `By ${r.uploaded_by_name}` : '—'}
                  </div>
                </div>
                <div className="col-span-2 text-xs text-[#a1a1aa] truncate">
                  {r.organization_name ?? '—'}
                </div>
                <div className="col-span-2 text-xs text-[#a1a1aa] truncate">
                  {r.engagement_title ?? '—'}
                </div>
                <div className="col-span-1">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${STATUS_TONE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="col-span-1 text-xs text-[#a1a1aa] tabular-nums text-right">
                  {formatSize(r.size_bytes)}
                </div>
                <div className="col-span-2 text-xs text-[#71717a]">
                  {formatRelative(r.created_at)}
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <a
                    href={`/api/admin/documents/${r.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View"
                    className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#06b6d4]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`/api/admin/documents/${r.id}/download`}
                    download
                    title="Download"
                    className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#06b6d4]"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {canShare && (
                    <button
                      type="button"
                      onClick={() => handleShare(r.id)}
                      disabled={isBusy}
                      title="Share with client"
                      className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#06b6d4] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={isBusy}
                    title="Delete"
                    className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#18181b] hover:text-rose-400 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
