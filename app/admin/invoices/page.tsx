import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminTopbar } from '@/components/admin/topbar';
import { NewInvoiceModal } from '@/components/admin/new-invoice-modal';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invoices' };

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'] as const;

type Invoice = {
  id: string;
  number: string | null;
  status: string;
  amount: number | string | null;
  total: number | string | null;
  due_date: string | null;
  created_at: string;
  organization_id: string | null;
  engagement_id: string | null;
  organizations: { name: string | null } | null;
  engagements: { title: string | null } | null;
};

const TONE: Record<string, string> = {
  draft: 'bg-[#52525b]/15 text-[#a1a1aa] border-[#52525b]/30',
  sent: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  paid: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  overdue: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  void: 'bg-[#3f3f46]/20 text-[#71717a] border-[#3f3f46]/30',
};

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(
    params.status as (typeof STATUSES)[number],
  )
    ? (params.status as (typeof STATUSES)[number])
    : undefined;
  const q = (params.q ?? '').trim();

  const { profile } = await requireAdmin();
  const sb = supabaseAdmin();

  let query = sb
    .from('invoices')
    .select(
      'id, number, status, amount, total, due_date, created_at, organization_id, engagement_id, organizations(name), engagements(title)',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  if (q) query = query.ilike('number', `%${q}%`);

  const { data: invoices } = await query;
  const list = (invoices ?? []) as unknown as Invoice[];

  const totalOutstanding = list
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total ?? i.amount ?? 0), 0);

  const [{ data: orgRows }, { data: engRows }] = await Promise.all([
    sb.from('organizations').select('id, name').order('name', { ascending: true }).limit(500),
    sb
      .from('engagements')
      .select('id, title, organization_id')
      .order('updated_at', { ascending: false })
      .limit(500),
  ]);
  const orgOptions = (orgRows ?? []).map((o) => ({ id: o.id, name: o.name as string }));
  const engOptions = (engRows ?? []).map((e) => ({
    id: e.id,
    title: e.title as string,
    organization_id: (e.organization_id as string | null) ?? null,
  }));

  return (
    <>
      <AdminTopbar
        crumbs={[{ label: 'Invoices' }]}
        email={profile.email}
        fullName={profile.full_name}
      />
      <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Invoices</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {list.length} on screen · {formatCurrency(totalOutstanding)} outstanding
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewInvoiceModal organizations={orgOptions} engagements={engOptions} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <form action="/admin/invoices" className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search invoice #…"
              className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b]"
            />
            <select
              name="status"
              defaultValue={status ?? ''}
              className="rounded-lg border border-[#27272a] bg-[#0f0f12] px-2.5 py-1.5 text-xs text-[#fafafa]"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4]"
            >
              Filter
            </button>
          </form>
          <span
            className="ml-auto rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300"
            title="Phase 30 wires the reminder send."
          >
            Bulk reminders → coming in Phase 30
          </span>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] p-10 text-center text-sm text-[#a1a1aa]">
            No invoices yet.
          </div>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b] border-b border-[#1f1f23]">
              <div className="col-span-3">Invoice</div>
              <div className="col-span-3">Organization</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Due</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-[#1f1f23]">
              {list.map((i) => (
                <Link
                  key={i.id}
                  href={`/admin/invoices/${i.id}`}
                  className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-[#131316] transition-colors"
                >
                  <div className="col-span-3 text-sm font-medium text-[#fafafa] truncate">
                    {i.number ?? i.id.slice(0, 8)}
                  </div>
                  <div className="col-span-3 text-xs text-[#a1a1aa] truncate">
                    {i.organizations?.name ?? '—'}
                    {i.engagements?.title ? ` · ${i.engagements.title}` : ''}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${
                        TONE[i.status] ?? TONE.draft
                      }`}
                    >
                      {i.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-[#71717a]">
                    {i.due_date ? formatDate(i.due_date) : '—'}
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-[#fafafa] tabular-nums text-right">
                    {formatCurrency(Number(i.total ?? i.amount ?? 0))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
