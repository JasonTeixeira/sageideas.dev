'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, AlertTriangle, Briefcase, Tag } from 'lucide-react'
import type { Vertical } from '@/data/industries/verticals'
import { tiersBySlug } from '@/data/services/tiers'
import { caseStudies } from '@/data/work/case-studies'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { Button } from '@/components/ui/button'

// Maps vertical slug → lowercase phrase used in body copy (e.g. "the SaaS stack").
// Kept here so /toLowerCase()/ doesn't garble proper nouns like "SaaS" or compound names.
const STACK_PHRASE: Record<string, string> = {
  fintech: 'fintech',
  saas: 'SaaS',
  ecommerce: 'e-commerce',
  healthcare: 'healthcare',
  'ai-startups': 'AI',
}

export function IndustryPageContent({ vertical: v }: { vertical: Vertical }) {
  const tiers = v.recommendedTiers
    .map((slug) => tiersBySlug[slug])
    .filter(Boolean)

  const studies = caseStudies.filter((cs) =>
    v.relevantCaseStudySlugs.includes(cs.slug)
  )

  const stackPhrase = STACK_PHRASE[v.slug] ?? v.shortName

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <Link
                href="/industries"
                className="hover:text-[#0ED3CF] transition-colors"
              >
                Industries
              </Link>
              <span>·</span>
              <span className="text-[#0ED3CF]">{v.shortName}</span>
            </div>

            <SectionLabel>Industry</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight">
              {v.heroH1}
            </h1>
            <p className="mt-3 text-xl text-[#0ED3CF] font-medium">{v.tagline}</p>
            <p className="mt-4 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              {v.intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold"
              >
                <Link href={`/book?industry=${v.slug}`}>
                  Book a Discovery Call
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
              >
                <Link href="/services">
                  Browse all services
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">
        {/* Why us */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Why us</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
            Why Sage Ideas for {v.shortName}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {v.whyUs.map((bullet, i) => (
              <motion.div
                key={bullet}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-3 p-5 rounded-xl bg-[#12110F] border border-[#2A2826]"
              >
                <div className="w-6 h-6 rounded-full bg-[#0ED3CF]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                </div>
                <span className="text-[#A8A29E] leading-relaxed text-sm">
                  {bullet}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Challenges */}
        {v.challenges.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <SectionLabel>Challenges</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              What we solve
            </h2>
            <p className="text-[#A8A29E] mb-8 max-w-2xl">
              The specific operational challenges we&apos;ve already debugged in the{' '}
              {stackPhrase} stack.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {v.challenges.map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-5 hover:border-[#E85D3A]/30 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#E85D3A]/10 border border-[#E85D3A]/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#E85D3A]" />
                    </div>
                    <h3 className="font-semibold text-[#FAFAFA] leading-tight pt-1">
                      {c.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">
                    {c.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Recommended tiers */}
        {tiers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <SectionLabel>Engagements</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              Recommended tiers
            </h2>
            <p className="text-[#A8A29E] mb-8 max-w-2xl">
              Productized engagements ordered by relevance to{' '}
              {v.shortName.toLowerCase()} workloads.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier, i) => (
                <motion.div
                  key={tier.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                >
                  <GlowCard
                    glowColor={tier.highlight ? 'gradient' : 'cyan'}
                    className="h-full"
                  >
                    <Link
                      href={`/services/${tier.slug}`}
                      className="block p-5 h-full flex flex-col group"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-bold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
                          {tier.name}
                        </h3>
                        {tier.highlight && (
                          <span className="text-[10px] font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 px-1.5 py-0.5 rounded shrink-0">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#A8A29E] leading-snug mb-4 flex-1">
                        {tier.tagline}
                      </p>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold text-[#FAFAFA]">
                          {tier.price}
                        </span>
                        {tier.cadence === 'monthly' && (
                          <span className="text-[#78716C] text-xs">/mo</span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#78716C] mb-3">
                        {tier.timeline}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0ED3CF] mt-auto">
                        View tier
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  </GlowCard>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Related case studies */}
        {studies.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <SectionLabel>Proof</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
              Relevant work
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {studies.map((cs, i) => (
                <motion.div
                  key={cs.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                >
                  <Link
                    href={`/work/${cs.slug}`}
                    className="block h-full rounded-xl bg-[#12110F] border border-[#2A2826] p-6 hover:border-[#0ED3CF]/40 transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-[#0ED3CF]" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">
                          {cs.category}
                        </span>
                        <h3 className="font-semibold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors mt-0.5 leading-tight">
                          {cs.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-[#A8A29E] leading-relaxed mb-3">
                      {cs.tagline}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-[#0ED3CF]">
                      Read case study
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* FAQ */}
        {v.faq.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
              {v.shortName} questions
            </h2>
            <div className="space-y-4">
              {v.faq.map((item, i) => (
                <motion.div
                  key={item.q}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-6"
                >
                  <h3 className="text-[#FAFAFA] font-semibold mb-2">{item.q}</h3>
                  <p className="text-[#A8A29E] leading-relaxed text-sm">
                    {item.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Keywords (subtle, for SEO + trust) */}
        {v.keywords.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[#78716C]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#78716C] mr-2">
                Topics
              </span>
              {v.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs font-mono text-[#A8A29E] bg-[#1A1917] border border-[#2A2826] px-2 py-0.5 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl bg-gradient-to-br from-[#0ED3CF]/10 via-[#12110F] to-[#E85D3A]/10 border border-[#0ED3CF]/20 p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-3">
            {v.ctaLine}
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-lg mx-auto">
            Book a 30-minute discovery call. We&apos;ll talk through your{' '}
            {stackPhrase} stack and tell you directly which engagement
            — if any — is the right fit.
          </p>
          <Link
            href={`/book?industry=${v.slug}`}
            className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Book a Discovery Call
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
