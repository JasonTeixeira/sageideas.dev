import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { PageHeroBg } from '@/components/page-hero-bg'
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
    <div className="relative min-h-screen bg-[#09090B]">
      <PageHeroBg src="/images/hero-trust.jpg" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <header className="mb-16">
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

        <div className="grid gap-6 sm:grid-cols-3">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="group flex flex-col rounded-2xl border border-[#2A2826] bg-[#12110F] overflow-hidden transition-all hover:border-[#0ED3CF]/50 hover:shadow-[0_8px_32px_rgba(14,211,207,0.06)]"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#0ED3CF]">
                  vs
                </span>
                <h2 className="mt-3 text-xl font-semibold text-[#FAFAFA] leading-snug">
                  {c.competitorShort}
                </h2>
                <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{c.tagline}</p>
              </div>

              {/* Mini comparison preview — first 3 rows */}
              <div className="mx-6 mb-4 rounded-lg border border-[#2A2826] overflow-hidden">
                {c.rows.slice(0, 3).map((row, i) => (
                  <div
                    key={row.dimension}
                    className={`flex items-center justify-between px-3 py-2 text-xs ${
                      i % 2 === 0 ? 'bg-[#09090B]' : 'bg-[#0B0A09]'
                    }`}
                  >
                    <span className="text-[#78716C] truncate flex-1">{row.dimension}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {row.edge === 'sage' ? (
                        <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                      ) : row.edge === 'tie' ? (
                        <Minus className="w-3.5 h-3.5 text-[#78716C]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-[#E85D3A]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-auto px-6 pb-6 flex items-center gap-2 text-sm text-[#0ED3CF]">
                Read full comparison
                <ArrowRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
