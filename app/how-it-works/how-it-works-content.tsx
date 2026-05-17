'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, ShieldCheck, Compass } from 'lucide-react'
import { Pipeline } from '@/components/pipeline'
import {
  pipelinesBySlug,
  productizedPipelineSlugs,
  carePipelineSlugs,
  studioJourney,
} from '@/data/pipelines'
import { tiersBySlug, careTiersBySlug } from '@/data/services/tiers'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { cn } from '@/lib/utils'

type Group = 'all' | 'productized' | 'care'

export function HowItWorksContent() {
  const [group, setGroup] = useState<Group>('all')

  const visibleSlugs = useMemo(() => {
    if (group === 'productized') return productizedPipelineSlugs
    if (group === 'care') return carePipelineSlugs
    return [...productizedPipelineSlugs, ...carePipelineSlugs]
  }, [group])

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 -z-0 h-96 w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <SectionLabel>How it works</SectionLabel>
            <h1 className="mt-4 text-5xl font-bold leading-tight text-[#FAFAFA] sm:text-6xl">
              Every service, end to end —
              <span className="block bg-gradient-to-r from-cyan-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                visualized stage by stage.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#A8A29E]">
              No more guessing what you are paying for. Each engagement is mapped
              as an interactive pipeline so you can see what happens on day one,
              what we ship at handoff, and what optional Care looks like after.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
              >
                Book a free intro chat
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                See pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Studio Journey — the universal high-level story */}
      <section className="relative pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-[#0c0c10] to-zinc-950 p-6 md:p-10">
            <div className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-400/80">
              <Sparkles className="h-3.5 w-3.5" />
              The Sage Ideas Studio Journey
            </div>
            <Pipeline pipeline={studioJourney} />
          </div>
        </div>
      </section>

      {/* Promises strip */}
      <section className="relative pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-4 md:grid-cols-3">
          <Promise
            icon={Compass}
            title="No surprises"
            body="Plain-English scope, fixed price for productized tiers, written change-control if scope shifts."
          />
          <Promise
            icon={Sparkles}
            title="Built in the open"
            body="Daily-updated staging links, weekly Loom walkthroughs, async status. You always know where things stand."
          />
          <Promise
            icon={ShieldCheck}
            title="Optional Care"
            body="If you want me on call after launch, a Care retainer covers it monthly. Cancel anytime."
          />
        </div>
      </section>

      {/* Filter chips */}
      <section className="relative pb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Show:
            </span>
            {(
              [
                { id: 'all', label: 'All services' },
                { id: 'productized', label: 'Productized tiers' },
                { id: 'care', label: 'Care retainers' },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
                  group === g.id
                    ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.18)]'
                    : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500 hover:text-white',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Per-service pipelines */}
      <section className="relative pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {visibleSlugs.map((slug) => {
            const pipeline = pipelinesBySlug[slug]
            if (!pipeline) return null
            const isCare = (carePipelineSlugs as readonly string[]).includes(slug)
            const tier = isCare ? careTiersBySlug[slug] : tiersBySlug[slug]
            const ctaHref = isCare ? `/services/${slug}` : `/services/${slug}`
            return (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55 }}
                className="rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-[#0c0c10] to-zinc-950 p-6 md:p-10"
              >
                <Pipeline pipeline={pipeline} />
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/70 pt-6">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {isCare ? 'Care retainer' : 'Productized tier'}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {tier?.name ?? pipeline.title}
                      {tier && (
                        <span className="ml-2 font-mono text-sm text-cyan-300">
                          {('price' in (tier ?? {}) ? tier.price : '')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={ctaHref}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                    >
                      Service details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
                    >
                      Book a free intro
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* CTA footer */}
      <section className="relative pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GlowCard glowColor="gradient">
            <div className="grid gap-6 p-8 md:grid-cols-[1.5fr,1fr] md:p-10">
              <div>
                <SectionLabel>Custom & retainers</SectionLabel>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  Not sure which pipeline fits?
                </h2>
                <p className="mt-3 max-w-2xl text-zinc-400">
                  If your project does not slot into a productized tier — bigger
                  scope, hybrid engagement, or ongoing monthly work — we run a
                  custom proposal off a 20-minute intro chat. No pressure, no
                  pitch deck, just an honest fit check.
                </p>
              </div>
              <div className="flex items-end justify-end">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition-transform hover:scale-[1.02]"
                >
                  Start with a free intro chat
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </GlowCard>
        </div>
      </section>
    </div>
  )
}

function Promise({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/40 bg-cyan-500/10">
          <Icon className="h-4 w-4 text-cyan-300" />
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  )
}
