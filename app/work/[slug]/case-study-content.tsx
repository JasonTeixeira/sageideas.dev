'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ExternalLink, FlaskConical, Wrench } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { ArtifactGallery } from '@/components/artifact-gallery'
import { TestimonialCard } from '@/components/testimonial-card'
import { referencesForCaseStudy } from '@/data/references'
import { type CaseStudy } from '@/data/work/case-studies'
import { CaseStudyArchitecture } from '@/components/diagrams'
import { ScreensCarousel } from '@/components/work/screens-carousel'

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

interface Props {
  study: CaseStudy
}

const categoryColors: Record<string, string> = {
  Fintech: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'AI/ML': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Infrastructure: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Product: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  DevTools: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

export function CaseStudyContent({ study }: Props) {
  const catColor = categoryColors[study.category] ?? 'text-[#A8A29E] bg-[#2A2826] border-[#2A2826]'
  const refs = referencesForCaseStudy(study.slug, 2)

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back link */}
        <div className="mb-10">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-[#78716C] text-sm hover:text-[#A8A29E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All case studies
          </Link>
        </div>

        {/* Hero image */}
        {study.heroImage && (
          <motion.div
            {...fadeIn}
            transition={{ duration: 0.5 }}
            className="relative mb-12 rounded-2xl overflow-hidden border border-[#2A2826] aspect-video"
          >
            <Image
              src={study.heroImage}
              alt={`${study.title} hero image`}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
            {/* Top + bottom gradients for legibility */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#09090B]/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#09090B] via-[#09090B]/60 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
              {study.posterTitle && (
                <h2 className="text-[#FAFAFA] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-3xl drop-shadow-lg">
                  {study.posterTitle}
                </h2>
              )}
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <motion.section {...fadeIn} transition={{ duration: 0.6 }} className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest border ${catColor}`}>
              {study.category}
            </span>
          </div>
          {study.posterTitle ? (
            <>
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-3">
                {study.title}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] tracking-tight leading-[1.05] max-w-4xl">
                {study.posterTitle}
              </h1>
              <p className="mt-5 text-lg lg:text-xl text-[#A8A29E] leading-relaxed max-w-3xl">{study.tagline}</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] tracking-tight leading-tight max-w-4xl">
                {study.title}
              </h1>
              <p className="mt-4 text-xl text-[#A8A29E] max-w-3xl">{study.tagline}</p>
            </>
          )}

          {/* Kicker metrics row */}
          <div className="mt-8 flex flex-wrap gap-4">
            {study.metrics.slice(0, 4).map((m) => (
              <div
                key={m.label}
                className="px-5 py-3 rounded-xl bg-[#12110F] border border-[#2A2826] text-center"
              >
                <div className="text-2xl font-bold text-[#0ED3CF]">{m.value}</div>
                <div className="text-xs text-[#78716C] mt-0.5 font-mono uppercase tracking-wide">{m.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Two-column layout */}
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-16 items-start">
          {/* Sticky sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-24 space-y-6 mb-12 lg:mb-0">
            {/* Client */}
            <GlowCard className="p-5">
              <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-2">Client</div>
              <div className="text-[#FAFAFA] text-sm font-medium">{study.client}</div>
            </GlowCard>

            {/* Tags */}
            <GlowCard className="p-5">
              <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-3">Stack</div>
              <div className="flex flex-wrap gap-1.5">
                {study.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#2A2826] text-[#A8A29E]">
                    {tag}
                  </span>
                ))}
              </div>
            </GlowCard>

            {/* All metrics */}
            <GlowCard className="p-5">
              <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-3">Key metrics</div>
              <div className="space-y-2.5">
                {study.metrics.map((m) => (
                  <div key={m.label} className="flex justify-between items-center gap-2">
                    <span className="text-[#78716C] text-xs">{m.label}</span>
                    <span className="text-[#0ED3CF] text-sm font-mono font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            </GlowCard>

            {/* Related lab */}
            {study.relatedLab && (
              <GlowCard className="p-5">
                <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-2">Lab entry</div>
                <Link
                  href={`/lab/${study.relatedLab}`}
                  className="inline-flex items-center gap-1.5 text-[#0ED3CF] text-sm hover:gap-2.5 transition-all duration-200"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  View tearsheet
                </Link>
              </GlowCard>
            )}
          </aside>

          {/* Main content */}
          <main className="space-y-14">
            {/* Problem */}
            <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.1 }}>
              <SectionLabel>Problem</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">The challenge</h2>
              <div className="mt-4 space-y-4">
                {study.problem.map((p, i) => (
                  <p key={i} className="text-[#A8A29E] leading-relaxed">{p}</p>
                ))}
              </div>
            </motion.section>

            {/* Approach */}
            <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.15 }}>
              <SectionLabel>Approach</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">How we built it</h2>
              <div className="mt-4 space-y-4">
                {study.approach.map((p, i) => (
                  <p key={i} className="text-[#A8A29E] leading-relaxed">{p}</p>
                ))}
              </div>
            </motion.section>

            {/* Architecture diagram */}
            {CaseStudyArchitecture[study.slug] && (
              <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.17 }}>
                <SectionLabel>Architecture</SectionLabel>
                <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">System map</h2>
                <p className="mt-3 text-sm text-[#78716C]">
                  How the pieces talk to each other.
                </p>
                <div className="mt-6 rounded-2xl border border-[#2A2826] bg-[#12110F] p-4 sm:p-6 overflow-hidden">
                  {(() => {
                    const Diagram = CaseStudyArchitecture[study.slug]
                    return Diagram ? <Diagram /> : null
                  })()}
                </div>
              </motion.section>
            )}

            {/* Selected Screens — real product UI */}
            {study.screens && study.screens.length > 0 && (
              <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.175 }}>
                <SectionLabel>Built UI</SectionLabel>
                <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">Selected screens</h2>
                <p className="mt-3 text-sm text-[#78716C]">
                  Real product surfaces from the engagement — not stock illustrations.
                </p>
                <div className="mt-6">
                  <ScreensCarousel screens={study.screens} />
                </div>
              </motion.section>
            )}

            {/* Visual proof gallery */}
            {study.gallery && study.gallery.length > 0 && (
              <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.18 }}>
                <ArtifactGallery
                  eyebrow="Evidence"
                  title="What it actually looks like"
                  description="Architecture diagrams, CI runs, and dashboards from the engagement — not stock illustrations."
                  artifacts={study.gallery}
                  columns={study.gallery.length === 1 ? 1 : 2}
                />
              </motion.section>
            )}

            {/* Build */}
            <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.2 }}>
              <SectionLabel>Build</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">What shipped</h2>
              <div className="mt-4 space-y-4">
                {study.build.map((p, i) => (
                  <p key={i} className="text-[#A8A29E] leading-relaxed">{p}</p>
                ))}
              </div>
            </motion.section>

            {/* Outcome */}
            <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.25 }}>
              <SectionLabel>Outcome</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">Results</h2>
              <div className="mt-4 space-y-4">
                {study.outcome.map((p, i) => (
                  <p key={i} className="text-[#A8A29E] leading-relaxed">{p}</p>
                ))}
              </div>
            </motion.section>

            {/* Artifacts */}
            {study.artifacts && study.artifacts.length > 0 && (
              <motion.section {...fadeIn} transition={{ duration: 0.5, delay: 0.3 }}>
                <SectionLabel>Artifacts</SectionLabel>
                <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA]">Available</h2>
                <ul className="mt-4 space-y-2">
                  {study.artifacts.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[#A8A29E] text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0ED3CF] shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </main>
        </div>

        {/* References for this engagement */}
        {refs.length > 0 && (
          <motion.section
            {...fadeIn}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-24 pt-12 border-t border-[#2A2826]"
          >
            <SectionLabel>References</SectionLabel>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#FAFAFA]">
              Talk to people on this work.
            </h2>
            <p className="mt-3 text-sm text-[#A8A29E] leading-relaxed max-w-2xl">
              No fabricated quotes. Reference contacts are shared during discovery, with both parties&apos; consent.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {refs.map((r, i) => (
                <TestimonialCard key={r.id} reference={r} index={i} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Dual CTA strip */}
        <motion.section
          {...fadeIn}
          transition={{ duration: 0.5, delay: 0.35 }}
          className={`${refs.length > 0 ? 'mt-16 pt-12' : 'mt-24 pt-12'} border-t border-[#2A2826]`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/services/build"
              className="group flex items-center justify-between p-6 rounded-2xl bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 transition-all duration-200"
            >
              <div>
                <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-1">Start a project</div>
                <div className="text-[#FAFAFA] font-semibold">Build something like this</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#0ED3CF] group-hover:translate-x-1 transition-transform" />
            </Link>

            {study.relatedLab ? (
              <Link
                href={`/lab/${study.relatedLab}`}
                className="group flex items-center justify-between p-6 rounded-2xl bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 transition-all duration-200"
              >
                <div>
                  <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-1">Lab tearsheet</div>
                  <div className="text-[#FAFAFA] font-semibold">Explore the Lab entry</div>
                </div>
                <FlaskConical className="w-5 h-5 text-[#0ED3CF] group-hover:scale-110 transition-transform" />
              </Link>
            ) : study.ctaPrimary ? (
              <a
                href={study.ctaPrimary.href}
                target={study.ctaPrimary.href.startsWith('http') ? '_blank' : undefined}
                rel={study.ctaPrimary.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group flex items-center justify-between p-6 rounded-2xl bg-[#12110F] border border-[#2A2826] hover:border-[#0ED3CF]/50 transition-all duration-200"
              >
                <div>
                  <div className="text-[#78716C] text-xs font-mono uppercase tracking-widest mb-1">External</div>
                  <div className="text-[#FAFAFA] font-semibold">{study.ctaPrimary.label}</div>
                </div>
                <ExternalLink className="w-5 h-5 text-[#0ED3CF]" />
              </a>
            ) : null}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
