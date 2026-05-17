import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, FileText } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { templates, categoryLabels } from '@/data/lab/templates'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/lab/templates' },
  title: 'Free Templates — The Lab',
  description:
    'Five free templates from the Sage Ideas studio: prompt library, eval harness, agent spec, ROI calculator, and AI vendor RFP. Drop them in today.',
  openGraph: {
    title: 'Free Templates — The Lab | Sage Ideas',
    description:
      'Prompt library, eval harness, agent spec, ROI calculator, AI vendor RFP — five templates we actually use.',
    images: ['/og?title=Free+Templates.&subtitle=Drop-in+ready.'],
  },
}

export default function TemplatesIndexPage() {
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
          <SectionLabel>Templates</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA] tracking-tight">
            Free templates.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">
            Drop them in today. No email gate.
          </p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">
            These are templates we use ourselves. Copy them, fork them, ignore them. They will not
            do the work for you, but they will stop you from skipping steps that matter.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Link
              key={t.slug}
              href={`/lab/templates/${t.slug}`}
              className="group flex flex-col rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 transition-all hover:border-[#0ED3CF]/50 hover:bg-[#0ED3CF]/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ED3CF]/10 text-[#0ED3CF]">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#0ED3CF]">
                  {categoryLabels[t.category]}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#FAFAFA]">{t.name}</h2>
              <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{t.tagline}</p>
              <p className="mt-3 text-xs text-[#78716C]">For: {t.audience}</p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-[#0ED3CF]">
                Open template
                <ArrowRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
