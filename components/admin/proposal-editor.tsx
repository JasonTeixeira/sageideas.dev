'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/portal/ui/button';
import { Input, Textarea } from '@/components/portal/ui/input';
import { Card, CardContent } from '@/components/portal/ui/card';
import { cn } from '@/lib/utils';

export type OrgOption = { id: string; name: string };
export type TemplateOption = { id: string; name: string; service_type: string | null };

export type LineItem = {
  name: string;
  qty: number;
  unit_price: number;
};

export type ProposalDraft = {
  id?: string;
  organization_id: string | null;
  title: string;
  intro: string;
  currency: string;
  line_items: LineItem[];
  discount: number;
  expires_at: string | null;
  notes: string | null;
  template_id: string | null;
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'];

function emptyLine(): LineItem {
  return { name: '', qty: 1, unit_price: 0 };
}

function computeTotals(items: LineItem[], discount: number) {
  const subtotal = items.reduce(
    (sum, it) => sum + Math.max(0, Number(it.qty) || 0) * Math.max(0, Number(it.unit_price) || 0),
    0,
  );
  const total = Math.max(0, subtotal - Math.max(0, discount));
  return { subtotal, total };
}

export function ProposalEditor({
  mode,
  initial,
  orgs,
  templates,
}: {
  mode: 'create' | 'edit';
  initial?: ProposalDraft;
  orgs: OrgOption[];
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProposalDraft>(
    initial ?? {
      organization_id: orgs[0]?.id ?? null,
      title: '',
      intro: '',
      currency: 'USD',
      line_items: [emptyLine()],
      discount: 0,
      expires_at: null,
      notes: null,
      template_id: null,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () => computeTotals(draft.line_items, draft.discount),
    [draft.line_items, draft.discount],
  );

  function update<K extends keyof ProposalDraft>(key: K, value: ProposalDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(i: number, patch: Partial<LineItem>) {
    setDraft((prev) => {
      const next = [...prev.line_items];
      next[i] = { ...next[i], ...patch };
      return { ...prev, line_items: next };
    });
  }

  function addLine() {
    setDraft((prev) => ({ ...prev, line_items: [...prev.line_items, emptyLine()] }));
  }

  function removeLine(i: number) {
    setDraft((prev) => ({
      ...prev,
      line_items: prev.line_items.length > 1
        ? prev.line_items.filter((_, idx) => idx !== i)
        : prev.line_items,
    }));
  }

  async function save(action: 'save' | 'send') {
    setError(null);
    if (!draft.organization_id) {
      setError('Pick an organization.');
      return;
    }
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (draft.line_items.length === 0 || totals.subtotal <= 0) {
      setError('Add at least one line item with a positive total.');
      return;
    }
    setBusy(true);
    try {
      const url =
        mode === 'edit' && draft.id
          ? `/api/admin/proposals/${draft.id}`
          : `/api/admin/proposals`;
      const method = mode === 'edit' && draft.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organization_id: draft.organization_id,
          title: draft.title.trim(),
          intro: draft.intro,
          currency: draft.currency,
          line_items: draft.line_items.map((it) => ({
            name: it.name,
            qty: Number(it.qty) || 0,
            unit_price: Number(it.unit_price) || 0,
          })),
          discount: Number(draft.discount) || 0,
          expires_at: draft.expires_at,
          notes: draft.notes,
          template_id: draft.template_id,
          send: action === 'send',
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      const proposalId = json.id ?? draft.id;
      router.replace(`/admin/proposals/${proposalId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Organization">
            <select
              value={draft.organization_id ?? ''}
              onChange={(e) => update('organization_id', e.target.value || null)}
              className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
              required
            >
              {orgs.length === 0 ? (
                <option value="">No orgs available</option>
              ) : (
                orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label="Currency">
            <select
              value={draft.currency}
              onChange={(e) => update('currency', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Title">
          <Input
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={250}
            placeholder="Web Design — 5-Page Site"
            data-testid="admin-proposal-title"
            required
          />
        </Field>

        <Field label="Introduction (markdown ok)">
          <Textarea
            value={draft.intro ?? ''}
            onChange={(e) => update('intro', e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Hello — here's the proposal we discussed."
          />
        </Field>

        {templates.length > 0 ? (
          <Field label="Seed from template (optional)">
            <select
              value={draft.template_id ?? ''}
              onChange={(e) => update('template_id', e.target.value || null)}
              className="flex h-10 w-full rounded-lg border border-[#3f3f46] bg-[#0f0f12] px-3 py-2 text-sm text-[#fafafa] focus:outline-none focus:border-[#06b6d4]"
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-2">
            Line items
          </h3>
          <div className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]">
            <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
              <div className="col-span-7">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-1" />
            </div>
            {draft.line_items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-2 items-center"
              >
                <Input
                  className="md:col-span-7"
                  value={item.name}
                  onChange={(e) => updateLine(i, { name: e.target.value })}
                  maxLength={250}
                  placeholder="Description"
                />
                <Input
                  className="md:col-span-2 text-right"
                  type="number"
                  min={0}
                  step={1}
                  value={item.qty}
                  onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                />
                <Input
                  className="md:col-span-2 text-right"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="md:col-span-1 inline-flex items-center justify-center text-[#71717a] hover:text-[#f43f5e] disabled:opacity-30"
                  disabled={draft.line_items.length === 1}
                  aria-label="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                data-testid="admin-proposal-line-item-add"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add line
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Discount">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={draft.discount}
              onChange={(e) => update('discount', Number(e.target.value))}
            />
          </Field>
          <Field label="Expires on">
            <Input
              type="date"
              value={draft.expires_at?.slice(0, 10) ?? ''}
              onChange={(e) =>
                update(
                  'expires_at',
                  e.target.value ? new Date(`${e.target.value}T23:59:59Z`).toISOString() : null,
                )
              }
            />
          </Field>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#0a0a0d] px-4 py-3 text-sm text-[#a1a1aa]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums text-[#fafafa]">
              {totals.subtotal.toFixed(2)} {draft.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span className="tabular-nums text-[#fafafa]">
              {(Number(draft.discount) || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold mt-1 pt-1 border-t border-[#1f1f23]">
            <span className="text-[#fafafa]">Total</span>
            <span className="tabular-nums text-[#fafafa]" data-testid="admin-proposal-total">
              {totals.total.toFixed(2)} {draft.currency}
            </span>
          </div>
        </div>

        <Field label="Internal notes (optional)">
          <Textarea
            value={draft.notes ?? ''}
            onChange={(e) => update('notes', e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Not shown to client."
          />
        </Field>

        <div className="flex items-center justify-between gap-3 pt-2">
          <span
            role="status"
            aria-live="polite"
            className={cn('text-xs', error ? 'text-[#f43f5e]' : 'text-transparent')}
          >
            {error ?? '·'}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => save('save')}
              disabled={busy}
              data-testid="admin-proposal-save"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save draft'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => save('send')}
              disabled={busy}
              data-testid="admin-proposal-send"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save & send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-[#71717a] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
