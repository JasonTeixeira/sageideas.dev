'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { GlowCard } from '@/components/glow-card'
import { Stagger, StaggerItem, HoverGlow } from '@/components/motion'
import { type CaseStudy } from '@/data/work/case-studies'

const CATEGORIES = ['All', 'Fintech', 'AI/ML', 'Infrastructure', 'Product', 'DevTools'] as const
type FilterCategory = (typeof CATEGORIES)[number]

const gradients: Record<string, string> = {
  Fintech: 'from-cyan-500/20 via-blue-500/10 to-transparent',
  'AI/ML': 'from-violet-500/20 via-purple-500/10 to-transparent',
  Infrastructure: 'from-amber-500/20 via-orange-500/10 to-transparent',
  Product: 'from-emerald-500/20 via-teal-500/10 to-transparent',
  DevTools: 'from-rose-500/20 via-pink-500/10 to-transparent',
}

interface WorkGridProps {
  studies: CaseStudy[]
}

export function WorkGrid({ studies }: WorkGridProps) {
  const [active, setActive] = useState<FilterCategory>('All')

  const filtered = active === 'All' ? studies : studies.filter((s) => s.category === active)

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border transition-all duration-200 ${
              active === cat
                ? 'bg-[#0ED3CF] border-[#0ED3CF] text-[#09090B]'
                : 'border-[#2A2826] text-[#78716C] hover:border-[#0ED3CF]/50 hover:text-[#A8A29E]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Case study cards */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" gap={0.05}>
        {filtered.map((study) => (
          <StaggerItem key={study.slug}>
            <HoverGlow className="rounded-2xl h-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.45),0_24px_48px_-24px_rgba(6,182,212,0.35)] rounded-2xl h-full"
            >
            <GlowCard className="h-full flex flex-col group overflow-hidden">
              {/* Thumbnail */}
              <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${gradients[study.category] ?? 'from-zinc-800/40 to-transparent'}`}>
                {study.heroImage && (
                  <Image
                    src={study.heroImage}
                    alt={`${study.title} hero`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {/* Bottom gradient overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/30 to-transparent" />

                {/* Top-left: outcome metric pill */}
                {study.cardMetric && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[#09090B]/85 text-[#FAFAFA] border border-[#3D3A37] backdrop-blur-sm shadow-lg">
                      {study.cardMetric}
                    </span>
                  </div>
                )}

                {/* Bottom-right: UI peek thumbnail (real product screen, layered + tilted) */}
                {study.screens && study.screens[0] && (
                  <div
                    className="absolute bottom-3 right-3 z-10 w-[40%] aspect-video rounded-md overflow-hidden border border-[#3D3A37] shadow-2xl shadow-[#0ED3CF]/10 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110"
                    style={{ transform: 'rotate(-3deg)' }}
                  >
                    <Image
                      src={study.screens[0].src}
                      alt=""
                      aria-hidden
                      fill
                      sizes="(max-width: 768px) 40vw, (max-width: 1024px) 20vw, 13vw"
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Bottom-left: category pill */}
                <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[#09090B]/80 text-[#0ED3CF] border border-[#0ED3CF]/30 backdrop-blur-sm">
                    {study.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-6 gap-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C]">
                  {study.title}
                </div>
                <h3 className="text-[#FAFAFA] font-semibold text-lg leading-snug">
                  {study.posterTitle ?? study.title}
                </h3>
                <p className="text-[#78716C] text-sm leading-relaxed">{study.kicker}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-auto mb-3">
                  {study.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#2A2826] text-[#A8A29E]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/work/${study.slug}`}
                  className="inline-flex items-center gap-1.5 text-[#0ED3CF] text-sm font-medium hover:gap-2.5 transition-all duration-200"
                >
                  Read case study <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </GlowCard>
            </motion.div>
            </HoverGlow>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
