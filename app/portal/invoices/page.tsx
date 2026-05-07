import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invoices' };

type Invoice = {
  id: string;
  number: string | null;
  status: string;
  total: number | string | null;
  amount_due: number | string | null;
  due_date: string | null;
  created_at: string;
  engagement_id: string | null;
  engagements: { id: string; title: string } | null;
};

const TONE: Record<string, 'cyan' | 'amber' | 'emerald' | 'rose' | 'neutral'> = {
  draft: 'neutral',
  sent: 'amber',
  open: 'amber',
  paid: 'emerald',
  void: 'neutral',
  overdue: 'rose',
};

export default async function InvoicesPage() {
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  let invoices: Invoice[] = [];
  if (ctx.organizationId) {
    const { data } = await sb
      .from('invoices')
      .select(
        'id, number, status, total, amount_due, due_date, created_at, engagement_id, engagements(id, title)',
      )
      .eq('organization_id', ctx.organizationId)
      .order('created_at', { ascending: false });
    invoices = (data ?? []) as unknown as Invoice[];
  }

  return (
    <>
      <Topbar crumbs={[{ label: 'Invoices' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Invoices</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            All invoices, paid and pending. Click a row for line items and payment.
          </p>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-4">
                <Receipt className="w-5 h-5 text-[#71717a]" />
              </div>
              <h3 className="font-semibold text-[#fafafa]">No invoices yet</h3>
              <p className="text-sm text-[#71717a] mt-1.5">
                Once an engagement bills, you&apos;ll see invoices here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#27272a] bg-[#0f0f12] divide-y divide-[#1f1f23]">
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
              <div className="md:col-span-3">Invoice</div>
              <div className="md:col-span-4">Project</div>
              <div className="md:col-span-2">Status</div>
              <div className="md:col-span-2">Due</div>
              <div className="md:col-span-1 text-right">Amount</div>
            </div>
            {invoices.map((i) => (
              <Link
                key={i.id}
                href={`/portal/invoices/${i.id}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-4 py-3 items-center hover:bg-[#131316]"
              >
                <div className="md:col-span-3 text-sm font-medium text-[#fafafa] truncate">
                  {i.number ?? i.id.slice(0, 8)}
                </div>
                <div className="md:col-span-4 text-xs text-[#a1a1aa] truncate">
                  {i.engagements?.title ?? '—'}
                </div>
                <div className="md:col-span-2">
                  <Badge tone={TONE[i.status] ?? 'neutral'}>{i.status}</Badge>
                </div>
                <div className="md:col-span-2 text-xs text-[#71717a]">
                  {i.due_date ? formatDate(i.due_date) : '—'}
                </div>
                <div className="md:col-span-1 text-sm font-semibold text-[#fafafa] tabular-nums md:text-right">
                  {formatCurrency(Number(i.total ?? 0))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
