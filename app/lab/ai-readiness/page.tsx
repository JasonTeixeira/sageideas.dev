import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { ReadinessForm } from './readiness-form'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/lab/ai-readiness' },
  title: 'AI Readiness Score — The Lab',
  description:
    '10-question diagnostic that scores your team across data, infrastructure, process, talent, and ROI clarity — with a personalized roadmap based on where you are.',
  openGraph: {
    title: 'AI Readiness Score — The Lab | Sage Ideas',
    description:
      '10-question diagnostic that scores your team across data, infrastructure, process, talent, and ROI clarity.',
    images: ['/og?title=AI+Readiness+Score.&subtitle=10+questions.+Honest+answer.'],
  },
}

export default function AiReadinessPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Back link */}
        <Link
          href="/lab"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78716C] hover:text-[#FAFAFA] transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          The Lab
        </Link>

        {/* Hero */}
        <header className="mb-12">
          <SectionLabel>Diagnostic</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA] tracking-tight">
            AI Readiness Score.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">
            10 questions. An honest answer about where to start.
          </p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">
            Most teams skip readiness and burn budget on agents they cannot operate. This
            diagnostic scores your team across data, infrastructure, process, talent, and ROI
            clarity — and tells you whether to pilot, scale, or fix the foundation first. Free,
            no email required, results stay in your browser.
          </p>
        </header>

        {/* Form */}
        <ReadinessForm />
      </div>
    </div>
  )
}
