'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = ['lead', 'qualified', 'proposal', 'active', 'past', 'cold'] as const;

export function OrgEditForm({
  orgId,
  defaults,
  owners,
}: {
  orgId: string;
  defaults: {
    pipeline_stage: string | null;
    annual_value: number | null;
    notes: string | null;
    owner_id: string | null;
    show_time_tracking?: boolean;
  };
  owners: { id: string; label: string }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        const body = {
          pipeline_stage: String(fd.get('pipeline_stage') ?? ''),
          annual_value: fd.get('annual_value') ? Number(fd.get('annual_value')) : null,
          notes: String(fd.get('notes') ?? ''),
          owner_id: (fd.get('owner_id') as string) || null,
          show_time_tracking: fd.get('show_time_tracking') === 'on',
        };
        start(async () => {
          const res = await fetch(`/api/admin/organizations/${orgId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            setError(await res.text().catch(() => 'Update failed'));
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            Stage
          </span>
          <select
            name="pipeline_stage"
            defaultValue={defaults.pipeline_stage ?? 'lead'}
            className="w-full rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-sm text-[#fafafa]"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
            Annual value (USD)
          </span>
          <input
            name="annual_value"
            type="number"
            step="100"
            defaultValue={defaults.annual_value ?? ''}
            className="w-full rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-sm text-[#fafafa] tabular-nums"
          />
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
          Owner
        </span>
        <select
          name="owner_id"
          defaultValue={defaults.owner_id ?? ''}
          className="w-full rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-sm text-[#fafafa]"
        >
          <option value="">— Unassigned —</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-[#fafafa]">
        <input
          type="checkbox"
          name="show_time_tracking"
          defaultChecked={!!defaults.show_time_tracking}
          data-testid="admin-org-time-tracking-toggle"
          className="h-4 w-4 rounded border-[#3f3f46] bg-[#0f0f12]"
        />
        <span>Show time tracking to client</span>
      </label>

      <label className="space-y-1.5 block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
          Notes
        </span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaults.notes ?? ''}
          className="w-full rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b]"
          placeholder="Internal notes — not visible to client."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#06b6d4] px-4 py-2 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {ok && <span className="text-xs text-emerald-400">Saved.</span>}
        {error && <span className="text-xs text-rose-400 truncate">{error}</span>}
      </div>
    </form>
  );
}
