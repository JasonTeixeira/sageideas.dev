import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Payment Confirmed',
  description: 'Your payment was received. We will be in touch shortly to kick off your engagement.',
  robots: { index: false },
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-8 w-16 h-16 rounded-full bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 flex items-center justify-center">
          <Check className="w-8 h-8 text-[#0ED3CF]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4">
          Payment confirmed.
        </h1>

        <p className="text-[#A8A29E] leading-relaxed mb-3">
          Thank you — your payment was received and your engagement is officially on the books.
        </p>
        <p className="text-[#A8A29E] leading-relaxed mb-10">
          Expect an email from{' '}
          <a
            href="mailto:sage@sageideas.dev"
            className="text-[#0ED3CF] hover:text-[#22D3EE] transition-colors"
          >
            sage@sageideas.dev
          </a>{' '}
          within one business day with next steps.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold"
          >
            <Link href="/work">
              See Our Work
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-[#3F3F46] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
          >
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        <p className="mt-10 text-xs text-[#3F3F46] font-mono">
          A receipt has been sent to your email by Stripe.
        </p>
      </div>
    </div>
  )
}
