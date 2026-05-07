import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import { Download, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

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

type Invoice = {
  id: string;
  number: string | null;
  status: string;
  subtotal: number | string | null;
  tax: number | string | null;
  total: number | string | null;
  amount_due: number | string | null;
  amount_paid: number | string | null;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  notes: string | null;
  organization_id: string;
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const sb = supabaseAdmin();

  const { data } = await sb
    .from('invoices')
    .select(
      'id, number, status, subtotal, tax, total, amount_due, amount_paid, due_date, created_at, sent_at, notes, organization_id, engagement_id, engagements(id, title)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) notFound();
  const invoice = data as unknown as Invoice;
  if (!ctx.isAdmin && invoice.organization_id !== ctx.organizationId) notFound();

  const { data: items } = await sb
    .from('invoice_line_items')
    .select('id, description, quantity, unit_price, amount, position')
    .eq('invoice_id', invoice.id)
    .order('position', { ascending: true });
  const lineItems: LineItem[] = (items ?? []) as LineItem[];

  const computedSubtotal = lineItems.reduce((sum, li) => sum + Number(li.amount ?? 0), 0);
  const subtotal = Number(invoice.subtotal ?? computedSubtotal);
  const tax = Number(invoice.tax ?? 0);
  const total = Number(invoice.total ?? subtotal + tax);
  const amountPaid = Number(invoice.amount_paid ?? 0);
  const amountDue = Number(invoice.amount_due ?? Math.max(total - amountPaid, 0));
  const isPaid = invoice.status === 'paid';

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Dashboard', href: '/portal' },
          { label: 'Invoices', href: '/portal/invoices' },
          { label: invoice.number ?? invoice.id.slice(0, 8) },
        ]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
              {invoice.number ?? `Invoice ${invoice.id.slice(0, 8)}`}
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {invoice.engagements?.title ?? 'Engagement'} · Issued{' '}
              {formatDate(invoice.created_at)}
              {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ''}
            </p>
          </div>
          <Badge tone={TONE[invoice.status] ?? 'neutral'}>{invoice.status}</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-[#1f1f23] grid grid-cols-12 gap-3 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            {lineItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#71717a]">
                No line items recorded.
              </div>
            ) : (
              <ul className="divide-y divide-[#1f1f23]">
                {lineItems.map((li) => (
                  <li
                    key={li.id}
                    className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-sm"
                  >
                    <div className="col-span-6 text-[#fafafa]">{li.description}</div>
                    <div className="col-span-2 text-right text-[#a1a1aa] tabular-nums">
                      {Number(li.quantity)}
                    </div>
                    <div className="col-span-2 text-right text-[#a1a1aa] tabular-nums">
                      {formatCurrency(Number(li.unit_price))}
                    </div>
                    <div className="col-span-2 text-right text-[#fafafa] tabular-nums font-medium">
                      {formatCurrency(Number(li.amount))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-5 py-4 border-t border-[#1f1f23] space-y-1.5 text-sm">
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow label="Tax" value={formatCurrency(tax)} />
              <div className="flex justify-between pt-2 mt-2 border-t border-[#1f1f23]">
                <span className="font-semibold text-[#fafafa]">Total</span>
                <span className="font-semibold text-[#fafafa] tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
              <SummaryRow label="Paid" value={formatCurrency(amountPaid)} />
              <div className="flex justify-between pt-2 mt-2 border-t border-[#1f1f23]">
                <span className="font-semibold text-[#fafafa]">Amount due</span>
                <span
                  className="font-semibold text-[#fafafa] tabular-nums"
                  data-testid="invoice-amount-due"
                >
                  {formatCurrency(amountDue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card>
            <CardContent className="p-5 text-sm text-[#a1a1aa] whitespace-pre-wrap">
              {invoice.notes}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
          </a>
          {!isPaid && (
            <Link href={`/portal/invoices/${invoice.id}/pay`}>
              <Button size="sm">
                <CreditCard className="w-3.5 h-3.5" /> Pay now
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#a1a1aa]">
      <span>{label}</span>
      <span className="tabular-nums text-[#e4e4e7]">{value}</span>
    </div>
  );
}
