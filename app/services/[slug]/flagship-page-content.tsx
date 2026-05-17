'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  FileText,
  Plus,
  KeyRound,
  FlaskConical,
  Wallet,
  UserCheck,
} from 'lucide-react'
import type { Tier } from '@/data/services/tiers'
import type { ExtendedTier } from '@/data/services/extended'
import { flagshipVisuals } from '@/data/services/flagship-visuals'
import { SectionLabel } from '@/components/section-label'
import { Button } from '@/components/ui/button'
import { AgentArchitectureDiagram } from '@/components/agents/agent-architecture-diagram'
import { AgentDashboardMockup } from '@/components/agents/agent-dashboard-mockup'
import { AgentCostEstimator } from '@/components/agents/agent-cost-estimator'
import { VoiceAgentAudioCue } from '@/components/agents/voice-agent-audio-cue'
import { FlagshipCompare } from '@/components/agents/flagship-compare'
import { AgentFlowDiagrams } from '@/components/diagrams'
import { RiskReversal } from '@/components/services/risk-reversal'
import { SampleDeliverable } from '@/components/services/sample-deliverable'

const TRUST_BADGES = [
  {
    icon: KeyRound,
    label: 'BYOK',
    sub: 'Pay LLM providers direct',
  },
  {
    icon: FlaskConical,
    label: 'Eval harness',
    sub: 'Regressions caught in CI',
  },
  {
    icon: Wallet,
    label: 'Spend cap',
    sub: 'You set the ceiling',
  },
  {
    icon: UserCheck,
    label: 'Human-in-loop',
    sub: 'Approval queue, not auto-send',
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55 },
}

const cadenceLabel: Record<Tier['cadence'], string> = {
  'one-time': 'One-time payment',
  monthly: 'Monthly subscription',
  custom: 'Custom \u2014 starts after discovery',
}

const modeLabel: Record<Tier['mode'], string> = {
  audit: 'Audit',
  sprint: 'Sprint',
  build: 'Build',
  operate: 'Operate',
}

export function FlagshipPageContent({ tier }: { tier: ExtendedTier }) {
  const visuals = flagshipVisuals[tier.slug]
  const accent = visuals?.accent ?? '#22D3EE'

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        {/* Accent glow */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: accent }}
        />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: accent }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={fadeUp.transition}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase tracking-widest text-[#78716C]">
              <Link
                href="/services"
                className="hover:text-[#FAFAFA] transition-colors"
              >
                Services
              </Link>
              <span>·</span>
              <span style={{ color: accent }}>AI Flagship</span>
              <span>·</span>
              <span className="text-[#A8A29E]">{modeLabel[tier.mode]}</span>
            </div>

            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono uppercase tracking-widest mb-5"
              style={{
                borderColor: `${accent}55`,
                color: accent,
                backgroundColor: `${accent}10`,
              }}
            >
              <Sparkles className="w-3 h-3" />
              Flagship engagement
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight tracking-tight">
              {tier.name}
            </h1>
            <p
              className="mt-3 text-xl font-medium"
              style={{ color: accent }}
            >
              {tier.tagline}
            </p>
            <p className="mt-5 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              {tier.description}
            </p>

            {/* Price + chips */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#FAFAFA]">
                  {tier.price}
                </span>
                {tier.cadence === 'monthly' && (
                  <span className="text-[#78716C] text-base">/mo</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-mono text-[#A8A29E] bg-[#1A1917] border border-[#2A2826] px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" style={{ color: accent }} />
                {tier.timeline}
              </span>
              <span className="text-xs font-mono text-[#78716C] bg-[#2A2826] px-3 py-1 rounded-full">
                {cadenceLabel[tier.cadence]}
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border"
                style={{
                  borderColor: `${accent}55`,
                  color: accent,
                  backgroundColor: `${accent}10`,
                }}
              >
                Custom pricing on request
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="text-[#09090B] font-semibold border-0"
                style={{ backgroundColor: accent }}
              >
                <Link href={tier.ctaHref}>
                  {tier.cta}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#3D3A37] text-[#A8A29E] hover:border-[#FAFAFA] hover:text-[#FAFAFA] bg-transparent"
              >
                <Link href={`/contact?engagement=${tier.slug}&mode=custom`}>
                  Request custom scope
                </Link>
              </Button>
            </div>

            {/* Stack chips */}
            {tier.stackChips && tier.stackChips.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-1.5">
                {tier.stackChips.map((chip) => (
                  <span
                    key={chip}
                    className="text-[10.5px] font-mono uppercase tracking-widest text-[#78716C] bg-[#12110F] border border-[#2A2826] px-2.5 py-1 rounded"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">
        {/* Compare strip — directly under hero */}
        <FlagshipCompare currentSlug={tier.slug} />

        {/* Story / positioning */}
        {visuals?.story && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Why this exists</SectionLabel>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#FAFAFA] max-w-3xl leading-tight">
              {visuals.story.headline}
            </h2>
            <p
              className="mt-3 text-sm font-mono uppercase tracking-widest"
              style={{ color: accent }}
            >
              {visuals.story.eyebrow}
            </p>
            <p className="mt-5 text-lg text-[#A8A29E] leading-relaxed max-w-3xl">
              {visuals.story.body}
            </p>

            {/* Trust badges row */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
              {TRUST_BADGES.map((badge) => {
                const Icon = badge.icon
                return (
                  <div
                    key={badge.label}
                    className="rounded-xl bg-[#12110F] border border-[#2A2826] p-4 hover:border-white/15 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${accent}1A` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div className="text-[#FAFAFA] font-semibold text-sm">
                      {badge.label}
                    </div>
                    <div className="text-[12px] text-[#78716C] mt-0.5 leading-snug">
                      {badge.sub}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Architecture diagram */}
        {visuals?.architecture && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              The architecture, end to end
            </h2>
            <p className="text-[#A8A29E] mb-6 max-w-2xl">
              No black boxes. Here\u2019s the actual shape of the system you get \u2014
              with the guardrails, eval loops, and human approvals where they
              belong.
            </p>
            <AgentArchitectureDiagram
              title={visuals.architecture.title}
              subtitle={visuals.architecture.subtitle}
              nodes={visuals.architecture.nodes}
              connections={visuals.architecture.connections}
              accent={accent}
            />
          </motion.section>
        )}

        {/* Voice agent audio cue — only on the voice agent page */}
        {tier.slug === 'ai-voice-agent' && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Listen in</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              A real call, scripted from a real deployment
            </h2>
            <p className="text-[#A8A29E] mb-6 max-w-2xl">
              No recording, no marketing voice-over. A line-by-line walk-through
              of how the agent handles a typical inbound — including the moment
              the caller asks if they’re talking to AI.
            </p>
            <VoiceAgentAudioCue accent={accent} />
          </motion.section>
        )}

        {/* Use cases grid */}
        {visuals?.useCases && visuals.useCases.length > 0 && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Where this fits</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
              Real use cases we ship
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visuals.useCases.map((uc, i) => (
                <motion.div
                  key={uc.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accent}1A` }}
                    >
                      <Check className="w-4 h-4" style={{ color: accent }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#FAFAFA] mb-1.5 leading-snug">
                        {uc.title}
                      </h3>
                      <p className="text-[13.5px] text-[#A8A29E] leading-snug">
                        {uc.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Dashboard mockup */}
        {visuals?.dashboard && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Your command center</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              The dashboard you actually use
            </h2>
            <p className="text-[#A8A29E] mb-6 max-w-2xl">
              Every flagship engagement ships with a stylized control panel \u2014
              live activity, eval pass rate, spend cap, and an approval queue you
              can act on from your phone.
            </p>
            <AgentDashboardMockup
              title={visuals.dashboard.title}
              subtitle={visuals.dashboard.subtitle}
              kpis={visuals.dashboard.kpis}
              activity={visuals.dashboard.activity}
              liveTickerPool={visuals.dashboard.liveTickerPool}
              evalPct={visuals.dashboard.evalPct}
              spendUsed={visuals.dashboard.spendUsed}
              spendCap={visuals.dashboard.spendCap}
              pendingApprovals={visuals.dashboard.pendingApprovals}
              accent={accent}
            />
          </motion.section>
        )}

        {/* Cost estimator */}
        {visuals?.costEstimator && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Cost forecast</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-6">
              Estimate your monthly run cost
            </h2>
            <AgentCostEstimator
              unitLabel={visuals.costEstimator.unitLabel}
              min={visuals.costEstimator.min}
              max={visuals.costEstimator.max}
              step={visuals.costEstimator.step}
              defaultValue={visuals.costEstimator.defaultValue}
              costPerUnit={visuals.costEstimator.costPerUnit}
              baseCost={visuals.costEstimator.baseCost}
              title={visuals.costEstimator.title}
              subtitle={visuals.costEstimator.subtitle}
              accent={accent}
            />
          </motion.section>
        )}

        {/* What you get */}
        <motion.section
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true }}
          transition={fadeUp.transition}
        >
          <SectionLabel>Outcomes</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
            What you get
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tier.outcomes.map((outcome, i) => (
              <motion.div
                key={outcome}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-[#12110F] border border-[#2A2826]"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${accent}26` }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: accent }} />
                </div>
                <span className="text-[#A8A29E] leading-snug">{outcome}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Agent flow diagram */}
        {AgentFlowDiagrams[tier.slug] && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Agent flow</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              How the agent thinks
            </h2>
            <p className="text-[#A8A29E] mb-6 max-w-2xl">
              The decision graph behind the engagement. Inputs, branches, and the
              point where a human stays in the loop.
            </p>
            <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-4 sm:p-6 overflow-hidden">
              {(() => {
                const Flow = AgentFlowDiagrams[tier.slug]
                return Flow ? <Flow /> : null
              })()}
            </div>
          </motion.section>
        )}

        {/* Phases timeline */}
        {tier.phases.length > 0 && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Methodology</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-2">
              How we run this engagement
            </h2>
            <p className="text-[#A8A29E] mb-8 max-w-2xl">
              Concrete phases, concrete artifacts. You always know where we are
              and what comes next.
            </p>
            <div className="space-y-6">
              {tier.phases.map((phase, i) => (
                <motion.div
                  key={phase.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="relative"
                >
                  {i < tier.phases.length - 1 && (
                    <div
                      className="absolute left-[27px] top-14 bottom-[-24px] w-px"
                      style={{
                        background: `linear-gradient(to bottom, ${accent}66, #2A2826)`,
                      }}
                    />
                  )}
                  <div className="flex gap-4 sm:gap-6">
                    <div
                      className="shrink-0 w-14 h-14 rounded-xl bg-[#12110F] border flex flex-col items-center justify-center"
                      style={{ borderColor: `${accent}4D` }}
                    >
                      <Calendar className="w-4 h-4 mb-0.5" style={{ color: accent }} />
                      <span className="text-[9px] font-mono text-[#78716C] uppercase tracking-tight">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 rounded-xl bg-[#12110F] border border-[#2A2826] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span
                          className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{
                            color: accent,
                            backgroundColor: `${accent}1A`,
                          }}
                        >
                          {phase.label}
                        </span>
                        <h3 className="text-lg font-semibold text-[#FAFAFA]">
                          {phase.title}
                        </h3>
                      </div>
                      <p className="text-[#A8A29E] text-sm leading-relaxed mb-3">
                        {phase.description}
                      </p>
                      {phase.artifacts && phase.artifacts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#2A2826]">
                          {phase.artifacts.map((a) => (
                            <span
                              key={a}
                              className="inline-flex items-center gap-1 text-xs font-mono text-[#78716C] bg-[#1A1917] border border-[#2A2826] px-2 py-0.5 rounded"
                            >
                              <FileText className="w-3 h-3" />
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Result metrics */}
        {tier.resultMetrics.length > 0 && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>By the numbers</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-8">
              Typical results
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tier.resultMetrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-6"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
                    {m.context ?? 'Result'}
                  </div>
                  <div
                    className="mt-2 text-3xl font-bold tabular-nums"
                    style={{ color: '#FAFAFA' }}
                  >
                    {m.value}
                  </div>
                  <div className="text-sm text-[#A8A29E] mt-1">{m.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Deliverables / Not Included split */}
        <motion.section
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true }}
          transition={fadeUp.transition}
          className="grid lg:grid-cols-2 gap-6"
        >
          <div>
            <SectionLabel>Deliverables</SectionLabel>
            <h3 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-5">
              What ships
            </h3>
            <ul className="space-y-2">
              {tier.deliverables.map((d) => (
                <li
                  key={d}
                  className="flex items-start gap-2.5 text-[#A8A29E] text-[15px] leading-snug"
                >
                  <Check
                    className="w-4 h-4 mt-1 shrink-0"
                    style={{ color: accent }}
                  />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          {tier.notIncluded.length > 0 && (
            <div>
              <SectionLabel>Not included</SectionLabel>
              <h3 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-5">
                Out of scope
              </h3>
              <ul className="space-y-2">
                {tier.notIncluded.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-2.5 text-[#78716C] text-[15px] leading-snug"
                  >
                    <X className="w-4 h-4 mt-1 shrink-0 text-[#57534E]" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.section>

        {/* Add-ons */}
        {tier.addOns && tier.addOns.length > 0 && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>Add-ons</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-6">
              Extend the engagement
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {tier.addOns.map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="rounded-xl bg-[#12110F] border border-[#2A2826] p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-[#FAFAFA]">{a.name}</h3>
                    <span
                      className="text-sm font-mono whitespace-nowrap"
                      style={{ color: accent }}
                    >
                      {a.price}
                    </span>
                  </div>
                  <p className="text-sm text-[#A8A29E] leading-snug">
                    {a.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Sample deliverables */}
        <SampleDeliverable />

        {/* Risk reversal */}
        <RiskReversal />

        {/* FAQ */}
        {tier.faq.length > 0 && (
          <motion.section
            initial={fadeUp.initial}
            whileInView={fadeUp.animate}
            viewport={{ once: true }}
            transition={fadeUp.transition}
          >
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-[#FAFAFA] mb-6">
              Honest answers
            </h2>
            <div className="space-y-3 max-w-3xl">
              {tier.faq.map((q, i) => (
                <motion.details
                  key={q.q}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="group rounded-xl bg-[#12110F] border border-[#2A2826] p-5 open:border-[#3D3A37]"
                >
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                    <span className="font-semibold text-[#FAFAFA]">{q.q}</span>
                    <Plus className="w-4 h-4 text-[#78716C] shrink-0 transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-[#A8A29E] text-[15px] leading-relaxed">
                    {q.a}
                  </p>
                </motion.details>
              ))}
            </div>
          </motion.section>
        )}

        {/* Final CTA */}
        <motion.section
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true }}
          transition={fadeUp.transition}
        >
          <div
            className="rounded-2xl border p-8 sm:p-12 text-center relative overflow-hidden"
            style={{
              borderColor: `${accent}33`,
              background: `radial-gradient(circle at 50% 0%, ${accent}1A, transparent 70%)`,
            }}
          >
            <div className="relative">
              <ShieldCheck
                className="w-10 h-10 mx-auto mb-4"
                style={{ color: accent }}
              />
              <h2 className="text-3xl sm:text-4xl font-bold text-[#FAFAFA] max-w-2xl mx-auto leading-tight">
                Ready to scope this for your business?
              </h2>
              <p className="mt-4 text-[#A8A29E] max-w-xl mx-auto">
                Book a 30-minute discovery call. No pitch deck. We&apos;ll either
                confirm fit and send a proposal, or tell you straight that this
                isn&apos;t the right move.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="text-[#09090B] font-semibold border-0"
                  style={{ backgroundColor: accent }}
                >
                  <Link href={tier.ctaHref}>
                    {tier.cta}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-[#3D3A37] text-[#A8A29E] hover:border-[#FAFAFA] hover:text-[#FAFAFA] bg-transparent"
                >
                  <Link href={`/contact?engagement=${tier.slug}&mode=custom`}>
                    Request custom pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
