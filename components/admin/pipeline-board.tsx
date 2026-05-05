'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

export type Stage =
  | 'discovery'
  | 'proposal'
  | 'contract'
  | 'active'
  | 'review'
  | 'complete'
  | 'archived';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface BoardCard {
  id: string;
  title: string;
  org_name: string | null;
  owner_id: string | null;
  owner_name: string | null;
  contract_value: number | null;
  budget_hours: number | null;
  priority: Priority;
  tags: string[];
  created_at: string;
  pipeline_stage: Stage;
  kanban_position: number;
}

const STAGES: Stage[] = [
  'discovery',
  'proposal',
  'contract',
  'active',
  'review',
  'complete',
  'archived',
];

const STAGE_COLOR: Record<Stage, string> = {
  discovery: 'border-[#52525b]/40 text-[#a1a1aa]',
  proposal: 'border-amber-500/40 text-amber-300',
  contract: 'border-[#06b6d4]/40 text-[#06b6d4]',
  active: 'border-emerald-500/40 text-emerald-300',
  review: 'border-violet-500/40 text-violet-300',
  complete: 'border-teal-500/40 text-teal-300',
  archived: 'border-[#3f3f46]/40 text-[#71717a]',
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: 'bg-[#52525b]',
  normal: 'bg-[#06b6d4]',
  high: 'bg-amber-400',
  urgent: 'bg-rose-400',
};

const DENSITY_KEY = 'sage-pipeline-density';

type Density = 'compact' | 'comfortable';

export function PipelineBoard({
  initial,
  owners,
}: {
  initial: BoardCard[];
  owners: { id: string; name: string }[];
}) {
  const [cards, setCards] = useState<BoardCard[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<Stage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOwner, setFilterOwner] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [density, setDensity] = useState<Density>('comfortable');
  const [bulkStage, setBulkStage] = useState<Stage | ''>('');
  const router = useRouter();

  useEffect(() => {
    try {
      const v = localStorage.getItem(DENSITY_KEY);
      if (v === 'compact' || v === 'comfortable') setDensity(v);
    } catch {
      // ignore
    }
  }, []);

  function setDensityPersisted(d: Density) {
    setDensity(d);
    try {
      localStorage.setItem(DENSITY_KEY, d);
    } catch {
      // ignore
    }
  }

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const c of cards) for (const t of c.tags) s.add(t);
    return [...s].sort();
  }, [cards]);

  const visibleCards = useMemo(() => {
    return cards.filter((c) => {
      if (filterOwner && c.owner_id !== filterOwner) return false;
      if (filterPriority && c.priority !== filterPriority) return false;
      if (filterTags.size && !c.tags.some((t) => filterTags.has(t))) return false;
      if (filterFrom && new Date(c.created_at) < new Date(filterFrom)) return false;
      if (filterTo) {
        const end = new Date(filterTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(c.created_at) > end) return false;
      }
      return true;
    });
  }, [cards, filterOwner, filterPriority, filterTags, filterFrom, filterTo]);

  const grouped = useMemo(() => {
    const out = STAGES.reduce<Record<Stage, BoardCard[]>>((acc, s) => {
      acc[s] = visibleCards
        .filter((c) => c.pipeline_stage === s)
        .sort((a, b) => a.kanban_position - b.kanban_position);
      return acc;
    }, {} as Record<Stage, BoardCard[]>);
    return out;
  }, [visibleCards]);

  function clearFilters() {
    setFilterOwner('');
    setFilterPriority('');
    setFilterTags(new Set());
    setFilterFrom('');
    setFilterTo('');
  }

  function toggleTag(t: string) {
    setFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function moveCard(id: string, toStage: Stage) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (card.pipeline_stage === toStage) return;

    const targetCount = grouped[toStage].length;
    const newPos = targetCount;

    const prev = cards;
    setCards((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, pipeline_stage: toStage, kanban_position: newPos } : c,
      ),
    );

    const res = await fetch(`/api/admin/engagements/${id}/move`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: toStage, kanban_position: newPos }),
    });
    if (!res.ok) {
      setError(`Move failed: ${await res.text().catch(() => 'error')}`);
      setCards(prev);
      return;
    }
    setError(null);
    router.refresh();
  }

  async function bulkMove() {
    if (!bulkStage || selected.size === 0) return;
    const stage = bulkStage as Stage;
    const ids = [...selected];
    const prev = cards;
    setCards((cs) => {
      const counts = STAGES.reduce<Record<Stage, number>>((acc, s) => {
        acc[s] = cs.filter((c) => c.pipeline_stage === s).length;
        return acc;
      }, {} as Record<Stage, number>);
      let pos = counts[stage];
      const idSet = new Set(ids);
      return cs.map((c) =>
        idSet.has(c.id)
          ? { ...c, pipeline_stage: stage, kanban_position: pos++ }
          : c,
      );
    });

    let firstError: string | null = null;
    let basePos = grouped[stage].length;
    for (const id of ids) {
      const res = await fetch(`/api/admin/engagements/${id}/move`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: stage, kanban_position: basePos++ }),
      });
      if (!res.ok && !firstError) firstError = await res.text().catch(() => 'error');
    }
    if (firstError) {
      setError(`Bulk move failed: ${firstError}`);
      setCards(prev);
      return;
    }
    setError(null);
    setSelected(new Set());
    setBulkStage('');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <FilterSelect
            label="Owner"
            value={filterOwner}
            onChange={setFilterOwner}
            options={[
              { id: '', label: 'All owners' },
              ...owners.map((o) => ({ id: o.id, label: o.name })),
            ]}
          />
          <FilterSelect
            label="Priority"
            value={filterPriority}
            onChange={setFilterPriority}
            options={[
              { id: '', label: 'All priorities' },
              { id: 'low', label: 'Low' },
              { id: 'normal', label: 'Normal' },
              { id: 'high', label: 'High' },
              { id: 'urgent', label: 'Urgent' },
            ]}
          />
          <DateInput label="Created from" value={filterFrom} onChange={setFilterFrom} />
          <DateInput label="Created to" value={filterTo} onChange={setFilterTo} />
          <div className="flex items-end gap-2">
            <button
              onClick={clearFilters}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors"
            >
              Clear
            </button>
            <div className="ml-auto inline-flex rounded-lg border border-[#27272a] overflow-hidden">
              <button
                onClick={() => setDensityPersisted('compact')}
                className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                  density === 'compact'
                    ? 'bg-[#06b6d4]/10 text-[#06b6d4]'
                    : 'text-[#71717a] hover:text-[#fafafa]'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setDensityPersisted('comfortable')}
                className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest border-l border-[#27272a] transition-colors ${
                  density === 'comfortable'
                    ? 'bg-[#06b6d4]/10 text-[#06b6d4]'
                    : 'text-[#71717a] hover:text-[#fafafa]'
                }`}
              >
                Comfortable
              </button>
            </div>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a] mr-1">
              Tags:
            </span>
            {allTags.map((t) => {
              const on = filterTags.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                    on
                      ? 'bg-[#06b6d4]/15 border border-[#06b6d4]/40 text-[#06b6d4]'
                      : 'border border-[#27272a] text-[#71717a] hover:text-[#fafafa] hover:border-[#3f3f46]'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#06b6d4]/30 bg-[#06b6d4]/5 px-3 py-2">
            <span className="text-xs text-[#06b6d4]">
              {selected.size} selected
            </span>
            <select
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value as Stage | '')}
              className="rounded-lg border border-[#27272a] bg-[#0a0a0c] px-2 py-1 text-xs text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
            >
              <option value="">Move selected to…</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={bulkMove}
              disabled={!bulkStage}
              className="rounded-lg bg-[#06b6d4] px-3 py-1 text-xs font-medium text-[#0a0a0c] hover:bg-[#22d3ee] transition-colors disabled:opacity-40"
            >
              Move
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[10px] font-mono uppercase tracking-widest text-[#71717a] hover:text-[#fafafa]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {STAGES.map((stage) => {
          const list = grouped[stage];
          const sumValue = list.reduce((s, c) => s + (c.contract_value ?? 0), 0);
          const sumHours = list.reduce((s, c) => s + (c.budget_hours ?? 0), 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverStage(stage);
              }}
              onDragLeave={() => setHoverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setHoverStage(null);
                if (dragId) moveCard(dragId, stage);
                setDragId(null);
              }}
              className={`flex-1 min-w-[260px] rounded-xl border bg-[#0f0f12] ${
                hoverStage === stage
                  ? 'border-[#06b6d4]/60 bg-[#06b6d4]/5'
                  : 'border-[#27272a]'
              }`}
            >
              <div
                className={`px-3 py-2.5 border-b border-[#1f1f23] ${STAGE_COLOR[stage]}`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                  <span>{stage}</span>
                  <span className="text-[#52525b]">{list.length}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono tabular-nums text-[#71717a]">
                  <span>{sumValue ? formatCurrency(sumValue) : '—'}</span>
                  <span>{sumHours ? `${sumHours.toFixed(0)}h` : '—'}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {list.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#27272a] p-4 text-center text-[10px] font-mono uppercase tracking-widest text-[#52525b]">
                    Drop here
                  </div>
                )}
                {list.map((c) => {
                  const isSel = selected.has(c.id);
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          toggleSelect(c.id);
                        }
                      }}
                      className={`rounded-lg border bg-[#131316] cursor-grab active:cursor-grabbing transition-colors ${
                        density === 'compact' ? 'p-2' : 'p-3'
                      } ${
                        isSel
                          ? 'border-[#06b6d4] ring-1 ring-[#06b6d4]/40'
                          : 'border-[#27272a]'
                      } ${dragId === c.id ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[c.priority]}`}
                          title={c.priority}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#fafafa] truncate">
                            {c.title}
                          </div>
                          {density === 'comfortable' && (
                            <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                              {c.org_name ?? '—'}
                            </div>
                          )}
                        </div>
                      </div>
                      {density === 'comfortable' && c.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="rounded border border-[#27272a] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#71717a]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-between text-[10px] font-mono text-[#52525b] ${density === 'compact' ? 'mt-1.5' : 'mt-2'}`}
                      >
                        <span className="truncate">{c.owner_name ?? 'Unassigned'}</span>
                        <span className="tabular-nums text-[#a1a1aa]">
                          {c.contract_value ? formatCurrency(c.contract_value) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
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
