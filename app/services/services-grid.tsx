'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock } from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import type { ExtendedTier } from '@/data/services/extended'
import { GlowCard } from '@/components/glow-card'
import { HoverGlow } from '@/components/motion'
import {
  getServiceTier,
  tierLabel,
  tierOrder,
} from '@/data/services/tier-classification'
import { getVisualMeta, accentClasses } from '@/data/services/visual-meta'
import { ServiceIcon } from '@/components/services/icon'

const cadenceLabel: Record<Tier['cadence'], string> = {
  'one-time': 'One-time',
  monthly: '/mo',
  custom: 'Custom',
}

export function ServicesGrid({
  tiers,
  leadingCard,
}: {
  tiers: readonly (Tier | ExtendedTier)[]
  leadingCard?: React.ReactNode
}) {
  const sorted = [...tiers].sort((a, b) => tierOrder[getServiceTier(a)] - tierOrder[getServiceTier(b)])

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {leadingCard}
      {sorted.map((tier, index) => {
        const serviceTier = getServiceTier(tier)
        const meta = getVisualMeta(tier.slug)
        const accent = accentClasses[meta.accent]

        return (
          <motion.div
            key={tier.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <HoverGlow className="h-full rounded-2xl">
              <GlowCard
                glowColor={tier.highlight ? 'gradient' : 'cyan'}
                className={`h-full flex flex-col border-l-2 ${accent.borderStrong} ${tier.highlight ? 'border-[#0ED3CF]/50' : ''}`}
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${accent.iconBg} flex items-center justify-center shrink-0`}>
                      <ServiceIcon name={meta.icon} className={`w-5 h-5 ${accent.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${accent.border} ${accent.text} ${accent.bg}`}
                        >
                          {tierLabel[serviceTier]}
                        </span>
                        {tier.highlight && (
                          <span className="text-[10px] font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[#FAFAFA] truncate">{tier.name}</h3>
                      <p className="text-sm text-[#A8A29E] mt-0.5 line-clamp-2">{tier.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-normal text-[#FAFAFA]">{tier.price}</span>
                    {tier.cadence === 'monthly' && !tier.price.includes('/mo') && (
                      <span className="text-[#78716C] text-sm">/mo</span>
                    )}
                  </div>

                  {/* Cadence + Timeline */}
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    {!(tier.cadence === 'monthly' && tier.price.includes('/mo')) && (
                      <span className="text-xs font-mono text-[#78716C] bg-[#2A2826] px-2 py-0.5 rounded">
                        {cadenceLabel[tier.cadence]}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                      <Clock className="w-3 h-3" />
                      {tier.timeline}
                    </span>
                  </div>

                  {/* Primary outcomes */}
                  <ul className="space-y-1.5 mb-6 flex-1">
                    {tier.outcomes.slice(0, 2).map((outcome) => (
                      <li key={outcome} className="flex items-start gap-2 text-sm text-[#A8A29E]">
                        <Check className={`w-4 h-4 ${accent.text} shrink-0 mt-0.5`} />
                        {outcome}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/services/${tier.slug}`}
                    className="inline-flex items-center justify-center w-full rounded-lg border border-[#2A2826] bg-[#1A1917] hover:border-[#0ED3CF]/60 hover:text-[#0ED3CF] text-[#FAFAFA] text-sm font-medium py-2.5 px-4 transition-all duration-200 gap-2 group"
                  >
                    View {tier.shortName}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </GlowCard>
            </HoverGlow>
          </motion.div>
        )
      })}
    </div>
  )
}
