import Link from 'next/link';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';
import { Compass, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Page not found', robots: { index: false, follow: false } };

// Renders the portal 404 view. The middleware rewrites unknown /portal/*
// sub-routes here with status: 404 so the response carries the right wire
// status without surrendering the portal chrome (sidebar/topbar) that the
// parent layout supplies.
export default function PortalNotFoundPage() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Portal', href: '/portal' }, { label: 'Not found' }]} />
      <div className="px-6 lg:px-8 py-16 max-w-xl mx-auto">
        <Card>
          <CardContent className="p-10 text-center">
            <div
              className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-5"
              data-testid="portal-not-found-icon"
            >
              <Compass className="w-5 h-5 text-[#71717a]" />
            </div>
            <h1 className="text-xl font-semibold text-[#fafafa]">Page not found</h1>
            <p className="text-sm text-[#71717a] mt-2 leading-relaxed">
              The page you tried to open doesn&apos;t exist in your workspace. It may
              have moved, or the link is stale. Head back to the dashboard to pick up
              where you left off.
            </p>
            <Link href="/portal" className="inline-block mt-6">
              <Button size="sm">
                Go to dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
