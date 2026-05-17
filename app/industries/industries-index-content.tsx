'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Banknote,
  Cloud,
  ShoppingBag,
  HeartPulse,
  Sparkles,
} from 'lucide-react'
import type { Vertical } from '@/data/industries/verticals'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'

const verticalIcons: Record<string, typeof Banknote> = {
  fintech: Banknote,
  saas: Cloud,
  ecommerce: ShoppingBag,
  healthcare: HeartPulse,
  'ai-startups': Sparkles,
}

export function IndustriesIndexContent({
  verticals,
}: {
  verticals: readonly Vertical[]
}) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-25" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <SectionLabel>Industries</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight">
              Five verticals.{' '}
              <span className="text-[#0ED3CF]">Operator-grade execution.</span>
            </h1>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              {
                'Sage Ideas works deepest where we have shipped real software — fintech, SaaS, ecommerce, healthcare, and AI-native startups. Each industry page maps our productized tiers to the operational realities of the vertical: compliance, integration depth, regulatory edges, and the specific failure modes we have already debugged.'
              }
            </p>
          </motion.div>
        </div>
      </section>

      {/* Vertical grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Where we go deep</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">
            Pick your industry
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {verticals.map((v, i) => {
              const Icon = verticalIcons[v.slug] ?? Sparkles
              return (
                <motion.div
                  key={v.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                >
                  <GlowCard glowColor="cyan" className="h-full">
                    <Link
                      href={`/industries/${v.slug}`}
                      className="block p-6 h-full flex flex-col group"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-11 h-11 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-[#0ED3CF]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors leading-tight">
                            {v.name}
                          </h3>
                          <p className="text-sm text-[#0ED3CF]/80 mt-0.5">
                            {v.tagline}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[#A8A29E] leading-relaxed mb-4 flex-1">
                        {v.intro.length > 220
                          ? v.intro.slice(0, 220).trimEnd() + '…'
                          : v.intro}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm text-[#0ED3CF] font-medium mt-auto">
                        Explore {v.shortName}
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </GlowCard>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl bg-gradient-to-br from-[#0ED3CF]/10 via-[#12110F] to-[#E85D3A]/10 border border-[#0ED3CF]/20 p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-3">
            Industry not listed?
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-lg mx-auto">
            Sage Ideas works with most B2B verticals. Book a 30-minute call and we
            will tell you directly whether we&apos;re the right fit — or who is.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Book a Discovery Call
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
