import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { PaymentRetryButton } from '@/components/admin/payment-retry-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payments', robots: { index: false, follow: false } };

type Status = 'received' | 'processed' | 'failed' | 'duplicate';
type Filter = 'all' | Status;

type WebhookEventRow = {
  event_id: string;
  event_type: string;
  status: Status;
  received_at: string;
  processed_at: string | null;
  error: string | null;
};

type FailedInvoiceRow = {
  id: string;
  organization_id: string | null;
  amount_due: number | null;
  total: number | null;
  currency: string | null;
  dunning_status: string | null;
  stripe_invoice_id: string | null;
  updated_at: string;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'received', label: 'Received' },
  { value: 'processed', label: 'Processed' },
  { value: 'duplicate', label: 'Duplicate' },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter: Filter = (FILTERS.find((f) => f.value === sp.status)?.value ?? 'all') as Filter;

  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  let q = sb
    .from('stripe_webhook_events')
    .select('event_id, event_type, status, received_at, processed_at, error')
    .order('received_at', { ascending: false })
    .limit(100);
  if (filter !== 'all') q = q.eq('status', filter);

  const [{ data: eventsData }, { data: failedInvoicesData }] = await Promise.all([
    q,
    sb
      .from('invoices')
      .select(
        'id, organization_id, amount_due, total, currency, dunning_status, stripe_invoice_id, updated_at',
      )
      .in('dunning_status', ['reminded_1', 'reminded_2', 'final_notice'])
      .order('updated_at', { ascending: false })
      .limit(50),
  ]);

  const events = (eventsData ?? []) as WebhookEventRow[];
  const failedInvoices = (failedInvoicesData ?? []) as FailedInvoiceRow[];

  const counts = {
    failed: events.filter((e) => e.status === 'failed').length,
    received: events.filter((e) => e.status === 'received').length,
    duplicate: events.filter((e) => e.status === 'duplicate').length,
  };

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Payments' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div
        className="px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-6"
        data-testid="admin-payments"
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Payments</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Stripe webhook deliveries + invoices in dunning. Failed deliveries can be retried
              from the stored payload.
            </p>
          </div>
          <FilterTabs current={filter} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Failed (window)" value={counts.failed} tone={counts.failed > 0 ? 'rose' : 'emerald'} />
          <Stat label="Pending" value={counts.received} tone="amber" />
          <Stat label="Duplicates" value={counts.duplicate} tone="neutral" />
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-medium text-[#fafafa]">
                Webhook events ({events.length})
              </h2>
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-[#71717a]" data-testid="payments-no-events">
                No Stripe webhook events match this filter.
              </p>
            ) : (
              <div className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]">
                {events.map((e) => (
                  <div
                    key={e.event_id}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center"
                    data-testid="payments-event-row"
                    data-event-id={e.event_id}
                  >
                    <div className="col-span-2">
                      <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                    </div>
                    <div className="col-span-3 text-[#a1a1aa] truncate font-mono">
                      {e.event_type}
                    </div>
                    <div className="col-span-3 text-[#a1a1aa] truncate">
                      {new Date(e.received_at).toLocaleString()}
                    </div>
                    <div className="col-span-3 text-[#71717a] truncate" title={e.error ?? ''}>
                      {e.error ?? (e.processed_at ? '—' : 'pending')}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {e.status === 'failed' ? (
                        <PaymentRetryButton eventId={e.event_id} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-medium text-[#fafafa] mb-3">
              Invoices in dunning ({failedInvoices.length})
            </h2>
            {failedInvoices.length === 0 ? (
              <p className="text-xs text-[#71717a]" data-testid="payments-no-dunning">
                No invoices currently in dunning.
              </p>
            ) : (
              <div className="rounded-lg border border-[#27272a] divide-y divide-[#1f1f23]">
                {failedInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center"
                    data-testid="payments-dunning-row"
                  >
                    <div className="col-span-2">
                      <Badge tone="amber">{inv.dunning_status ?? 'unknown'}</Badge>
                    </div>
                    <div className="col-span-4 font-mono text-[#a1a1aa] truncate">
                      {inv.stripe_invoice_id ?? inv.id.slice(0, 8)}
                    </div>
                    <div className="col-span-3 tabular-nums text-[#fafafa]">
                      {formatMoney(inv.amount_due ?? inv.total, inv.currency)}
                    </div>
                    <div className="col-span-3 text-[#71717a] truncate">
                      {new Date(inv.updated_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function FilterTabs({ current }: { current: Filter }) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-[#27272a] bg-[#0f0f12] p-0.5"
      role="tablist"
    >
      {FILTERS.map((f) => (
        <a
          key={f.value}
          href={f.value === 'all' ? '/admin/payments' : `/admin/payments?status=${f.value}`}
          aria-selected={current === f.value}
          role="tab"
          data-testid={`payments-filter-${f.value}`}
          className={`px-2.5 py-1 text-xs rounded ${
            current === f.value
              ? 'bg-[#06b6d4]/15 text-[#67e8f9]'
              : 'text-[#a1a1aa] hover:text-[#fafafa]'
          }`}
        >
          {f.label}
        </a>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'rose' | 'amber' | 'emerald' | 'neutral';
}) {
  const dot =
    tone === 'rose'
      ? 'bg-rose-400'
      : tone === 'amber'
        ? 'bg-amber-400'
        : tone === 'emerald'
          ? 'bg-emerald-400'
          : 'bg-zinc-500';
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-[10px] uppercase tracking-wider text-[#52525b]">{label}</span>
        </div>
        <div className="text-2xl font-semibold text-[#fafafa] tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function statusTone(s: Status): 'rose' | 'emerald' | 'amber' | 'neutral' {
  switch (s) {
    case 'failed':
      return 'rose';
    case 'processed':
      return 'emerald';
    case 'received':
      return 'amber';
    case 'duplicate':
      return 'neutral';
  }
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  const cur = (currency ?? 'usd').toUpperCase();
  return `${cur} ${amount.toFixed(2)}`;
}
