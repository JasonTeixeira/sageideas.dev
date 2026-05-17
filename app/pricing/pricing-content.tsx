'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Lock } from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { CheckoutButton } from '@/components/studio/checkout-button'
import { CareCheckoutButton } from '@/components/studio/care-checkout-button'
import { careTiers } from '@/data/services/tiers'
import { RefreshCw, Sparkles } from 'lucide-react'
import { pricingFaq } from '@/data/services/pricing-faq'

const tableColumns = [
  { label: 'Tier', key: 'name' },
  { label: 'Price', key: 'price' },
  { label: 'Timeline', key: 'timeline' },
  { label: 'Best for', key: 'bestFor' },
]

const bestForMap: Record<string, string> = {
  audit: "Teams who suspect they're leaving velocity on the table",
  ship: 'Founders who need a production marketing site fast',
  automate: 'Ops teams drowning in a manual workflow',
  'seo-sprint': 'Sites with traffic potential they have never tapped',
  'content-engine': 'B2B teams ready to commit to long-form content as a channel',
  'brand-sprint': 'Founders shipping a real brand identity in two weeks',
  scale: 'Growing businesses investing in long-term organic traffic',
  build: 'Founders building a full-stack product from scratch',
  operate: 'Post-launch teams that need ongoing engineering leadership',
}

export function PricingContent({ tiers }: { tiers: readonly Tier[] }) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-25" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <SectionLabel>Pricing</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight">
              Three lanes.{' '}
              <span className="text-[#0ED3CF]">No asterisks.</span>
            </h1>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              Pick the lane that matches the shape of the work. Productized
              tiers are fixed-scope, fixed-price, Stripe checkout. Care plans
              keep what you already shipped quietly running. Studio Engagement
              is the embedded option — by application, quarterly minimum.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 text-[#0ED3CF]">
                Productized — fixed price
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#E85D3A]/10 border border-[#E85D3A]/30 text-[#E85D3A]">
                <RefreshCw className="w-3 h-3" /> Care retainers — from $300/mo
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#2A2826] border border-[#3D3A37] text-[#FAFAFA]">
                <Lock className="w-3 h-3" /> Studio Engagement — from $25k / quarter
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lane chooser */}
      <section className="border-y border-[#2A2826] bg-[#0B0A09]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionLabel>Choose a lane</SectionLabel>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-2">
            Three ways to engage. One studio behind all of them.
          </h2>
          <p className="text-[#A8A29E] mb-10 max-w-2xl">
            Click the lane that matches your moment. Each one ships against the
            same standards — the difference is depth, scope, and how the
            relationship runs.
          </p>
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Lane 1 — Productized */}
            <Link
              href="#productized"
              className="group rounded-2xl border border-[#0ED3CF]/30 bg-gradient-to-br from-[#0ED3CF]/[0.05] to-transparent p-6 hover:border-[#0ED3CF]/60 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#0ED3CF]">
                  Lane 01 — Productized
                </div>
                <ArrowRight className="w-4 h-4 text-[#0ED3CF] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-3xl font-bold text-[#FAFAFA] mb-2">$750 — $9,500+</div>
              <p className="text-sm text-[#A8A29E] leading-relaxed mb-4 flex-1">
                Ten fixed-scope engagements. Pick a tier, see the deliverables,
                check out on Stripe. Best for one-off projects with a clear
                shape.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Audit', 'Ship', 'Automate', 'SEO Sprint', 'Brand', 'Build'].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="text-[10px] font-mono uppercase tracking-wider text-[#78716C] bg-[#0B0A09] border border-[#2A2826] rounded px-2 py-0.5"
                    >
                      {chip}
                    </span>
                  ),
                )}
              </div>
            </Link>

            {/* Lane 2 — Care */}
            <Link
              href="#care"
              className="group rounded-2xl border border-[#E85D3A]/30 bg-gradient-to-br from-[#E85D3A]/[0.05] to-transparent p-6 hover:border-[#E85D3A]/60 transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#E85D3A]">
                  Lane 02 — Care retainers
                </div>
                <ArrowRight className="w-4 h-4 text-[#E85D3A] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-3xl font-bold text-[#FAFAFA] mb-2">
                $300 — $800<span className="text-base text-[#78716C] font-normal">/mo</span>
              </div>
              <p className="text-sm text-[#A8A29E] leading-relaxed mb-4 flex-1">
                Lightweight monthly upkeep on something you already shipped.
                Site, brand, content. Cancel anytime through Stripe.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Site Care', 'Brand Care', 'Content Care'].map((chip) => (
                  <span
                    key={chip}
                    className="text-[10px] font-mono uppercase tracking-wider text-[#78716C] bg-[#0B0A09] border border-[#2A2826] rounded px-2 py-0.5"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </Link>

            {/* Lane 3 — Studio Engagement */}
            <Link
              href="/services/studio-engagement"
              className="group relative rounded-2xl border border-[#FAFAFA]/20 bg-gradient-to-br from-[#FAFAFA]/[0.04] via-[#0ED3CF]/[0.04] to-[#E85D3A]/[0.04] p-6 hover:border-[#FAFAFA]/40 transition-colors flex flex-col overflow-hidden"
            >
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#FAFAFA] bg-[#09090B] border border-[#2A2826] rounded-full px-2 py-1">
                <Lock className="w-3 h-3" /> By application
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FAFAFA]">
                  Lane 03 — Studio Engagement
                </div>
              </div>
              <div className="text-3xl font-bold text-[#FAFAFA] mb-2">
                From $25k<span className="text-base text-[#78716C] font-normal"> / quarter</span>
              </div>
              <p className="text-sm text-[#A8A29E] leading-relaxed mb-4 flex-1">
                The studio embedded for a quarter. End-to-end product build,
                weekly changelog, 90-day operate window. Three slots a year.
              </p>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0ED3CF]">
                See the engagement <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div id="productized" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 space-y-24">
        {/* Comparison Table */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Comparison</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-6">All tiers at a glance</h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-[#2A2826] bg-[#12110F]">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-[#2A2826]">
              {tableColumns.map((col) => (
                <div
                  key={col.key}
                  className="px-5 py-3 text-xs font-mono uppercase tracking-widest text-[#78716C]"
                >
                  {col.label}
                </div>
              ))}
            </div>
            {/* Data rows */}
            {tiers.map((tier, i) => (
              <Link
                key={tier.slug}
                href={`/services/${tier.slug}`}
                className={`grid grid-cols-4 items-center hover:bg-[#1A1917] transition-colors group ${
                  i < tiers.length - 1 ? 'border-b border-[#2A2826]/60' : ''
                }`}
              >
                <div className="px-5 py-4 flex items-center gap-2">
                  <span className="font-semibold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
                    {tier.name}
                  </span>
                  {tier.highlight && (
                    <span className="text-xs text-[#0ED3CF] font-mono bg-[#0ED3CF]/10 px-1.5 py-0.5 rounded">
                      Popular
                    </span>
                  )}
                </div>
                <div className="px-5 py-4 font-mono font-semibold text-[#FAFAFA]">
                  {tier.price}
                  {tier.cadence === 'monthly' && (
                    <span className="text-[#78716C] text-xs">/mo</span>
                  )}
                </div>
                <div className="px-5 py-4 text-[#A8A29E] text-sm">{tier.timeline}</div>
                <div className="px-5 py-4 text-[#78716C] text-sm flex items-center gap-1.5">
                  <span className="flex-1">{bestForMap[tier.slug]}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#0ED3CF]" />
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/services/${tier.slug}`}
                  className="block rounded-xl border border-[#2A2826] bg-[#12110F] p-4 hover:border-[#0ED3CF]/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-[#FAFAFA]">{tier.name}</span>
                    <span className="font-mono font-bold text-[#FAFAFA] text-sm">
                      {tier.price}
                      {tier.cadence === 'monthly' && (
                        <span className="text-[#78716C] text-xs">/mo</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[#78716C] text-sm">{bestForMap[tier.slug]}</p>
                  <p className="text-[#78716C] text-xs mt-1 font-mono">{tier.timeline}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tier cards with CTAs */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Tiers</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">
            Choose your engagement
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <GlowCard
                  glowColor={tier.highlight ? 'gradient' : 'cyan'}
                  className={`h-full flex flex-col ${tier.highlight ? 'border-[#0ED3CF]/40' : ''}`}
                >
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-[#FAFAFA]">{tier.name}</h3>
                      {tier.highlight && (
                        <span className="text-xs font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#A8A29E] mb-4">{tier.tagline}</p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-[#FAFAFA]">{tier.price}</span>
                      {tier.cadence === 'monthly' && (
                        <span className="text-[#78716C] text-sm">/mo</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-6 flex-1">
                      {tier.outcomes.slice(0, 2).map((o) => (
                        <li key={o} className="flex items-start gap-2 text-sm text-[#A8A29E]">
                          <Check className="w-3.5 h-3.5 text-[#0ED3CF] shrink-0 mt-0.5" />
                          {o}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2 mt-auto">
                      <CheckoutButton tier={tier} />
                      <Link
                        href={`/services/${tier.slug}`}
                        className="text-center text-sm text-[#78716C] hover:text-[#0ED3CF] transition-colors"
                      >
                        View full details →
                      </Link>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Care retainers */}
        <motion.section
          id="care"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="scroll-mt-24"
        >
          <SectionLabel>Care retainers</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-2">
            Monthly care plans
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-2xl">
            Lightweight monthly retainers for teams who already have something in market.
            Cancel anytime through Stripe.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {careTiers.map((c, i) => (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border border-[#E85D3A]/20 bg-gradient-to-br from-[#E85D3A]/[0.04] to-transparent p-6 flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-3.5 h-3.5 text-[#E85D3A]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#E85D3A]">
                    Retainer
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA] mb-1">{c.name}</h3>
                <div className="text-2xl font-bold text-[#FAFAFA] mb-3">
                  {c.price}
                  <span className="text-sm text-[#78716C] font-normal">/mo</span>
                </div>
                <p className="text-sm text-[#A8A29E] leading-snug mb-4">{c.tagline}</p>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {c.outcomes.slice(0, 3).map((o) => (
                    <li
                      key={o}
                      className="flex items-start gap-1.5 text-xs text-[#A8A29E]"
                    >
                      <Check className="w-3 h-3 text-[#E85D3A] mt-0.5 shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                  <CareCheckoutButton care={c} variant="primary" />
                  <Link
                    href={`/services/${c.slug}`}
                    className="text-xs font-mono text-[#A8A29E] hover:text-[#FAFAFA] transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Studio Engagement — Lane 03 deep dive */}
        <motion.section
          id="studio-engagement"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="scroll-mt-24 relative overflow-hidden rounded-3xl border border-[#FAFAFA]/15 bg-gradient-to-br from-[#0ED3CF]/[0.06] via-[#12110F] to-[#E85D3A]/[0.06] p-8 sm:p-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(6,182,212,0.10),transparent_55%),radial-gradient(circle_at_85%_85%,rgba(139,92,246,0.10),transparent_55%)] pointer-events-none" />
          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FAFAFA]/20 bg-[#09090B]/60 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#FAFAFA] mb-5">
                <Lock className="w-3 h-3" /> Lane 03 — By application only
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4 tracking-tight leading-tight">
                Studio Engagement.
                <br />
                One quarter, one keyboard.
              </h2>
              <p className="text-[#A8A29E] text-lg leading-relaxed mb-6 max-w-xl">
                For founders who don&rsquo;t want a vendor &mdash; they want
                the studio embedded. Twelve weeks minimum, weekly changelog,
                90-day operate window, the full architecture-discipline
                playbook. Custom-quoted from a fixed scope.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/services/studio-engagement"
                  className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  See the engagement <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact?type=studio&source=pricing"
                  className="inline-flex items-center gap-2 border border-[#2A2826] hover:border-[#FAFAFA]/40 text-[#FAFAFA] px-5 py-2.5 rounded-lg transition-colors"
                >
                  Apply for a quarter
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="rounded-xl border border-[#2A2826] bg-[#09090B]/60 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-1">
                  Investment
                </div>
                <div className="text-xl font-bold text-[#FAFAFA]">From $25k / quarter</div>
              </div>
              <div className="rounded-xl border border-[#2A2826] bg-[#09090B]/60 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-1">
                  Cadence
                </div>
                <div className="text-xl font-bold text-[#FAFAFA]">12 weeks min.</div>
              </div>
              <div className="rounded-xl border border-[#2A2826] bg-[#09090B]/60 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-1">
                  Capacity
                </div>
                <div className="text-xl font-bold text-[#FAFAFA]">3 slots / year</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Custom packages — fallback */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-8 sm:p-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#A8A29E]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">
              None of the lanes fit?
            </span>
          </div>
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">
            Custom packages on request.
          </h2>
          <p className="text-[#A8A29E] max-w-2xl leading-relaxed mb-6">
            Hybrid sprints, multi-month builds, specific-deliverable retainers,
            monthly content + brand combos. Transparent quotes, fixed prices,
            no asterisks.
          </p>
          <Link
            href="/contact?type=project&source=pricing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FAFAFA] hover:text-[#0ED3CF] transition-colors"
          >
            Talk to Sage about custom scope <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.section>

        {/* Pricing FAQ */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">Pricing questions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {pricingFaq.map((item, i) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl bg-[#12110F] border border-[#2A2826] p-6"
              >
                <h3 className="font-semibold text-[#FAFAFA] mb-2 text-sm">{item.q}</h3>
                <p className="text-[#78716C] text-sm leading-relaxed">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-8 sm:p-12 text-center"
        >
          <p className="text-[#78716C] text-sm font-mono uppercase tracking-widest mb-3">
            Still not sure?
          </p>
          <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">
            Book a free 30-minute call.
          </h2>
          <p className="text-[#A8A29E] max-w-md mx-auto mb-6 text-sm">
            No pitch deck, no obligation. We&apos;ll talk through your project and tell you
            directly which engagement — if any — is the right fit.
          </p>
          <Link
            href="/book"
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
