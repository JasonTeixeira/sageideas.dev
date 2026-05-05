import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InvoiceActions } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invoice' };

type LineItem = {
  id: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
  position: number | null;
};

type Payment = {
  id: string;
  amount: number | string;
  currency: string | null;
  status: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

const DUNNING_LABEL: Record<string, string> = {
  current: 'Current',
  grace: 'Grace period',
  reminded_1: 'First reminder sent',
  reminded_2: 'Second reminder sent',
  final_notice: 'Final notice sent',
  collections: 'Flagged for collections',
  written_off: 'Written off',
};

const DUNNING_COLOR: Record<string, string> = {
  current: 'text-[#a1a1aa]',
  grace: 'text-[#a1a1aa]',
  reminded_1: 'text-[#fbbf24]',
  reminded_2: 'text-[#fb923c]',
  final_notice: 'text-[#f87171]',
  collections: 'text-[#f87171]',
  written_off: 'text-[#71717a]',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  const { data: inv } = await sb
    .from('invoices')
    .select(
      'id, number, status, amount, total, subtotal, tax, due_date, sent_at, paid_at, notes, created_at, organization_id, engagement_id, dunning_status, last_reminder_at, reminder_count, stripe_payment_intent_id, stripe_checkout_session_id, payment_method_used, organizations(name), engagements(title)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!inv) notFound();

  const { data: items } = await sb
    .from('invoice_line_items')
    .select('id, description, quantity, unit_price, amount, position')
    .eq('invoice_id', id)
    .order('position', { ascending: true });

  const { data: paymentsRaw } = await sb
    .from('payments')
    .select('id, amount, currency, status, paid_at, stripe_payment_intent_id, created_at')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false });

  const lineItems = (items ?? []) as LineItem[];
  const payments = (paymentsRaw ?? []) as Payment[];
  const dunningKey = (inv.dunning_status as string) ?? 'current';

  return (
    <>
      <AdminTopbar
        crumbs={[
          { label: 'Invoices', href: '/admin/invoices' },
          { label: inv.number ?? id.slice(0, 8) },
        ]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              Invoice {inv.number ?? id.slice(0, 8)}
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {(inv.organizations as unknown as { name: string | null } | null)?.name ?? '—'}
              {(inv.engagements as unknown as { title: string | null } | null)?.title
                ? ` · ${(inv.engagements as unknown as { title: string | null }).title}`
                : ''}
            </p>
          </div>
          <InvoiceActions invoiceId={id} status={inv.status as string | null} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Status" value={inv.status ?? '—'} />
          <Stat label="Due" value={inv.due_date ? formatDate(inv.due_date) : '—'} />
          <Stat
            label="Subtotal"
            value={formatCurrency(Number(inv.subtotal ?? inv.amount ?? 0))}
          />
          <Stat label="Total" value={formatCurrency(Number(inv.total ?? inv.amount ?? 0))} />
        </div>

        <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-3">
            Dunning
          </h2>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className={`text-sm font-medium ${DUNNING_COLOR[dunningKey] ?? 'text-[#fafafa]'}`}>
                {DUNNING_LABEL[dunningKey] ?? dunningKey}
              </div>
              <div className="text-xs text-[#71717a] mt-0.5">
                Reminders sent: {inv.reminder_count ?? 0}
                {inv.last_reminder_at
                  ? ` · last ${formatDate(inv.last_reminder_at as string)}`
                  : ''}
              </div>
            </div>
            {inv.stripe_payment_intent_id && (
              <div className="text-xs font-mono text-[#71717a]">
                PI: {String(inv.stripe_payment_intent_id).slice(0, 18)}…
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#52525b] border-b border-[#1f1f23]">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Unit</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {lineItems.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#a1a1aa]">No line items.</div>
          ) : (
            <div className="divide-y divide-[#1f1f23]">
              {lineItems.map((li) => (
                <div key={li.id} className="grid grid-cols-12 px-4 py-2.5 text-xs">
                  <div className="col-span-6 text-[#fafafa]">{li.description}</div>
                  <div className="col-span-2 text-right text-[#a1a1aa] tabular-nums">
                    {li.quantity}
                  </div>
                  <div className="col-span-2 text-right text-[#a1a1aa] tabular-nums">
                    {formatCurrency(Number(li.unit_price))}
                  </div>
                  <div className="col-span-2 text-right text-[#fafafa] tabular-nums">
                    {formatCurrency(Number(li.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#52525b] border-b border-[#1f1f23]">
            Payments
          </div>
          {payments.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#a1a1aa]">No payments yet.</div>
          ) : (
            <div className="divide-y divide-[#1f1f23]">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-2.5 text-xs flex items-center justify-between flex-wrap gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        p.status === 'succeeded'
                          ? 'text-[#22c55e]'
                          : p.status === 'refunded'
                            ? 'text-[#fbbf24]'
                            : 'text-[#a1a1aa]'
                      }
                    >
                      {p.status}
                    </span>
                    <span className="text-[#a1a1aa]">
                      {p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}
                    </span>
                    {p.stripe_payment_intent_id && (
                      <span className="font-mono text-[#71717a]">
                        {p.stripe_payment_intent_id.slice(0, 18)}…
                      </span>
                    )}
                  </div>
                  <div className="text-[#fafafa] tabular-nums font-medium">
                    {formatCurrency(Number(p.amount), (p.currency ?? 'usd').toUpperCase())}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {inv.notes && (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-5">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#71717a] mb-2">
              Notes
            </h2>
            <p className="text-sm text-[#a1a1aa] whitespace-pre-wrap">{inv.notes}</p>
          </div>
        )}

        <Link
          href="/admin/invoices"
          className="inline-block text-xs font-mono uppercase tracking-widest text-[#71717a] hover:text-[#06b6d4]"
        >
          ← Back to invoices
        </Link>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#71717a]">
        {label}
      </div>
      <div className="mt-1 text-sm text-[#fafafa]">{value}</div>
    </div>
  );
}
