'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowRight, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const tiers = [
  {
    name: 'Sage Audit',
    price: '$1,500',
    cadence: 'one-time',
    timeline: '5 business days',
    description: 'A surgical review of your codebase, architecture, and infrastructure with a prioritized action plan.',
    cta: 'Start with an Audit',
    ctaHref: '/services/audit',
    accent: '#0ED3CF',
    popular: false,
    premium: false,
    features: {
      'Codebase review': true,
      'Architecture assessment': true,
      'CI/CD audit': true,
      'Security scan': true,
      'Written report': true,
      'Implementation': false,
      'Test suite': false,
      'Post-launch support': false,
      'Weekly syncs': false,
      'Dedicated Slack': false,
      'Priority SLA': false,
    },
  },
  {
    name: 'Sage Build',
    price: '$4,900',
    cadence: 'one-time',
    timeline: '2–4 weeks',
    description: 'Full implementation of a scoped project — code, tests, CI/CD, staging deploy, and documentation.',
    cta: 'Book a Build',
    ctaHref: '/services/build',
    accent: '#0ED3CF',
    popular: true,
    premium: false,
    features: {
      'Codebase review': true,
      'Architecture assessment': true,
      'CI/CD audit': true,
      'Security scan': true,
      'Written report': true,
      'Implementation': true,
      'Test suite': true,
      'Post-launch support': true,
      'Weekly syncs': false,
      'Dedicated Slack': false,
      'Priority SLA': false,
    },
  },
  {
    name: 'Studio Engagement',
    price: 'From $25k',
    cadence: '/quarter',
    timeline: 'Ongoing',
    description: 'Embedded engineering with architecture ownership, priority SLA, and a dedicated channel. By application.',
    cta: 'Apply for Studio',
    ctaHref: '/services/studio-engagement',
    accent: '#C7236E',
    popular: false,
    premium: true,
    features: {
      'Codebase review': true,
      'Architecture assessment': true,
      'CI/CD audit': true,
      'Security scan': true,
      'Written report': true,
      'Implementation': true,
      'Test suite': true,
      'Post-launch support': true,
      'Weekly syncs': true,
      'Dedicated Slack': true,
      'Priority SLA': true,
    },
  },
]

const featureLabels = Object.keys(tiers[0].features)

const faqs = [
  {
    q: 'What if my project is bigger than a Build?',
    a: 'We scope every engagement before kickoff. If it needs more than 4 weeks, we either break it into phases or recommend a Studio Engagement with quarterly commitment.',
  },
  {
    q: 'Do you offer monthly retainers?',
    a: 'Yes — our Care plans start at $300/mo for site maintenance, $500/mo for brand care, and $800/mo for content care. See the full pricing menu for details.',
  },
  {
    q: 'Can I start with an Audit and upgrade later?',
    a: 'Absolutely. Most Build engagements start with an Audit. The Audit fee is credited toward the Build if you proceed within 30 days.',
  },
  {
    q: 'What\'s your refund policy?',
    a: 'Fixed-scope engagements are non-refundable once work begins. However, we guarantee the deliverables named in the scope document — if we miss a deliverable, we fix it at no cost.',
  },
]

export function PricingTable() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-20">
      {/* Tier cards */}
      <div className="grid lg:grid-cols-3 gap-5">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={cn(
              'relative rounded-2xl border p-8 flex flex-col transition-all duration-300',
              'hover:-translate-y-1',
              tier.popular
                ? 'border-[#0ED3CF]/50 bg-[#12110F] shadow-[0_0_40px_rgba(14,211,207,0.08)]'
                : tier.premium
                ? 'border-[#C7236E]/40 bg-gradient-to-b from-[#C7236E]/[0.04] to-[#12110F]'
                : 'border-[#2A2826] bg-[#12110F]',
              tier.popular && 'hover:shadow-[0_0_60px_rgba(14,211,207,0.12)]',
              tier.premium && 'hover:shadow-[0_0_60px_rgba(199,35,110,0.1)]',
              !tier.popular && !tier.premium && 'hover:border-[#3D3A37] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
            )}
          >
            {/* Popular badge */}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#0ED3CF] text-[#09090B] text-[10px] font-mono uppercase tracking-widest font-bold">
                Most Popular
              </div>
            )}

            {/* Premium badge */}
            {tier.premium && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#C7236E] text-white text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Premium
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#F4F2EF]">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-normal tracking-tight text-[#F4F2EF]" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                  {tier.price}
                </span>
                <span className="text-sm text-[#78716C]">{tier.cadence}</span>
              </div>
              <div className="mt-2 text-xs font-mono text-[#78716C]">{tier.timeline}</div>
              <p className="mt-4 text-sm text-[#A8A29E] leading-relaxed">{tier.description}</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8 flex-1">
              {featureLabels.map((feature) => {
                const included = tier.features[feature as keyof typeof tier.features]
                return (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    {included ? (
                      <Check className="w-4 h-4 shrink-0" style={{ color: tier.accent }} />
                    ) : (
                      <X className="w-4 h-4 text-[#3D3A37] shrink-0" />
                    )}
                    <span className={included ? 'text-[#A8A29E]' : 'text-[#3D3A37]'}>
                      {feature}
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* CTA */}
            <Link
              href={tier.ctaHref}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-200',
                tier.premium
                  ? 'bg-[#C7236E] hover:bg-[#9E1C58] text-white shadow-lg shadow-[#C7236E]/20'
                  : 'bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] shadow-lg shadow-[#0ED3CF]/20',
              )}
            >
              {tier.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Feature comparison table — desktop */}
      <div className="hidden lg:block">
        <h3 className="text-2xl font-normal tracking-tight text-[#F4F2EF] mb-8" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
          Compare plans
        </h3>
        <div className="rounded-2xl border border-[#2A2826] overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-4 bg-[#12110F] border-b border-[#2A2826]">
            <div className="p-4 text-sm font-mono text-[#78716C] uppercase tracking-widest">Feature</div>
            {tiers.map((tier) => (
              <div key={tier.name} className="p-4 text-center text-sm font-semibold text-[#F4F2EF]">
                {tier.name}
              </div>
            ))}
          </div>
          {/* Feature rows */}
          {featureLabels.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'grid grid-cols-4 border-b border-[#2A2826]/50',
                i % 2 === 0 ? 'bg-[#09090B]' : 'bg-[#0B0A09]',
              )}
            >
              <div className="p-4 text-sm text-[#A8A29E]">{feature}</div>
              {tiers.map((tier) => {
                const included = tier.features[feature as keyof typeof tier.features]
                return (
                  <div key={tier.name} className="p-4 flex justify-center">
                    {included ? (
                      <Check className="w-4.5 h-4.5" style={{ color: tier.accent }} />
                    ) : (
                      <X className="w-4.5 h-4.5 text-[#2A2826]" />
                    )}
                  </div>
                )
              })}
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-2xl font-normal tracking-tight text-[#F4F2EF] mb-8" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
          Frequently asked
        </h3>
        <div className="space-y-3 max-w-3xl">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#2A2826] bg-[#12110F] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-[#F4F2EF] hover:bg-[#1A1917] transition-colors"
              >
                {faq.q}
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-[#78716C] transition-transform duration-200',
                    openFaq === i && 'rotate-180',
                  )}
                />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-[#A8A29E] leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
