'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface TimeEntryRow {
  id: string;
  user_id: string;
  user_name: string;
  engagement_id: string | null;
  engagement_title: string | null;
  org_name: string | null;
  task_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean;
}

interface Option {
  id: string;
  label: string;
}

interface Filters {
  user_id: string;
  engagement_id: string;
  billable: string;
  from: string;
  to: string;
}

export function TimeEntriesTable({
  rows,
  users,
  engagements,
  filters,
}: {
  rows: TimeEntryRow[];
  users: Option[];
  engagements: Option[];
  filters: Filters;
}) {
  const router = useRouter();
  const [local, setLocal] = useState<Filters>(filters);
  const [busy, setBusy] = useState<string | null>(null);

  const csvHref = useMemo(() => {
    const header = [
      'started_at',
      'ended_at',
      'duration_minutes',
      'duration_hours',
      'user',
      'engagement',
      'org',
      'billable',
      'description',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      const cells = [
        r.started_at,
        r.ended_at ?? '',
        String(r.duration_minutes ?? ''),
        r.duration_minutes != null ? (r.duration_minutes / 60).toFixed(2) : '',
        r.user_name,
        r.engagement_title ?? '',
        r.org_name ?? '',
        r.billable ? 'true' : 'false',
        (r.description ?? '').replace(/"/g, '""'),
      ].map((c) => {
        const s = String(c);
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(cells.join(','));
    }
    const blob = lines.join('\n');
    return `data:text/csv;charset=utf-8,${encodeURIComponent(blob)}`;
  }, [rows]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (local.user_id) params.set('user_id', local.user_id);
    if (local.engagement_id) params.set('engagement_id', local.engagement_id);
    if (local.billable) params.set('billable', local.billable);
    if (local.from) params.set('from', local.from);
    if (local.to) params.set('to', local.to);
    router.push(`/admin/time-tracking${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function clearFilters() {
    setLocal({ user_id: '', engagement_id: '', billable: '', from: '', to: '' });
    router.push('/admin/time-tracking');
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this time entry?')) return;
    setBusy(id);
    const res = await fetch(`/api/admin/time-entries/${id}`, { method: 'DELETE' });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert('Delete failed');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select
            label="User"
            value={local.user_id}
            onChange={(v) => setLocal({ ...local, user_id: v })}
            options={[{ id: '', label: 'All users' }, ...users]}
          />
          <Select
            label="Engagement"
            value={local.engagement_id}
            onChange={(v) => setLocal({ ...local, engagement_id: v })}
            options={[{ id: '', label: 'All engagements' }, ...engagements]}
          />
          <Select
            label="Billable"
            value={local.billable}
            onChange={(v) => setLocal({ ...local, billable: v })}
            options={[
              { id: '', label: 'All' },
              { id: 'true', label: 'Billable only' },
              { id: 'false', label: 'Non-billable only' },
            ]}
          />
          <DateInput
            label="From"
            value={local.from}
            onChange={(v) => setLocal({ ...local, from: v })}
          />
          <DateInput
            label="To"
            value={local.to}
            onChange={(v) => setLocal({ ...local, to: v })}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={applyFilters}
            className="rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-medium text-[#0a0a0c] hover:bg-[#22d3ee] transition-colors"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
          >
            Clear
          </button>
          <a
            href={csvHref}
            download={`time-entries-${new Date().toISOString().slice(0, 10)}.csv`}
            className="ml-auto rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#27272a] text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              <th className="text-left px-3 py-2.5">User</th>
              <th className="text-left px-3 py-2.5">Engagement</th>
              <th className="text-left px-3 py-2.5">Started</th>
              <th className="text-right px-3 py-2.5">Duration</th>
              <th className="text-center px-3 py-2.5">Billable</th>
              <th className="text-left px-3 py-2.5">Description</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-xs font-mono uppercase tracking-widest text-[#52525b]"
                >
                  No entries
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#1f1f23] last:border-0">
                <td className="px-3 py-2.5 text-[#fafafa] truncate">{r.user_name}</td>
                <td className="px-3 py-2.5 text-[#a1a1aa] truncate max-w-[260px]">
                  {r.engagement_title ?? '—'}
                  {r.org_name && (
                    <span className="block text-[10px] text-[#52525b]">{r.org_name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[#a1a1aa] tabular-nums">
                  {fmtDateTime(r.started_at)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#fafafa]">
                  {r.duration_minutes != null
                    ? `${(r.duration_minutes / 60).toFixed(2)}h`
                    : r.ended_at == null
                      ? <span className="text-emerald-400">running</span>
                      : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.billable ? (
                    <span className="inline-flex rounded-md border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-emerald-300">
                      yes
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md border border-[#3f3f46] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#71717a]">
                      no
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[#a1a1aa] truncate max-w-[300px]">
                  {r.description ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => deleteEntry(r.id)}
                    disabled={busy === r.id}
                    className="text-[10px] font-mono uppercase tracking-widest text-[#52525b] hover:text-rose-400 transition-colors disabled:opacity-50"
                  >
                    {busy === r.id ? '...' : 'del'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
      />
    </label>
  );
}

function fmtDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
