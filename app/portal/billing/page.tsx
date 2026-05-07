import { getPortalContext } from '@/lib/portal/auth';
import { getInvoicesForOrg } from '@/lib/portal/queries';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Badge } from '@/components/portal/ui/badge';
import { Button } from '@/components/portal/ui/button';
import Link from 'next/link';
import { Receipt, Download, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata = { title: 'Billing' };

export default async function BillingPage() {
  const ctx = await getPortalContext();
  const invoices = ctx.organizationId ? await getInvoicesForOrg(ctx.organizationId) : [];
  const paid = (invoices as any[]).filter((i) => i.status === 'paid');
  const open = (invoices as any[]).filter((i) => i.status !== 'paid');

  const totalPaid = paid.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const totalOpen = open.reduce((s, i) => s + Number(i.amount_due ?? 0), 0);

  return (
    <>
      <Topbar crumbs={[{ label: 'Billing' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              Invoices, subscriptions, and payment history.
            </p>
          </div>
          <Link href="/portal/billing/manage" data-testid="manage-billing-link">
            <Button variant="secondary" size="sm">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Manage billing
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-[#71717a]">Outstanding</div>
              <div className="text-2xl font-semibold mono mt-1">
                {formatCurrency(totalOpen)}
              </div>
              <div className="text-xs text-[#71717a] mt-1">{open.length} open invoice(s)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-[#71717a]">Lifetime spend</div>
              <div className="text-2xl font-semibold mono mt-1">
                {formatCurrency(totalPaid)}
              </div>
              <div className="text-xs text-[#71717a] mt-1">{paid.length} paid invoice(s)</div>
            </CardContent>
          </Card>
        </div>

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-4">
                <Receipt className="w-5 h-5 text-[#71717a]" />
              </div>
              <h3 className="font-semibold">No invoices yet</h3>
              <p className="text-sm text-[#71717a] mt-1.5">
                When an engagement bills, invoices will appear here. Pay securely via Stripe.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(invoices as any[]).map((i) => (
              <Card key={i.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Receipt className="w-5 h-5 text-[#71717a]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {i.number ?? `Invoice ${i.id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-[#71717a]">
                      {formatCurrency(Number(i.amount_due ?? 0))} ·{' '}
                      {i.due_date ? `Due ${formatDate(i.due_date)}` : 'No due date'}
                    </div>
                  </div>
                  <Badge tone={i.status === 'paid' ? 'emerald' : 'amber'}>{i.status}</Badge>
                  {i.hosted_invoice_url && (
                    <a href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </a>
                  )}
                  {i.invoice_pdf && (
                    <a href={i.invoice_pdf} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" aria-label="Download PDF">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
