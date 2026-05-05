'use client';

import { useState } from 'react';

export type EngBreakdown = { engagement_id: string; title: string; hours: number };

export type WorkloadRow = {
  user_id: string;
  name: string;
  email: string;
  active_engagements: number;
  open_tasks: number;
  hours_this_week: number;
  hours_last_week: number;
  capacity: number;
  utilization_pct: number;
  breakdown: EngBreakdown[];
};

export function WorkloadTable({ rows }: { rows: WorkloadRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  function exportCsv() {
    const header = [
      'name',
      'email',
      'active_engagements',
      'open_tasks',
      'hours_this_week',
      'hours_last_week',
      'capacity_hours',
      'utilization_pct',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.email),
          r.active_engagements,
          r.open_tasks,
          r.hours_this_week.toFixed(2),
          r.hours_last_week.toFixed(2),
          r.capacity.toFixed(2),
          r.utilization_pct.toFixed(1),
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const open = rows.find((r) => r.user_id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          onClick={exportCsv}
          className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-[#1f1f23] text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            <tr>
              <th className="text-left px-3 py-2.5">Member</th>
              <th className="text-right px-3 py-2.5">Active</th>
              <th className="text-right px-3 py-2.5">Open tasks</th>
              <th className="text-right px-3 py-2.5">This week</th>
              <th className="text-right px-3 py-2.5">Last week</th>
              <th className="text-right px-3 py-2.5">Capacity</th>
              <th className="text-left px-3 py-2.5 w-[200px]">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#71717a]">
                  No team members.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const pct = r.utilization_pct;
              const color =
                pct > 100 ? 'bg-rose-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
              const widthPct = Math.min(pct, 150);
              return (
                <tr
                  key={r.user_id}
                  className="border-b border-[#1f1f23] last:border-0 hover:bg-[#131316] cursor-pointer transition-colors"
                  onClick={() => setOpenId(r.user_id)}
                >
                  <td className="px-3 py-2.5">
                    <div className="text-[#fafafa]">{r.name}</div>
                    <div className="text-[10px] text-[#71717a]">{r.email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#a1a1aa]">
                    {r.active_engagements}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#a1a1aa]">
                    {r.open_tasks}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#fafafa]">
                    {r.hours_this_week.toFixed(1)}h
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#71717a]">
                    {r.hours_last_week.toFixed(1)}h
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#a1a1aa]">
                    {r.capacity.toFixed(0)}h
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[#1f1f23] overflow-hidden">
                        <div
                          className={`h-full ${color}`}
                          style={{ width: `${(widthPct / 150) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-[#a1a1aa] w-12 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#27272a] bg-[#0f0f12] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#fafafa]">{open.name}</h2>
                <p className="text-xs text-[#71717a]">
                  {open.hours_this_week.toFixed(1)}h logged this week across{' '}
                  {open.breakdown.length} engagements
                </p>
              </div>
              <button
                onClick={() => setOpenId(null)}
                className="text-[#71717a] hover:text-[#fafafa]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {open.breakdown.length === 0 && (
                <p className="text-xs text-[#71717a]">No hours logged this week.</p>
              )}
              {open.breakdown.map((b) => (
                <div
                  key={b.engagement_id}
                  className="flex items-center justify-between rounded-lg border border-[#1f1f23] px-3 py-2"
                >
                  <span className="text-xs text-[#fafafa] truncate flex-1">{b.title}</span>
                  <span className="text-xs font-mono tabular-nums text-[#a1a1aa]">
                    {b.hours.toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscape(s: string) {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
