'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface InvoiceModalOrg {
  id: string;
  name: string;
}

export interface InvoiceModalEngagement {
  id: string;
  title: string;
  organization_id: string | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${year}-${seq}`;
}

export function NewInvoiceModal({
  organizations,
  engagements,
}: {
  organizations: InvoiceModalOrg[];
  engagements: InvoiceModalEngagement[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [organizationId, setOrganizationId] = useState('');
  const [engagementId, setEngagementId] = useState('');
  const [number, setNumber] = useState(defaultInvoiceNumber());
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(30));
  const [taxPct, setTaxPct] = useState(0);
  const [notes, setNotes] = useState('');
  const [sendNow, setSendNow] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);

  const filteredEngagements = useMemo(
    () => engagements.filter((e) => !organizationId || e.organization_id === organizationId),
    [engagements, organizationId],
  );

  useEffect(() => {
    if (engagementId && !filteredEngagements.some((e) => e.id === engagementId)) {
      setEngagementId('');
    }
  }, [engagementId, filteredEngagements]);

  const subtotal = items.reduce(
    (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0,
  );
  const tax = subtotal * (Number(taxPct) / 100);
  const total = subtotal + tax;

  function reset() {
    setOrganizationId('');
    setEngagementId('');
    setNumber(defaultInvoiceNumber());
    setIssueDate(todayISO());
    setDueDate(plusDaysISO(30));
    setTaxPct(0);
    setNotes('');
    setSendNow(false);
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setError(null);
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((xs) => xs.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
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
          + New invoice
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#27272a] bg-[#0f0f12] text-[#fafafa] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#fafafa]">New invoice</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            Saved as draft. Tick &ldquo;Send to client&rdquo; to email it on create.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!organizationId) {
              setError('Pick an organization.');
              return;
            }
            const cleanItems = items.filter((it) => it.description.trim());
            if (cleanItems.length === 0) {
              setError('Add at least one line item with a description.');
              return;
            }
            start(async () => {
              const res = await fetch('/api/admin/invoices', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  organization_id: organizationId,
                  engagement_id: engagementId || null,
                  number: number.trim() || null,
                  issue_date: issueDate || null,
                  due_date: dueDate || null,
                  tax_pct: Number(taxPct) || 0,
                  notes: notes.trim() || null,
                  line_items: cleanItems,
                  send_now: sendNow,
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Organization
              </span>
              <select
                required
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
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
                Engagement (optional)
              </span>
              <select
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={!organizationId}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] disabled:opacity-50"
              >
                <option value="">— None —</option>
                {filteredEngagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Invoice #
              </span>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
                placeholder="INV-2026-0001"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Issue date
              </span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Due date
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa]"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#27272a] bg-[#09090b] overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-[#52525b] border-b border-[#1f1f23]">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-[#1f1f23]">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    placeholder="Service description"
                    className="col-span-6 rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa]"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    className="col-span-2 rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] text-right tabular-nums"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                    className="col-span-2 rounded-lg border border-[#27272a] bg-[#131316] px-2.5 py-1.5 text-sm text-[#fafafa] text-right tabular-nums"
                  />
                  <div className="col-span-1 text-sm text-[#fafafa] text-right tabular-nums">
                    {(it.quantity * it.unit_price).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                    className="col-span-1 text-[#71717a] hover:text-rose-400"
                    aria-label="Remove line item"
                  >
                    <Trash2 className="w-4 h-4 ml-auto" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[#1f1f23]">
              <button
                type="button"
                onClick={() =>
                  setItems((xs) => [...xs, { description: '', quantity: 1, unit_price: 0 }])
                }
                className="inline-flex items-center gap-1.5 text-xs text-[#06b6d4] hover:text-[#22d3ee]"
              >
                <Plus className="w-3.5 h-3.5" /> Add line item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                Tax %
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxPct}
                onChange={(e) => setTaxPct(Number(e.target.value))}
                className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-2.5 py-1.5 text-sm text-[#fafafa] tabular-nums"
              />
            </label>
            <div className="md:col-span-2 flex items-end justify-end rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-xs text-[#71717a] gap-6">
              <div>
                Subtotal:{' '}
                <span className="text-[#fafafa] tabular-nums">{subtotal.toFixed(2)}</span>
              </div>
              <div>
                Tax: <span className="text-[#fafafa] tabular-nums">{tax.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
                  Total
                </div>
                <div className="text-lg font-semibold text-[#fafafa] tabular-nums">
                  {total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
              Notes (visible to client)
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thanks for the work this month…"
              className="w-full rounded-lg border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#52525b]"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <input
              type="checkbox"
              checked={sendNow}
              onChange={(e) => setSendNow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#27272a] bg-[#09090b] accent-[#06b6d4]"
            />
            Send to client immediately (otherwise saved as draft)
          </label>

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
              {pending ? 'Creating…' : sendNow ? 'Create + send' : 'Create draft'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
