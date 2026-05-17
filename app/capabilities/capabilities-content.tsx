'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Globe,
  Workflow,
  Search,
  PenLine,
  Palette,
  Boxes,
  Server,
  Eye,
  Rocket,
  Hammer,
  Settings,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import {
  capabilities,
  capabilityMatrix,
  capabilityOrder,
  modeMeta,
  tiersBySlug,
  type CapabilityKey,
  type Mode,
  type MatrixCell,
} from '@/data/services/tiers'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'

const modeIcons: Record<Mode, typeof Eye> = {
  audit: Eye,
  sprint: Rocket,
  build: Hammer,
  operate: Settings,
}

const capabilityIcons: Record<CapabilityKey, typeof Brain> = {
  strategy: Brain,
  web: Globe,
  automation: Workflow,
  seo: Search,
  content: PenLine,
  brand: Palette,
  product: Boxes,
  platform: Server,
  app: Smartphone,
}

type CellTone = 'productized' | 'care' | 'custom'

const toneFor = (cell: MatrixCell): CellTone => {
  if (cell.kind === 'tier') return 'productized'
  if (cell.kind === 'care') return 'care'
  return 'custom'
}

const toneClasses: Record<
  CellTone,
  {
    border: string
    bg: string
    label: string
    iconBg: string
    Icon: typeof CheckCircle2
    badge: string
  }
> = {
  productized: {
    border: 'border-[#0ED3CF]/25 hover:border-[#0ED3CF]/60',
    bg: 'bg-[#0ED3CF]/[0.04] hover:bg-[#0ED3CF]/[0.08]',
    label: 'text-[#0ED3CF]',
    iconBg: 'bg-[#0ED3CF]/10 border-[#0ED3CF]/20',
    Icon: CheckCircle2,
    badge: 'Productized',
  },
  care: {
    border: 'border-[#E85D3A]/25 hover:border-[#E85D3A]/60',
    bg: 'bg-[#E85D3A]/[0.04] hover:bg-[#E85D3A]/[0.08]',
    label: 'text-[#E85D3A]',
    iconBg: 'bg-[#E85D3A]/10 border-[#E85D3A]/20',
    Icon: RefreshCw,
    badge: 'Retainer',
  },
  custom: {
    border: 'border-dashed border-[#57534E]/60 hover:border-[#A8A29E]/60',
    bg: 'bg-transparent hover:bg-[#FAFAFA]/[0.03]',
    label: 'text-[#A8A29E]',
    iconBg: 'bg-[#2A2826] border-[#3D3A37]',
    Icon: Sparkles,
    badge: 'Custom',
  },
}

export function CapabilitiesContent() {
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
            <SectionLabel>Capabilities</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-normal text-[#FAFAFA] leading-tight">
              Eight capabilities.{' '}
              <span className="text-[#0ED3CF]">Four modes.</span>{' '}
              <span className="text-[#E85D3A]">Every cell filled.</span>
            </h1>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              {
                "Each capability has a productized engagement, a custom option, and an ongoing retainer. Pick what fits — fixed-price tiers checkout instantly, custom engagements get a same-day quote, retainers cancel anytime. Don't see your shape? Every engagement can be custom-scoped."
              }
            </p>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 text-[#0ED3CF]">
                <CheckCircle2 className="w-3 h-3" /> Productized · instant checkout
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#E85D3A]/10 border border-[#E85D3A]/30 text-[#E85D3A]">
                <RefreshCw className="w-3 h-3" /> Retainer · monthly
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#2A2826] border border-[#3D3A37] text-[#A8A29E]">
                <Sparkles className="w-3 h-3" /> Custom · talk to Sage
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">
        {/* Mode legend */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Modes</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-6">
            How engagements run
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modeMeta.map((m, i) => {
              const Icon = modeIcons[m.key]
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#0ED3CF]" />
                    </div>
                    <span className="font-semibold text-[#FAFAFA]">{m.label}</span>
                  </div>
                  <p className="text-sm text-[#A8A29E]">{m.tagline}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Matrix — desktop */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>Matrix</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-2">
            Capability × Mode — every cell filled
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-2xl">
            Find your row (capability) and column (mode). Every intersection has a real
            offering — productized tiers checkout instantly, custom engagements get a
            same-day quote, retainers cancel anytime.
          </p>

          <div className="hidden lg:block overflow-hidden rounded-2xl border border-[#2A2826] bg-[#12110F]">
            {/* Header row */}
            <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] border-b border-[#2A2826] bg-[#0a0a0d]">
              <div className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#78716C]">
                Capability
              </div>
              {modeMeta.map((m) => (
                <div
                  key={m.key}
                  className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-[#78716C] border-l border-[#2A2826]"
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Capability rows */}
            {capabilityOrder.map((capKey, idx) => {
              const cap = capabilities[capKey]
              const Icon = capabilityIcons[capKey]
              return (
                <div
                  key={capKey}
                  className={`grid grid-cols-[1.4fr_repeat(4,1fr)] ${
                    idx < capabilityOrder.length - 1
                      ? 'border-b border-[#2A2826]/60'
                      : ''
                  }`}
                >
                  {/* Capability cell */}
                  <div className="px-4 py-5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#0ED3CF]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#FAFAFA] leading-tight">
                        {cap.label}
                      </div>
                      <div className="text-xs text-[#78716C] mt-1 leading-snug">
                        {cap.tagline}
                      </div>
                    </div>
                  </div>

                  {/* Mode cells */}
                  {modeMeta.map((m) => {
                    const cell = capabilityMatrix[capKey][m.key]
                    const tone = toneFor(cell)
                    const styles = toneClasses[tone]
                    const ToneIcon = styles.Icon
                    return (
                      <div
                        key={m.key}
                        className="border-l border-[#2A2826]/60 p-3"
                      >
                        <Link
                          href={cell.href}
                          className={`block h-full rounded-lg border ${styles.border} ${styles.bg} p-3 transition-all group min-h-[100px]`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <ToneIcon className={`w-3.5 h-3.5 ${styles.label}`} />
                            <span
                              className={`text-[10px] font-mono uppercase tracking-widest ${styles.label}`}
                            >
                              {styles.badge}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-[#FAFAFA] leading-tight mb-1">
                            {cell.label}
                          </div>
                          <div className="text-[13px] text-[#FAFAFA]/90 font-medium">
                            {cell.price}
                          </div>
                          <div className="text-xs text-[#78716C] mt-0.5">
                            {cell.timeline}
                          </div>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Mobile: capability cards with stacked mode pills */}
          <div className="lg:hidden space-y-4">
            {capabilityOrder.map((capKey, i) => {
              const cap = capabilities[capKey]
              const Icon = capabilityIcons[capKey]
              return (
                <motion.div
                  key={capKey}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#0ED3CF]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#FAFAFA]">{cap.label}</h3>
                      <p className="text-xs text-[#78716C] mt-0.5 leading-snug">
                        {cap.tagline}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {modeMeta.map((m) => {
                      const cell = capabilityMatrix[capKey][m.key]
                      const tone = toneFor(cell)
                      const styles = toneClasses[tone]
                      return (
                        <Link
                          key={m.key}
                          href={cell.href}
                          className={`rounded-lg border ${styles.border} ${styles.bg} p-2.5 transition-colors`}
                        >
                          <div
                            className={`text-[10px] font-mono uppercase tracking-widest ${styles.label} mb-0.5`}
                          >
                            {m.label} · {styles.badge}
                          </div>
                          <div className="text-sm font-semibold text-[#FAFAFA] leading-tight">
                            {cell.label}
                          </div>
                          <div className="text-xs text-[#A8A29E] mt-0.5">
                            {cell.price}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* Custom + retainer messaging */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#A8A29E]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">
                Custom packages
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#FAFAFA] mb-2">
              Don&apos;t see what you need?
            </h3>
            <p className="text-sm text-[#A8A29E] mb-4 leading-relaxed">
              Every engagement can be custom-scoped — combine capabilities, adjust the
              timeline, set your own deliverables. Every quote is transparent and
              fixed-price.
            </p>
            <Link
              href="/contact?engagement=custom"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FAFAFA] hover:text-[#0ED3CF] transition-colors"
            >
              Talk to Sage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-[#E85D3A]/20 bg-gradient-to-br from-[#E85D3A]/[0.06] to-transparent p-6">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-[#E85D3A]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#E85D3A]">
                Monthly retainers
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#FAFAFA] mb-2">
              Already shipped? Keep it healthy.
            </h3>
            <p className="text-sm text-[#A8A29E] mb-4 leading-relaxed">
              Site Care, Brand Care, and Content Care are lightweight monthly retainers
              for teams who already have something in market. Cancel anytime.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/services/site-care"
                className="text-xs font-mono text-[#E85D3A] bg-[#E85D3A]/10 border border-[#E85D3A]/20 px-2.5 py-1 rounded hover:bg-[#E85D3A]/20 transition-colors"
              >
                Site Care · $300/mo
              </Link>
              <Link
                href="/services/brand-care"
                className="text-xs font-mono text-[#E85D3A] bg-[#E85D3A]/10 border border-[#E85D3A]/20 px-2.5 py-1 rounded hover:bg-[#E85D3A]/20 transition-colors"
              >
                Brand Care · $400/mo
              </Link>
              <Link
                href="/services/content-care"
                className="text-xs font-mono text-[#E85D3A] bg-[#E85D3A]/10 border border-[#E85D3A]/20 px-2.5 py-1 rounded hover:bg-[#E85D3A]/20 transition-colors"
              >
                Content Care · $800/mo
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Capability deep links */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <SectionLabel>By capability</SectionLabel>
          <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">
            Explore by service line
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilityOrder.map((capKey, i) => {
              const cap = capabilities[capKey]
              const Icon = capabilityIcons[capKey]
              const tierCount = cap.tierSlugs.length
              const firstSlug = cap.tierSlugs[0]
              return (
                <motion.div
                  key={capKey}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                >
                  <GlowCard glowColor="cyan" className="h-full">
                    <div className="p-5 h-full flex flex-col">
                      <div className="w-10 h-10 rounded-lg bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 flex items-center justify-center mb-3">
                        <Icon className="w-4 h-4 text-[#0ED3CF]" />
                      </div>
                      <h3 className="font-semibold text-[#FAFAFA] mb-1">
                        {cap.label}
                      </h3>
                      <p className="text-sm text-[#A8A29E] leading-snug mb-4 flex-1">
                        {cap.tagline}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {cap.tierSlugs.map((slug) => {
                          const t = tiersBySlug[slug]
                          const label = t ? t.shortName : slug.replace(/-/g, ' ')
                          return (
                            <Link
                              key={slug}
                              href={`/services/${slug}`}
                              className="text-xs font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 px-2 py-0.5 rounded hover:bg-[#0ED3CF]/20 transition-colors capitalize"
                            >
                              {label}
                            </Link>
                          )
                        })}
                      </div>
                      <Link
                        href={`/services/${firstSlug}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#78716C] hover:text-[#0ED3CF] transition-colors"
                      >
                        {tierCount} {tierCount === 1 ? 'option' : 'options'} · explore
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </GlowCard>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="rounded-2xl bg-gradient-to-br from-[#0ED3CF]/10 via-[#12110F] to-[#E85D3A]/10 border border-[#0ED3CF]/20 p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-normal text-[#FAFAFA] mb-3">
            Not sure which capability you need?
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-lg mx-auto">
            Book a 30-minute discovery call. We&apos;ll talk through what you&apos;re
            building and which row + column fits — or scope something custom together.
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
