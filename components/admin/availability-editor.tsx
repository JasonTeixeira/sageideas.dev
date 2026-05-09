'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AvailabilityRule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
  slot_minutes: number;
  is_active: boolean;
};

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const SLOT_OPTIONS = [15, 30, 45, 60] as const;

function trimSeconds(t: string): string {
  // Postgres returns '09:00:00'; <input type=time> wants 'HH:MM'.
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function AvailabilityEditor({ rules }: { rules: AvailabilityRule[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Local edit buffer keyed by rule id.
  const [draft, setDraft] = useState<Record<string, AvailabilityRule>>(() =>
    Object.fromEntries(
      rules.map((r) => [
        r.id,
        { ...r, start_time: trimSeconds(r.start_time), end_time: trimSeconds(r.end_time) },
      ]),
    ),
  );

  function update(id: string, patch: Partial<AvailabilityRule>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } as AvailabilityRule }));
  }

  async function save(id: string) {
    setError(null);
    setSavedId(null);
    setPendingId(id);
    const r = draft[id];
    if (!r) {
      setPendingId(null);
      return;
    }
    if (r.start_time >= r.end_time) {
      setError('Start time must be before end time.');
      setPendingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start_time: r.start_time,
          end_time: r.end_time,
          slot_minutes: r.slot_minutes,
          is_active: r.is_active,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Update failed (${res.status})`);
      }
      setSavedId(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setPendingId(null);
    }
  }

  if (rules.length === 0) {
    return (
      <div
        className="rounded-md border border-[#27272a] bg-[#0a0a0d] p-6 text-sm text-[#a1a1aa]"
        data-testid="availability-empty"
      >
        No availability rules are configured. Insert rows in studio_availability
        to enable bookings.
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="availability-list">
      {error ? (
        <div
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          data-testid="availability-error"
        >
          {error}
        </div>
      ) : null}

      {rules.map((r) => {
        const d = draft[r.id] ?? r;
        const isPending = pendingId === r.id;
        const justSaved = savedId === r.id;
        return (
          <div
            key={r.id}
            data-testid="availability-row"
            data-rule-id={r.id}
            className="grid grid-cols-12 items-center gap-3 rounded-md border border-[#27272a] bg-[#0a0a0d] px-3 py-3"
          >
            <div className="col-span-2 text-sm font-medium text-[#fafafa]">
              {WEEKDAYS[d.weekday]}
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#52525b] mb-1">
                Start
              </label>
              <input
                type="time"
                value={d.start_time}
                onChange={(e) => update(r.id, { start_time: e.target.value })}
                data-testid="availability-start"
                className="w-full rounded-md border border-[#27272a] bg-[#0f0f12] px-2 py-1.5 text-sm text-[#fafafa]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#52525b] mb-1">
                End
              </label>
              <input
                type="time"
                value={d.end_time}
                onChange={(e) => update(r.id, { end_time: e.target.value })}
                data-testid="availability-end"
                className="w-full rounded-md border border-[#27272a] bg-[#0f0f12] px-2 py-1.5 text-sm text-[#fafafa]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#52525b] mb-1">
                Slot
              </label>
              <select
                value={d.slot_minutes}
                onChange={(e) =>
                  update(r.id, { slot_minutes: Number(e.target.value) })
                }
                data-testid="availability-slot-minutes"
                className="w-full rounded-md border border-[#27272a] bg-[#0f0f12] px-2 py-1.5 text-sm text-[#fafafa]"
              >
                {SLOT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}m
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-[#a1a1aa]">
                <input
                  type="checkbox"
                  checked={d.is_active}
                  onChange={(e) => update(r.id, { is_active: e.target.checked })}
                  data-testid="availability-active"
                  className="h-3.5 w-3.5"
                />
                Active
              </label>
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => void save(r.id)}
                disabled={isPending}
                data-testid="availability-save"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-[#3f3f46] bg-[#18181b] px-3 py-1.5 text-xs text-[#fafafa] hover:bg-[#27272a] disabled:opacity-50',
                  justSaved && 'border-[#06b6d4]/50 text-[#06b6d4]',
                )}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {justSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
