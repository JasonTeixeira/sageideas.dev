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
import { TestimonialCarousel } from '@/components/social-proof/testimonial-carousel'
import { testimonials } from '@/data/social-proof/testimonials'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export function TierBPage({ tier }: { tier: Tier | ExtendedTier }) {
  const meta = getVisualMeta(tier.slug)
  const accent = accentClasses[meta.accent]
  const stack = (tier as ExtendedTier).stackChips

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-12">
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div
          className={`absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b ${accent.gradient} opacity-50 pointer-events-none`}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div {...fadeUp}>
            <div className="flex items-center gap-2 mb-5 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <Link href="/services" className="hover:text-[#0ED3CF] transition-colors">
                Services
              </Link>
              <span>·</span>
              <span className="text-[#A8A29E] capitalize">{tier.capability}</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl ${accent.iconBg} flex items-center justify-center`}>
                <ServiceIcon name={meta.icon} className={`w-6 h-6 ${accent.text}`} />
              </div>
              <SectionLabel>Standard engagement</SectionLabel>
            </div>

            <h1 className="text-4xl sm:text-5xl font-normal text-[#FAFAFA] leading-tight">
              {tier.name}
            </h1>
            <p className={`mt-3 text-lg ${accent.text} font-medium`}>{tier.tagline}</p>
            <p className="mt-5 text-[#A8A29E] leading-relaxed max-w-2xl">{tier.description}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#FAFAFA]">{tier.price}</span>
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
              <div className="mt-5 flex flex-wrap gap-2">
                {stack.slice(0, 6).map((chip) => (
                  <span
                    key={chip}
                    className="text-xs font-mono text-[#A8A29E] bg-[#1A1917] border border-[#2A2826] px-2.5 py-1 rounded-full"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B]">
                <Link href={tier.ctaHref}>
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-[#2A2826] text-[#FAFAFA] hover:bg-[#1A1917]">
                <Link href="/services">All services</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Deliverables (3) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionLabel>Deliverables</SectionLabel>
        <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">What ships during the engagement.</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {tier.deliverables.slice(0, 3).map((d, i) => (
            <motion.div
              key={d}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-[#2A2826] bg-[#1A1917] p-5"
            >
              <span
                className={`inline-flex w-7 h-7 rounded-md ${accent.iconBg} items-center justify-center mb-3`}
              >
                <Check className={`w-4 h-4 ${accent.text}`} />
              </span>
              <p className="text-sm text-[#FAFAFA] leading-relaxed">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Outcomes (3) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SectionLabel>Outcomes</SectionLabel>
        <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">What you walk away with.</h2>
        <ul className="mt-8 grid md:grid-cols-3 gap-3">
          {tier.outcomes.slice(0, 3).map((o) => (
            <li
              key={o}
              className="flex items-start gap-3 p-4 rounded-xl border border-[#2A2826] bg-[#12110F]"
            >
              <Check className={`w-4 h-4 ${accent.text} shrink-0 mt-1`} />
              <span className="text-sm text-[#FAFAFA] leading-relaxed">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonial */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TestimonialCarousel testimonials={[testimonials[1]]} />
      </section>

      {/* FAQ (2) */}
      {tier.faq.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <SectionLabel>FAQ</SectionLabel>
          <dl className="mt-6 space-y-3">
            {tier.faq.slice(0, 2).map((f) => (
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
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-normal text-[#FAFAFA]">Want to scope {tier.shortName}?</h2>
        <p className="mt-3 text-[#A8A29E]">
          A short call to confirm fit and timeline.
        </p>
        <div className="mt-6">
          <Button asChild size="lg" className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B]">
            <Link href={tier.ctaHref}>
              {tier.cta}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
