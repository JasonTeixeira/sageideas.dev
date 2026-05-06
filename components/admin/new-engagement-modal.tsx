'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STAGES = [
  'discovery',
  'proposal',
  'contract',
  'active',
  'review',
  'complete',
  'archived',
] as const;

export interface OrgOption {
  id: string;
  name: string;
}

export interface OwnerOption {
  id: string;
  name: string;
}

export function NewEngagementModal({
  organizations,
  owners,
}: {
  organizations: OrgOption[];
  owners: OwnerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<(typeof STAGES)[number]>('discovery');
  const [ownerId, setOwnerId] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [budgetHours, setBudgetHours] = useState('');
  const [startDate, setStartDate] = useState('');

  function reset() {
    setOrganizationId('');
    setTitle('');
    setStage('discovery');
    setOwnerId('');
    setContractValue('');
    setBudgetHours('');
    setStartDate('');
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-lg bg-[#06b6d4] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2]"
        >
          + New engagement
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#27272a] bg-[#0f0f12] text-[#fafafa] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[#fafafa]">New engagement</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Create an engagement and place it on the kanban. You can refine details after.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await fetch('/api/admin/engagements', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  organization_id: organizationId,
                  title: title.trim(),
                  pipeline_stage: stage,
                  owner_id: ownerId || null,
                  contract_value: contractValue ? Number(contractValue) : null,
                  budget_hours: budgetHours ? Number(budgetHours) : null,
                  start_date: startDate || null,
                }),
              });
              if (!res.ok) {
                const msg = await res
                  .json()
                  .then((j: { error?: string }) => j?.error ?? 'Create failed')
                  .catch(() => 'Create failed');
                setError(msg);
                return;
              }
              setOpen(false);
              reset();
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Organization
            </span>
            <select
              required
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
            >
              <option value="">— Choose organization —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Title
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] focus:border-[#06b6d4]/60 focus:outline-none"
              placeholder="Marketing site redesign"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Stage
              </span>
              <select
                required
                value={stage}
                onChange={(e) => setStage(e.target.value as (typeof STAGES)[number])}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Owner (optional)
              </span>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              >
                <option value="">— Unassigned —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Contract value (USD)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] tabular-nums"
                placeholder="0.00"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Budget hours
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] tabular-nums"
                placeholder="0"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              />
            </label>
          </div>

          {error && <div className="text-xs text-rose-400">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#fafafa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#06b6d4] px-4 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#0891B2] disabled:opacity-50"
            >
              {pending ? 'Creating…' : 'Create engagement'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
