import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { CalculatorsTabs } from './calculators-tabs'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/lab/calculators' },
  title: 'ROI Calculators — The Lab',
  description:
    'Five interactive ROI calculators for the engagements clients ask about most: AI SDR, support agent, RAG, voice, and churn prediction. Honest math, no signup.',
  openGraph: {
    title: 'ROI Calculators — The Lab | Sage Ideas',
    description:
      'Five interactive ROI calculators: AI SDR, support agent, RAG, voice, and churn prediction.',
    images: ['/og?title=ROI+Calculators.&subtitle=Honest+math.+No+signup.'],
  },
}

export default function CalculatorsPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Link
          href="/lab"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78716C] hover:text-[#FAFAFA] transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          The Lab
        </Link>

        <header className="mb-12">
          <SectionLabel>Tools</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] tracking-tight">
            ROI Calculators.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">
            Five interactive estimates for the engagements clients ask about most.
          </p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">
            These are conservative back-of-envelope models. Real ROI depends on data quality,
            workflow design, and how much process you have around the AI. Use the numbers as a
            starting hypothesis, not a forecast.
          </p>
        </header>

        <CalculatorsTabs />
      </div>
    </div>
  )
}
