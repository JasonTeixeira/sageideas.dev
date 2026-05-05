import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment received' };

export default async function PaySuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Invoices', href: '/portal/invoices' },
          { label: id.slice(0, 8), href: `/portal/invoices/${id}` },
          { label: 'Paid' },
        ]}
      />
      <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0f1f17] border border-[#1f3a2c] mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
            </div>
            <h1 className="text-xl font-semibold text-[#fafafa] mb-2">
              Payment received
            </h1>
            <p className="text-sm text-[#a1a1aa] mb-6 max-w-md mx-auto">
              Thank you. Stripe is processing the charge. Your receipt will hit your inbox once
              the webhook confirms — usually within seconds. The invoice page will refresh to
              paid status shortly.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href={`/portal/invoices/${id}`}>
                <Button size="sm">View invoice</Button>
              </Link>
              <Link href="/portal/invoices">
                <Button variant="outline" size="sm">
                  All invoices
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
