import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Minus, X } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { comparisons } from '@/data/compare/comparisons'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = comparisons.find((x) => x.slug === slug)
  if (!c) return {}
  return {
    alternates: { canonical: `https://www.sageideas.dev/compare/${c.slug}` },
    title: `Sage Ideas vs ${c.competitorShort} — honest comparison`,
    description: c.tagline,
    openGraph: {
      title: `Sage Ideas vs ${c.competitorShort} | Sage Ideas`,
      description: c.tagline,
      images: [
        `/og?title=${encodeURIComponent(`vs ${c.competitorShort}.`)}&subtitle=${encodeURIComponent('Honest tradeoffs.')}`,
      ],
    },
  }
}

function EdgeIcon({ edge, side }: { edge: 'sage' | 'competitor' | 'tie'; side: 'sage' | 'competitor' }) {
  if (edge === 'tie') return <Minus className="h-3.5 w-3.5 text-[#57534E]" />
  if (edge === side) return <Check className="h-3.5 w-3.5 text-[#0ED3CF]" />
  return <X className="h-3.5 w-3.5 text-[#57534E]" />
}

export default async function CompareDetailPage({ params }: Props) {
  const { slug } = await params
  const c = comparisons.find((x) => x.slug === slug)
  if (!c) notFound()

  const sageWins = c.rows.filter((r) => r.edge === 'sage').length
  const compWins = c.rows.filter((r) => r.edge === 'competitor').length
  const ties = c.rows.filter((r) => r.edge === 'tie').length

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78716C] hover:text-[#FAFAFA] transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          All comparisons
        </Link>

        <header className="mb-12">
          <SectionLabel>Comparison</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-[#FAFAFA] tracking-tight">
            Sage Ideas <span className="text-[#57534E]">vs</span> {c.competitorShort}.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E]">{c.tagline}</p>
          <p className="mt-4 text-[#78716C] leading-relaxed">{c.intro}</p>
        </header>

        {/* Tally strip */}
        <div className="grid grid-cols-3 gap-2 mb-10 rounded-lg border border-[#2A2826] bg-[#1A1917] p-4">
          <div className="text-center">
            <div className="text-xs font-mono uppercase tracking-wider text-[#0ED3CF]">Sage wins</div>
            <div className="mt-1 text-2xl font-bold text-[#FAFAFA] tabular-nums">{sageWins}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-mono uppercase tracking-wider text-[#78716C]">Tied / depends</div>
            <div className="mt-1 text-2xl font-bold text-[#A8A29E] tabular-nums">{ties}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-mono uppercase tracking-wider text-[#A8A29E]">{c.competitorShort} wins</div>
            <div className="mt-1 text-2xl font-bold text-[#A8A29E] tabular-nums">{compWins}</div>
          </div>
        </div>

        {/* Comparison table */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight mb-6">
            Side by side
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[#2A2826]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A1917] border-b border-[#2A2826]">
                  <th className="text-left p-4 font-medium text-[#A8A29E] w-1/3">Dimension</th>
                  <th className="text-left p-4 font-medium text-[#0ED3CF]">Sage Ideas</th>
                  <th className="text-left p-4 font-medium text-[#A8A29E]">{c.competitorShort}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row, i) => (
                  <tr
                    key={row.dimension}
                    className={
                      i % 2 === 0
                        ? 'bg-[#09090B] border-b border-[#2A2826]'
                        : 'bg-[#0F0F11] border-b border-[#2A2826]'
                    }
                  >
                    <td className="p-4 align-top text-[#FAFAFA] font-medium">{row.dimension}</td>
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-2">
                        <EdgeIcon edge={row.edge} side="sage" />
                        <span className="text-[#E4E4E7]">{row.sage}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-2">
                        <EdgeIcon edge={row.edge} side="competitor" />
                        <span className="text-[#A8A29E]">{row.competitor}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* When they win / when we win */}
        <section className="grid gap-4 sm:grid-cols-2 mb-12">
          <div className="rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A8A29E]">
              Pick {c.competitorShort.toLowerCase()} when
            </span>
            <p className="mt-3 text-[#E4E4E7] leading-relaxed">{c.whenTheyWin}</p>
          </div>
          <div className="rounded-2xl border border-[#0ED3CF]/30 bg-[#0ED3CF]/5 p-6">
            <span className="text-xs font-mono uppercase tracking-wider text-[#0ED3CF]">
              Pick Sage Ideas when
            </span>
            <p className="mt-3 text-[#FAFAFA] leading-relaxed">{c.whenWeWin}</p>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-[#0ED3CF]/30 bg-gradient-to-br from-[#0ED3CF]/10 to-transparent p-8">
          <h3 className="text-xl font-bold text-[#FAFAFA] tracking-tight">
            Still not sure which fits?
          </h3>
          <p className="mt-2 text-[#A8A29E] leading-relaxed">
            Take the AI Readiness Score for a personalized recommendation, or book a 30-minute
            call. We will tell you honestly whether we are the right partner.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/services/${c.ctaSlug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0ED3CF] px-5 py-3 text-sm font-medium text-[#09090B] transition-all hover:bg-[#0AA8A5]"
            >
              See the engagement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/lab/ai-readiness"
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#1A1917] px-5 py-3 text-sm font-medium text-[#FAFAFA] transition-all hover:border-[#3D3A37]"
            >
              Take the readiness score
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
