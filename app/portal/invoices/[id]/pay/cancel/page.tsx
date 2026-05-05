import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment cancelled' };

export default async function PayCancelPage({
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
          { label: 'Cancelled' },
        ]}
      />
      <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1f1717] border border-[#3a1f1f] mx-auto flex items-center justify-center mb-5">
              <XCircle className="w-6 h-6 text-[#f87171]" />
            </div>
            <h1 className="text-xl font-semibold text-[#fafafa] mb-2">
              Payment cancelled
            </h1>
            <p className="text-sm text-[#a1a1aa] mb-6 max-w-md mx-auto">
              No charge was made. You can try again any time, or email
              sage@sageideas.dev for wire instructions.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href={`/portal/invoices/${id}/pay`}>
                <Button size="sm">Try again</Button>
              </Link>
              <Link href={`/portal/invoices/${id}`}>
                <Button variant="outline" size="sm">
                  Back to invoice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
