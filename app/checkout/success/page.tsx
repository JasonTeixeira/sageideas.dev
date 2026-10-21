import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Clock3, RotateCcw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCheckoutReturnState } from '@/lib/journeys/checkout-return'
import { CheckoutCompleteTracker } from './checkout-complete-tracker'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Checkout status',
  description: 'Check the verified status of your Sage Ideas checkout.',
  robots: { index: false },
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; session_id?: string }>
}) {
  const { slug, session_id: sessionId } = await searchParams
  const state = await getCheckoutReturnState(slug, sessionId)

  const content = state.status === 'confirmed'
    ? {
        icon: <Check className="h-8 w-8 text-[#3D5AFE]" />,
        title: 'Payment confirmed.',
        body: 'Your webhook-verified receipt is recorded. Expect an email from sage@sageideas.dev within one business day with next steps.',
      }
    : state.status === 'partially_refunded'
      ? {
          icon: <RotateCcw className="h-8 w-8 text-amber-300" />,
          title: 'Partial refund recorded.',
          body: 'The payment was received and a partial refund is now recorded. Contact us if the amount is not what you expected.',
        }
      : state.status === 'refunded'
        ? {
            icon: <RotateCcw className="h-8 w-8 text-amber-300" />,
            title: 'Refund recorded.',
            body: 'This checkout has been refunded. Your bank may take several business days to display the credit.',
          }
        : state.status === 'pending'
          ? {
              icon: <Clock3 className="h-8 w-8 text-[#8FA0FF]" />,
              title: 'We’re confirming your payment.',
              body: 'Stripe returned you safely, but the signed webhook receipt has not arrived yet. Refresh shortly; do not submit another payment.',
            }
          : {
              icon: <ShieldAlert className="h-8 w-8 text-amber-300" />,
              title: 'We couldn’t verify this return link.',
              body: 'No payment status can be inferred from this URL. Check your Stripe receipt or contact us and we’ll reconcile it.',
            }

  return (
    <main className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#3D5AFE]/30 bg-[#3D5AFE]/10">
          {content.icon}
        </div>
        <h1 className="mb-4 text-3xl font-normal text-[#FAFAFA] sm:text-4xl">{content.title}</h1>
        <p className="mb-10 leading-relaxed text-[#A8A29E]">{content.body}</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="bg-[#3D5AFE] font-semibold text-[#09090B] hover:bg-[#2F46D8]">
            <Link href={state.status === 'pending' && state.slug ? `/checkout/success?slug=${encodeURIComponent(state.slug)}&session_id=${encodeURIComponent(sessionId ?? '')}` : '/work'}>
              {state.status === 'pending' ? 'Refresh status' : 'See our work'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-[#3F3F46] bg-transparent text-[#A8A29E] hover:border-[#3D5AFE] hover:text-[#3D5AFE]">
            <a href="mailto:sage@sageideas.dev">Contact support</a>
          </Button>
        </div>
        <p className="mt-10 text-xs font-mono text-[#52525B]">
          Stripe sends the payment receipt. Sage Ideas confirms fulfillment from the signed webhook record.
        </p>
      </div>
      {state.status === 'confirmed' && state.slug && <CheckoutCompleteTracker slug={state.slug} />}
    </main>
  )
}
