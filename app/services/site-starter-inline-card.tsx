'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, Globe } from 'lucide-react'
import { GlowCard } from '@/components/glow-card'
import { HoverGlow } from '@/components/motion'

export function SiteStarterInlineCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <HoverGlow className="h-full rounded-2xl">
        <GlowCard
          glowColor="gradient"
          className="h-full flex flex-col border-l-2 border-[#06B6D4]/60"
        >
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-[#06B6D4]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#06B6D4]/40 text-[#06B6D4] bg-[#06B6D4]/10">
                    PRODUCTIZED
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#09090B] bg-[#06B6D4] px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#FAFAFA] truncate">Site Starter</h3>
                <p className="text-sm text-[#A1A1AA] mt-0.5 line-clamp-2">
                  Three fixed-scope site builds — Landing, Marketing, or Pro.
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-[#FAFAFA]">$1,500</span>
              <span className="text-[#71717A] text-sm">to $3,500</span>
            </div>

            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="text-xs font-mono text-[#71717A] bg-[#27272A] px-2 py-0.5 rounded">
                One-time
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[#71717A]">
                <Clock className="w-3 h-3" />
                5 days – 2 weeks
              </span>
            </div>

            <ul className="space-y-1.5 mb-6 flex-1">
              <li className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                <Check className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                Stripe checkout, fixed price, no scope creep
              </li>
              <li className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                <Check className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                Pro tier ships with CMS-backed blog
              </li>
            </ul>

            <Link
              href="/services/site-starter"
              className="inline-flex items-center justify-center w-full rounded-lg border border-[#27272A] bg-[#18181B] hover:border-[#06B6D4]/60 hover:text-[#06B6D4] text-[#FAFAFA] text-sm font-medium py-2.5 px-4 transition-all duration-200 gap-2 group"
            >
              View Site Starter
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </GlowCard>
      </HoverGlow>
    </motion.div>
  )
}
