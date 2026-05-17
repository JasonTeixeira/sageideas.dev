import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { comparisons } from '@/data/compare/comparisons'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/compare' },
  title: 'Compare Sage Ideas — vs in-house, Big-4, and AI platforms',
  description:
    'Honest comparisons between Sage Ideas Studio and the alternatives most teams actually consider: in-house hires, Big-4 consultancies, and off-the-shelf AI platforms.',
  openGraph: {
    title: 'Compare Sage Ideas | Sage Ideas',
    description:
      'How a boutique studio compares to in-house hires, Big-4 firms, and AI platforms.',
    images: ['/og?title=Compare+Sage.&subtitle=Honest+tradeoffs.'],
  },
}

export default function CompareIndexPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <header className="mb-12">
          <SectionLabel>Compare</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA] tracking-tight">
            Sage Ideas vs the alternatives.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">
            We are not the right fit for everyone. Here is who is.
          </p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">
            Three honest comparisons against the alternatives most teams actually evaluate. Where
            the other side wins, we say so. The goal is not to convince you — it is to make sure
            you pick the right shape of help for your problem.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group flex flex-col rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 transition-all hover:border-[#0ED3CF]/50 hover:bg-[#0ED3CF]/5"
            >
              <span className="text-xs font-mono uppercase tracking-wider text-[#0ED3CF]">
                vs
              </span>
              <h2 className="mt-3 text-lg font-semibold text-[#FAFAFA] leading-snug">
                {c.competitorShort}
              </h2>
              <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{c.tagline}</p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-[#0ED3CF]">
                Read comparison
                <ArrowRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
