'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export type ProfitabilityRow = {
  id: string;
  title: string;
  org_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  pipeline_stage: string;
  contract_value: number;
  hours_logged: number;
  revenue_collected: number;
  effective_hourly_rate: number | null;
  margin_estimate: number;
};

type SortKey = 'margin' | 'rate' | 'hours';
type SortDir = 'asc' | 'desc';

const STAGES = ['discovery', 'proposal', 'contract', 'active', 'review', 'complete', 'archived'];

export function ProfitabilityTable({
  rows,
  owners,
  blendedRate,
}: {
  rows: ProfitabilityRow[];
  owners: { id: string; name: string }[];
  blendedRate: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('margin');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStage, setFilterStage] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStage && r.pipeline_stage !== filterStage) return false;
      if (filterOwner && r.owner_id !== filterOwner) return false;
      return true;
    });
  }, [rows, filterStage, filterOwner]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === 'margin') {
        av = a.margin_estimate;
        bv = b.margin_estimate;
      } else if (sortKey === 'rate') {
        av = a.effective_hourly_rate ?? -Infinity;
        bv = b.effective_hourly_rate ?? -Infinity;
      } else {
        av = a.hours_logged;
        bv = b.hours_logged;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(k);
      setSortDir('desc');
    }
  }

  function exportCsv() {
    const header = [
      'title',
      'organization',
      'owner',
      'stage',
      'contract_value',
      'hours_logged',
      'revenue_collected',
      'effective_hourly_rate',
      'margin_estimate',
    ];
    const lines = [header.join(',')];
    for (const r of sorted) {
      lines.push(
        [
          csvEscape(r.title),
          csvEscape(r.org_name ?? ''),
          csvEscape(r.owner_name ?? ''),
          r.pipeline_stage,
          r.contract_value.toFixed(2),
          r.hours_logged.toFixed(2),
          r.revenue_collected.toFixed(2),
          r.effective_hourly_rate == null ? '' : r.effective_hourly_rate.toFixed(2),
          r.margin_estimate.toFixed(2),
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profitability-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">Stage</span>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">Owner</span>
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2.5 py-1.5 text-xs text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
          >
            <option value="">All owners</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            Blended rate ${blendedRate}/hr
          </span>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-[#1f1f23] text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            <tr>
              <th className="text-left px-3 py-2.5">Title</th>
              <th className="text-left px-3 py-2.5">Owner</th>
              <th className="text-left px-3 py-2.5">Stage</th>
              <th className="text-right px-3 py-2.5">Contract</th>
              <SortHeader label="Hours" active={sortKey === 'hours'} dir={sortDir} onClick={() => toggleSort('hours')} />
              <th className="text-right px-3 py-2.5">Collected</th>
              <SortHeader label="$/hr" active={sortKey === 'rate'} dir={sortDir} onClick={() => toggleSort('rate')} />
              <SortHeader label="Margin" active={sortKey === 'margin'} dir={sortDir} onClick={() => toggleSort('margin')} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#71717a]">
                  No engagements match the filters.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-[#1f1f23] last:border-0">
                <td className="px-3 py-2.5">
                  <div className="text-[#fafafa] truncate max-w-[280px]">{r.title}</div>
                  <div className="text-[10px] text-[#71717a] truncate max-w-[280px]">
                    {r.org_name ?? '—'}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[#a1a1aa]">{r.owner_name ?? 'Unassigned'}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded border border-[#27272a] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#71717a]">
                    {r.pipeline_stage}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#fafafa]">
                  {r.contract_value ? formatCurrency(r.contract_value) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#a1a1aa]">
                  {r.hours_logged.toFixed(1)}h
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#a1a1aa]">
                  {r.revenue_collected ? formatCurrency(r.revenue_collected) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#fafafa]">
                  {r.effective_hourly_rate == null ? '—' : `$${r.effective_hourly_rate.toFixed(0)}`}
                </td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                    r.margin_estimate >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {r.margin_estimate >= 0 ? '+' : ''}
                  {formatCurrency(r.margin_estimate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="text-right px-3 py-2.5">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-[#fafafa] transition-colors ${
          active ? 'text-[#06b6d4]' : ''
        }`}
      >
        {label}
        {active && <span className="text-[8px]">{dir === 'desc' ? '▼' : '▲'}</span>}
      </button>
    </th>
  );
}

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
