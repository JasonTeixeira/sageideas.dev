'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import type { ExtendedTier } from '@/data/services/extended'
import { caseStudies } from '@/data/work/case-studies'
import { SectionLabel } from '@/components/section-label'
import { Button } from '@/components/ui/button'
import { GlowCard } from '@/components/glow-card'
import {
  getVisualMeta,
  accentClasses,
  type AccentColor,
} from '@/data/services/visual-meta'
import { ServiceIcon } from '@/components/services/icon'
import { TestimonialCarousel } from '@/components/social-proof/testimonial-carousel'
import { testimonials } from '@/data/social-proof/testimonials'
import { RiskReversal } from '@/components/services/risk-reversal'
import { SampleDeliverable } from '@/components/services/sample-deliverable'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55 },
}

const cadenceLabel: Record<Tier['cadence'], string> = {
  'one-time': 'One-time engagement',
  monthly: 'Monthly retainer',
  custom: 'Custom — starts after discovery',
}

export function TierAPage({ tier }: { tier: Tier | ExtendedTier }) {
  const meta = getVisualMeta(tier.slug)
  const accent = accentClasses[meta.accent]

  const stack = (tier as ExtendedTier).stackChips
  const relatedStudies = caseStudies.filter((cs) =>
    tier.caseStudySlugs.includes(cs.slug)
  )

  // First 3 outcomes drive the "problem statement" framing — the studio
  // already writes outcomes as "what you walk away with", so we reuse them
  // as a problem→outcome bridge. The page reads as: hero, deliverables,
  // outcomes, timeline, FAQ, related work, CTA.

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div
          className={`absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b ${accent.gradient} opacity-60 pointer-events-none`}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div {...fadeUp} className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <Link href="/services" className="hover:text-[#0ED3CF] transition-colors">
                Services
              </Link>
              <span>·</span>
              <span className="text-[#A8A29E] capitalize">{tier.capability}</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl ${accent.iconBg} flex items-center justify-center`}>
                <ServiceIcon name={meta.icon} className={`w-7 h-7 ${accent.text}`} />
              </div>
              <SectionLabel>{cadenceLabel[tier.cadence]}</SectionLabel>
            </div>

            <h1 className="text-5xl sm:text-6xl font-normal text-[#FAFAFA] leading-tight">
              {tier.name}
            </h1>
            <p className={`mt-4 text-xl ${accent.text} font-medium`}>{tier.tagline}</p>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">{tier.description}</p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-normal text-[#FAFAFA]">{tier.price}</span>
                {tier.cadence === 'monthly' && !tier.price.includes('/mo') && (
                  <span className="text-[#78716C] text-sm">/mo</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#A8A29E]">
                <Clock className="w-4 h-4" />
                {tier.timeline}
              </span>
            </div>

            {stack && stack.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {stack.map((chip) => (
                  <span
                    key={chip}
                    className="text-xs font-mono text-[#A8A29E] bg-[#1A1917] border border-[#2A2826] px-2.5 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B]">
                <Link href={tier.ctaHref}>
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#2A2826] text-[#FAFAFA] hover:bg-[#1A1917]">
                <Link href="/contact">Have a question first?</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Deliverables grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionLabel>Deliverables</SectionLabel>
        <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">
          Concrete artifacts you keep.
        </h2>
        <p className="mt-3 text-[#A8A29E] max-w-2xl">
          Every line below ships during the engagement. No “TBDs”, no slide-deck hand-waving —
          working code, written docs, and dashboards your team owns.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tier.deliverables.slice(0, 6).map((d, i) => (
            <motion.div
              key={d}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <GlowCard glowColor="cyan" className="h-full">
                <div className="p-5 flex items-start gap-3">
                  <span
                    className={`w-7 h-7 rounded-md ${accent.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Sparkles className={`w-4 h-4 ${accent.text}`} />
                  </span>
                  <span className="text-sm text-[#FAFAFA] leading-relaxed">{d}</span>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Outcomes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionLabel>What you walk away with</SectionLabel>
        <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">
          The outcome, not just the output.
        </h2>
        <ul className="mt-8 grid md:grid-cols-2 gap-4">
          {tier.outcomes.map((o) => (
            <li
              key={o}
              className="flex items-start gap-3 p-4 rounded-xl border border-[#2A2826] bg-[#1A1917]"
            >
              <Check className={`w-5 h-5 ${accent.text} shrink-0 mt-0.5`} />
              <span className="text-[#FAFAFA] leading-relaxed">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      {tier.phases.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionLabel>Timeline</SectionLabel>
          <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">
            How the engagement runs.
          </h2>
          <div className="mt-10 space-y-3">
            {tier.phases.map((phase, i) => (
              <motion.div
                key={phase.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-[#2A2826] bg-[#1A1917] p-5 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex items-center gap-3 md:w-44 shrink-0">
                  <span
                    className={`w-9 h-9 rounded-full ${accent.iconBg} flex items-center justify-center font-mono text-sm ${accent.text}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">
                    {phase.label}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#FAFAFA]">{phase.title}</h3>
                  <p className="text-sm text-[#A8A29E] mt-1">{phase.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Related case studies */}
      {relatedStudies.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionLabel>Proof</SectionLabel>
          <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">Related case studies</h2>
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {relatedStudies.slice(0, 2).map((cs) => (
              <Link
                key={cs.slug}
                href={`/work/${cs.slug}`}
                className="group rounded-xl border border-[#2A2826] bg-[#1A1917] p-6 hover:border-[#0ED3CF]/40 transition-colors"
              >
                <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
                  Case study
                </span>
                <h3 className="mt-2 text-xl font-semibold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
                  {cs.title}
                </h3>
                <p className="mt-2 text-sm text-[#A8A29E] line-clamp-2">{cs.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#0ED3CF]">
                  Read case study <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sample deliverables */}
      <SampleDeliverable />

      {/* Risk reversal */}
      <RiskReversal />

      {/* Testimonial */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <TestimonialCarousel testimonials={[testimonials[0]]} />
      </section>

      {/* FAQ */}
      {tier.faq.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">Common questions</h2>
          <dl className="mt-8 space-y-4">
            {tier.faq.slice(0, 4).map((f) => (
              <div
                key={f.q}
                className="rounded-xl border border-[#2A2826] bg-[#1A1917] p-5"
              >
                <dt className="text-base font-semibold text-[#FAFAFA]">{f.q}</dt>
                <dd className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-normal text-[#FAFAFA]">Ready to scope {tier.shortName}?</h2>
        <p className="mt-4 text-lg text-[#A8A29E] max-w-2xl mx-auto">
          A 30-minute call to confirm fit, scope, and timeline. No pressure, no slides.
        </p>
        <div className="mt-8 inline-flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B]">
            <Link href={tier.ctaHref}>
              {tier.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#2A2826] text-[#FAFAFA] hover:bg-[#1A1917]">
            <Link href="/services">All services</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs font-mono uppercase tracking-widest text-[#57534E] inline-flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Average reply: 3 hours, business days
        </p>
      </section>
    </div>
  )
}
