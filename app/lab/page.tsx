import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Gauge, Calculator } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { LabGrid } from './lab-grid'
import { labProducts } from '@/data/lab/products'
import { NewsletterSignup } from '@/components/newsletter-signup'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/lab' },
  title: 'The Lab',
  description:
    'Six AI-native products built and operated by Sage Ideas: Nexural, Jobpoise, Trayd, VOZA, Owly, and AlphaStream. These are the businesses we\'d want to run.',
  openGraph: {
    title: 'The Lab',
    description:
      'Six AI-native products built and operated by Sage Ideas: Nexural, Jobpoise, Trayd, VOZA, Owly, and AlphaStream.',
    images: ['/og?title=The+Lab.&subtitle=Built+here+first.'],
  },
}

export default function LabPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero */}
        <section className="mb-20">
          <SectionLabel>Products</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-normal text-[#FAFAFA] tracking-tight">
            The Lab.
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">
            Where we build the things we&apos;d want to use.
          </p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">
            The Lab is Sage Ideas&apos; product portfolio — not client work, not concept pieces, but live software built, maintained, and operated by the studio. Every product here started as a genuine itch. Every one of them has influenced a service offering or infrastructure pattern.
          </p>
          <p className="mt-3 text-[#78716C] max-w-2xl leading-relaxed">
            When we say &ldquo;we build what we operate,&rdquo; the Lab is the proof.
          </p>
        </section>

        {/* Free tools */}
        <section className="mb-20">
          <SectionLabel>Free tools</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-normal text-[#FAFAFA] tracking-tight">
            Try before you talk to us.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/lab/ai-readiness"
              className="group rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 transition-all hover:border-[#0ED3CF]/50 hover:bg-[#0ED3CF]/5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0ED3CF]/10 text-[#0ED3CF]">
                  <Gauge className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#FAFAFA]">AI Readiness Score</h3>
                    <ArrowRight className="h-4 w-4 text-[#57534E] transition-all group-hover:translate-x-1 group-hover:text-[#0ED3CF]" />
                  </div>
                  <p className="mt-1 text-sm text-[#A8A29E]">
                    10-question diagnostic across data, infra, process, talent, and ROI clarity. Personalized next step.
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/lab/calculators"
              className="group rounded-2xl border border-[#2A2826] bg-[#1A1917] p-6 transition-all hover:border-[#0ED3CF]/50 hover:bg-[#0ED3CF]/5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0ED3CF]/10 text-[#0ED3CF]">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#FAFAFA]">ROI calculators</h3>
                    <ArrowRight className="h-4 w-4 text-[#57534E] transition-all group-hover:translate-x-1 group-hover:text-[#0ED3CF]" />
                  </div>
                  <p className="mt-1 text-sm text-[#A8A29E]">
                    Five interactive estimates: AI SDR, support agent, RAG, voice, churn prediction.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Newsletter */}
        <section className="mb-20">
          <NewsletterSignup source="lab" />
        </section>

        {/* Product grid */}
        <section>
          <SectionLabel>Products</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-normal text-[#FAFAFA] tracking-tight">
            Things we built and run ourselves.
          </h2>
          <div className="mt-8">
            <LabGrid products={labProducts} />
          </div>
        </section>
      </div>
    </div>
  )
}
