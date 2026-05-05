'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Action = 'remind' | 'mark-paid' | 'void';

const LABELS: Record<Action, string> = {
  remind: 'Send reminder',
  'mark-paid': 'Mark paid manually',
  void: 'Void invoice',
};

const STYLES: Record<Action, string> = {
  remind: 'border-[#27272a] text-[#fafafa] hover:border-[#3f3f46]',
  'mark-paid':
    'border-[#1f3a2c] text-[#22c55e] hover:bg-[#0f1f17]',
  void: 'border-[#3a1f1f] text-[#f87171] hover:bg-[#1f1717]',
};

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action) {
    if (action === 'void' && !confirm('Void this invoice? This is reversible only by SQL.')) return;
    if (action === 'mark-paid' && !confirm('Mark as paid manually?')) return;
    setError(null);
    setBusyAction(action);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Action ${action} failed`);
      }
      start(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusyAction(null);
    }
  }

  const isPaid = status === 'paid';
  const isVoid = status === 'void';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(['remind', 'mark-paid', 'void'] as const).map((a) => {
          const disabled =
            pending ||
            busyAction === a ||
            (a === 'mark-paid' && (isPaid || isVoid)) ||
            (a === 'void' && isVoid) ||
            (a === 'remind' && (isPaid || isVoid));
          return (
            <button
              key={a}
              type="button"
              onClick={() => run(a)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-lg border bg-[#0f0f12] text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${STYLES[a]}`}
            >
              {busyAction === a ? 'Working…' : LABELS[a]}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
