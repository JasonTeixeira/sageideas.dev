'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Github, ExternalLink, Briefcase } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { type LabProduct } from '@/data/lab/products'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const statusStyles: Record<string, string> = {
  Production: 'text-green-400 bg-green-500/20 border-green-500/30',
  Beta: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  Alpha: 'text-violet-400 bg-violet-500/20 border-violet-500/30',
  'Pre-launch': 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
}

const statusDot: Record<string, string> = {
  Production: 'bg-green-400',
  Beta: 'bg-amber-400',
  Alpha: 'bg-violet-400',
  'Pre-launch': 'bg-cyan-400',
}

interface Props {
  product: LabProduct
}

export function TearsheetContent({ product }: Props) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back */}
        <div className="mb-10">
          <Link
            href="/lab"
            className="inline-flex items-center gap-2 text-[#78716C] text-sm hover:text-[#A8A29E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> The Lab
          </Link>
        </div>

        {/* Hero */}
        <motion.section {...fadeIn} transition={{ duration: 0.6 }} className="mb-16">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest border ${
                statusStyles[product.status] ?? statusStyles['Pre-launch']
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[product.status] ?? statusDot['Pre-launch']}`} />
              {product.status_note ?? product.status}
            </span>
            <span className="text-xs font-mono text-[#78716C] uppercase tracking-wide">{product.category}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#FAFAFA] tracking-tight">
            {product.name}
          </h1>
          <p className="mt-4 text-xl text-[#A8A29E] max-w-2xl">{product.tagline}</p>
          <p className="mt-4 text-[#78716C] max-w-2xl leading-relaxed">{product.description}</p>

          {/* Links */}
          {product.links && (
            <div className="mt-6 flex flex-wrap gap-3">
              {product.links.github && (
                <a
                  href={product.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2826] text-[#A8A29E] text-sm hover:border-[#0ED3CF]/50 hover:text-[#FAFAFA] transition-all duration-200"
                >
                  <Github className="w-4 h-4" /> GitHub
                </a>
              )}
              {product.links.site && (
                <a
                  href={product.links.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2826] text-[#A8A29E] text-sm hover:border-[#0ED3CF]/50 hover:text-[#FAFAFA] transition-all duration-200"
                >
                  <ExternalLink className="w-4 h-4" /> Live site
                </a>
              )}
            </div>
          )}
        </motion.section>

        {/* Metrics grid */}
        <motion.section
          {...fadeIn}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16"
        >
          <SectionLabel>Metrics</SectionLabel>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {product.metrics.map((m) => (
              <div
                key={m.label}
                className="p-5 rounded-xl bg-[#12110F] border border-[#2A2826] text-center"
              >
                <div className="text-2xl font-bold text-[#0ED3CF]">{m.value}</div>
                <div className="text-xs text-[#78716C] mt-1 font-mono uppercase tracking-wide">{m.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Thesis */}
        <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.15 }} className="mb-14">
          <SectionLabel>Why we built it</SectionLabel>
          <p className="mt-4 text-[#A8A29E] leading-relaxed max-w-3xl">{product.thesis}</p>
        </motion.section>

        {/* What it does */}
        <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.2 }} className="mb-14">
          <SectionLabel>What it does</SectionLabel>
          <ul className="mt-4 space-y-3">
            {product.whatItDoes.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0ED3CF] shrink-0" />
                <span className="text-[#A8A29E] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Stack */}
        <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.25 }} className="mb-14">
          <SectionLabel>Stack</SectionLabel>
          <div className="mt-4 flex flex-wrap gap-2">
            {product.stack.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[#12110F] border border-[#2A2826] text-[#A8A29E]"
              >
                {s}
              </span>
            ))}
          </div>
        </motion.section>

        {/* Related case study */}
        {product.relatedWork && (
          <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.3 }} className="mb-14">
            <SectionLabel>Related work</SectionLabel>
            <div className="mt-4">
              <Link
                href={`/work/${product.relatedWork}`}
                className="group inline-flex items-center gap-3 p-5 rounded-xl bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 transition-all duration-200"
              >
                <Briefcase className="w-5 h-5 text-[#0ED3CF]" />
                <div>
                  <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest">Case study</div>
                  <div className="text-[#FAFAFA] font-medium mt-0.5">Read the full case study</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0ED3CF] ml-auto group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.section>
        )}

        {/* Bottom CTA */}
        <motion.section
          {...fadeIn}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="pt-12 border-t border-[#2A2826]"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <SectionLabel>Build with us</SectionLabel>
              <p className="mt-2 text-[#A8A29E] max-w-md">
                Interested in building something like this? Tell us about your project.
              </p>
            </div>
            <Link
              href="/contact?type=project&source=lab"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0ED3CF] text-[#09090B] font-semibold text-sm hover:bg-[#0ED3CF]/90 transition-colors"
            >
              Start a project <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
