import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { Topbar } from '@/components/portal/topbar';
import { Card, CardContent } from '@/components/portal/ui/card';
import { Button } from '@/components/portal/ui/button';
import { CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manage billing' };

function NotConfigured({ reason }: { reason: string }) {
  return (
    <>
      <Topbar crumbs={[{ label: 'Billing', href: '/portal/billing' }, { label: 'Manage' }]} />
      <div className="px-6 lg:px-8 py-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] mx-auto flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-[#71717a]" />
            </div>
            <h3 className="font-semibold text-[#fafafa]">Billing portal is not configured for your account</h3>
            <p className="text-sm text-[#71717a] mt-1.5">
              Contact support to set up payment management for this organization.
            </p>
            <p className="sr-only" data-testid="billing-portal-fallback-reason">{reason}</p>
            <div className="mt-6">
              <Link href="/portal/billing">
                <Button variant="secondary" size="sm">Back to billing</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default async function BillingPortalManagePage() {
  const ctx = await getPortalContext();

  if (!ctx.organizationId) {
    return <NotConfigured reason="no-active-org" />;
  }

  // E2E mock path — short-circuit so tests don't need real Stripe keys.
  if (process.env.E2E_STRIPE_MOCK === '1') {
    const mockUrl =
      process.env.E2E_STRIPE_MOCK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.sageideas.dev'}/portal/billing?stripe_mock=1`;
    redirect(mockUrl);
  }

  if (!isStripeConfigured()) {
    return <NotConfigured reason="stripe-not-configured" />;
  }

  const sb = supabaseAdmin();
  const { data: org } = await sb
    .from('organizations')
    .select('id, stripe_customer_id')
    .eq('id', ctx.organizationId)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return <NotConfigured reason="no-stripe-customer" />;
  }

  const returnUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.sageideas.dev') + '/portal/billing';

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });
    redirect(session.url);
  } catch (err) {
    // `redirect()` throws an internal NEXT_REDIRECT error — let it propagate.
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
    if (typeof err === 'object' && err !== null && 'digest' in err) {
      const digest = (err as { digest?: string }).digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw err;
    }
    console.error('[billing/manage] failed to create Stripe portal session', err);
    return <NotConfigured reason="stripe-error" />;
  }
}
