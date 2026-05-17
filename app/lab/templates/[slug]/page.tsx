import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { templates, categoryLabels } from '@/data/lab/templates'
import { TemplateActions } from './template-actions'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return templates.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = templates.find((x) => x.slug === slug)
  if (!t) return {}
  return {
    alternates: { canonical: `https://www.sageideas.dev/lab/templates/${t.slug}` },
    title: `${t.name} — Free template | Sage Ideas`,
    description: t.description,
    openGraph: {
      title: `${t.name} — Free template | Sage Ideas`,
      description: t.description,
      images: [
        `/og?title=${encodeURIComponent(t.name)}&subtitle=${encodeURIComponent(t.tagline)}`,
      ],
    },
  }
}

export default async function TemplateDetailPage({ params }: Props) {
  const { slug } = await params
  const t = templates.find((x) => x.slug === slug)
  if (!t) notFound()

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Link
          href="/lab/templates"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#78716C] hover:text-[#FAFAFA] transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          All templates
        </Link>

        <header className="mb-10">
          <SectionLabel>{categoryLabels[t.category]}</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl font-normal text-[#FAFAFA] tracking-tight">
            {t.name}
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E]">{t.tagline}</p>
          <p className="mt-4 text-[#78716C] leading-relaxed">{t.description}</p>
          <p className="mt-3 text-sm text-[#78716C]">
            <span className="font-mono">For:</span> {t.audience}
          </p>
        </header>

        <div className="mb-8">
          <TemplateActions body={t.body} filename={t.filename} />
        </div>

        <article className="rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2826]">
            <span className="text-xs font-mono text-[#78716C]">{t.filename}</span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#57534E]">
              {t.format}
            </span>
          </div>
          <pre className="text-sm text-[#E4E4E7] font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {t.body}
          </pre>
        </article>

        <div className="mt-12 rounded-2xl border border-[#0ED3CF]/30 bg-gradient-to-br from-[#0ED3CF]/10 to-transparent p-6 sm:p-8">
          <p className="text-[#FAFAFA] leading-relaxed">
            Need help applying this to your stack? We will scope it in a 30-minute call and tell
            you whether it is the right starting point.
          </p>
          <Link
            href="/contact?engagement=ai-readiness-assessment"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0ED3CF] px-5 py-3 text-sm font-medium text-[#09090B] transition-all hover:bg-[#0AA8A5]"
          >
            Talk to Sage
          </Link>
        </div>
      </div>
    </div>
  )
}
