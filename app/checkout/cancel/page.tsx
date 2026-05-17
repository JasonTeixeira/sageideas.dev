import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Checkout Cancelled',
  description: 'Your checkout was cancelled. No payment was taken.',
  robots: { index: false },
}

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-8 w-16 h-16 rounded-full bg-[#2A2826] border border-[#3F3F46] flex items-center justify-center">
          <X className="w-8 h-8 text-[#78716C]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4">
          Checkout cancelled.
        </h1>

        <p className="text-[#A8A29E] leading-relaxed mb-10">
          No payment was taken. If you had questions before completing checkout, or if
          something didn&apos;t look right — we&apos;re happy to help.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold"
          >
            <Link href="/book">
              Book a Discovery Call
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-[#3F3F46] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        <p className="mt-10 text-sm text-[#78716C]">
          Have a question?{' '}
          <a
            href="mailto:sage@sageideas.dev"
            className="text-[#0ED3CF] hover:text-[#22D3EE] transition-colors"
          >
            sage@sageideas.dev
          </a>
        </p>
      </div>
    </div>
  )
}
