'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock } from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import type { ExtendedTier } from '@/data/services/extended'
import { SectionLabel } from '@/components/section-label'
import { Button } from '@/components/ui/button'
import {
  getVisualMeta,
  accentClasses,
} from '@/data/services/visual-meta'
import { ServiceIcon } from '@/components/services/icon'

export function TierCPage({ tier }: { tier: Tier | ExtendedTier }) {
  const meta = getVisualMeta(tier.slug)
  const accent = accentClasses[meta.accent]
  const ctaLabel = tier.cadence === 'monthly' ? 'Start subscription' : 'Buy / Start'

  return (
    <div className="min-h-screen bg-[#09090B]">
      <section className="relative pt-24 pb-12">
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div
          className={`absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b ${accent.gradient} opacity-40 pointer-events-none`}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-5 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <Link href="/services" className="hover:text-[#0ED3CF] transition-colors">
                Services
              </Link>
              <span>·</span>
              <span className="text-[#A8A29E] capitalize">{tier.capability}</span>
            </div>

            <SectionLabel>Productized</SectionLabel>

            <div className="mt-3 flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${accent.iconBg} flex items-center justify-center shrink-0`}>
                <ServiceIcon name={meta.icon} className={`w-7 h-7 ${accent.text}`} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] leading-tight">
                  {tier.name}
                </h1>
                <p className={`mt-2 ${accent.text} font-medium`}>{tier.tagline}</p>
              </div>
            </div>
          </motion.div>

          {/* Productized card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`mt-8 rounded-2xl border ${accent.borderStrong} bg-[#1A1917] p-6 sm:p-8 ${accent.glow}`}
          >
            <p className="text-[#A8A29E] leading-relaxed">{tier.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#FAFAFA]">{tier.price}</span>
              {tier.cadence === 'monthly' && !tier.price.includes('/mo') && (
                <span className="text-[#78716C] text-sm">/mo</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {tier.timeline}
              </span>
              {tier.cadence === 'monthly' && <span>· Monthly retainer</span>}
              {tier.cadence === 'one-time' && <span>· One-time</span>}
            </div>

            <div className="mt-6 border-t border-[#2A2826] pt-6">
              <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">
                What&apos;s included
              </span>
              <ul className="mt-4 space-y-3">
                {tier.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 ${accent.text} shrink-0 mt-1`} />
                    <span className="text-sm text-[#FAFAFA] leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B]">
                <Link href={tier.ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#2A2826] text-[#FAFAFA] hover:bg-[#1A1917]">
                <Link href="/services">All services</Link>
              </Button>
            </div>
          </motion.div>

          {/* Quick FAQ if exists */}
          {tier.faq.length > 0 && (
            <div className="mt-10">
              <SectionLabel>FAQ</SectionLabel>
              <dl className="mt-4 space-y-3">
                {tier.faq.slice(0, 2).map((f) => (
                  <div
                    key={f.q}
                    className="rounded-xl border border-[#2A2826] bg-[#12110F] p-4"
                  >
                    <dt className="text-sm font-semibold text-[#FAFAFA]">{f.q}</dt>
                    <dd className="mt-1.5 text-sm text-[#A8A29E] leading-relaxed">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
