import type { Metadata } from 'next'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Archive } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { WorkGrid } from './work-grid'
import { caseStudies } from '@/data/work/case-studies'
import { PageHeroBg } from '@/components/page-hero-bg'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.sageideas.dev/work' },
  title: 'Work',
  description:
    'Six production case studies from Sage Ideas: fintech platforms, ML signal engines, AI-native products, infrastructure, and developer tooling. Real work, real outcomes.',
  openGraph: {
    title: 'Work',
    description:
      'Six production case studies from Sage Ideas: fintech platforms, ML signal engines, AI-native products, infrastructure, and developer tooling. Real work, real outcomes.',
    images: ['/og?title=The+work+speaks.&subtitle=Six+production+case+studies'],
  },
}

export default function WorkPage() {
  return (
    <div className="relative min-h-screen bg-[#09090B]">
          <PageHeroBg src="/images/hero-work.jpg" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero */}
        <section className="mb-20">
          <div>
            <SectionLabel>Case Studies</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-normal text-[#FAFAFA] tracking-tight">
              The work speaks.
            </h1>
            <p className="mt-6 text-xl text-[#A8A29E] max-w-2xl">
              Selected engagements across fintech, trades tech, edtech, developer tooling, and cloud infrastructure. Each project shipped production code, served real users, and went through a complete engineering lifecycle.
            </p>
            <p className="mt-4 text-[#78716C] max-w-2xl">
              These aren&apos;t redesigns or MVPs handed off to another team. These are products the studio built, launched, and continues to operate. The architecture decisions, the test suites, the CI pipelines, the deployment playbooks — all of it is in here.
            </p>
          </div>
        </section>

        {/* Work grid with filter */}
        <section className="mb-24">
          <WorkGrid studies={caseStudies} />
        </section>

        {/* Archive callout */}
        <section>
          <GlowCard className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2.5 rounded-lg bg-[#2A2826]">
                  <Archive className="w-5 h-5 text-[#A8A29E]" />
                </div>
                <div>
                  <h3 className="text-[#FAFAFA] font-semibold text-lg">More projects in the archive</h3>
                  <p className="mt-1 text-[#78716C] text-sm max-w-md">
                    Explore the full 23-project catalog — open-source tooling, infrastructure modules, product experiments, and client work.
                  </p>
                </div>
              </div>
              <Link
                href="/work"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#2A2826] text-[#A8A29E] text-sm font-medium hover:border-[#0ED3CF]/50 hover:text-[#FAFAFA] transition-all duration-200"
              >
                Browse the archive <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </GlowCard>
        </section>
      </div>
    </div>
  )
}
