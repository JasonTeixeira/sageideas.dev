'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, RotateCcw, Compass } from 'lucide-react'
import { track } from '@/components/analytics/posthog-provider'

type Stage = 'idea' | 'building' | 'scaling' | 'operating'
type Pain = 'speed' | 'quality' | 'cost' | 'risk'

const STAGE_OPTS: { value: Stage; label: string; sub: string }[] = [
  { value: 'idea', label: 'Still an idea', sub: 'No code in production yet' },
  { value: 'building', label: 'Building the first version', sub: 'Pre-launch / closed beta' },
  { value: 'scaling', label: 'Scaling what works', sub: 'Live with paying users' },
  { value: 'operating', label: 'Operating at steady state', sub: 'Mature product, ongoing work' },
]

const PAIN_OPTS: { value: Pain; label: string; sub: string }[] = [
  { value: 'speed', label: 'Speed', sub: 'We need to ship faster' },
  { value: 'quality', label: 'Quality', sub: 'Bugs, flakes, regressions' },
  { value: 'cost', label: 'Cost', sub: 'Cloud / vendor / dev cost too high' },
  { value: 'risk', label: 'Risk', sub: 'Compliance, reliability, on-call' },
]

type Recommendation = {
  slug: string
  name: string
  why: string
}

const REC_TABLE: Record<Stage, Record<Pain, Recommendation[]>> = {
  idea: {
    speed: [
      { slug: 'ship', name: 'Ship', why: 'Two weeks from brief to a deployed marketing-site MVP.' },
      { slug: 'app-development', name: 'App Development', why: 'A scoped build with weekly demos and a fixed timeline.' },
    ],
    quality: [
      { slug: 'audit', name: 'Strategy Audit', why: 'Validate the architecture before you write the code.' },
      { slug: 'ai-readiness-assessment', name: 'AI Readiness Assessment', why: 'Sanity-check your AI plan before you commit budget.' },
    ],
    cost: [
      { slug: 'audit', name: 'Strategy Audit', why: 'Cheapest insurance against a rebuild later.' },
      { slug: 'studio-package', name: 'Studio Package', why: '90 days done-for-you with a 6-month operate phase. One bill, one team.' },
    ],
    risk: [
      { slug: 'ai-readiness-assessment', name: 'AI Readiness Assessment', why: 'Find blind spots before they become incidents.' },
      { slug: 'soc2-readiness-sprint', name: 'SOC 2 Readiness Sprint', why: 'Compliance scaffolding while the codebase is still small.' },
    ],
  },
  building: {
    speed: [
      { slug: 'ship', name: 'Ship', why: 'Pair with the team and ship the next milestone in two weeks.' },
      { slug: 'automate', name: 'Automate', why: 'Remove the slow parts: deploys, tests, release cycles.' },
    ],
    quality: [
      { slug: 'ai-reliability-audit', name: 'AI Reliability Audit', why: 'Eval suite + regression gates wired into CI in two weeks.' },
      { slug: 'prompt-eval-library', name: 'Prompt & Eval Library Setup', why: 'A vetted base of prompts and evals to build on.' },
    ],
    cost: [
      { slug: 'stack-xray', name: 'Stack X-Ray', why: 'See where the money is actually going across infra and vendors.' },
      { slug: 'rag-engineering', name: 'RAG Engineering', why: 'Replace expensive context windows with retrieval that costs cents.' },
    ],
    risk: [
      { slug: 'auth-billing-foundation', name: 'Auth & Billing Foundation', why: 'Stop reinventing identity and money handling.' },
      { slug: 'soc2-readiness-sprint', name: 'SOC 2 Readiness Sprint', why: 'Compliance posture before the next enterprise deal.' },
    ],
  },
  scaling: {
    speed: [
      { slug: 'release-notes-automation', name: 'Release Notes Automation', why: 'A faster release cycle without more headcount.' },
      { slug: 'agent-ops', name: 'Agent Ops', why: 'Move from one-off scripts to a controlled agent runtime.' },
    ],
    quality: [
      { slug: 'ai-reliability-audit', name: 'AI Reliability Audit', why: 'Find the regressions you cannot see in metrics.' },
      { slug: 'incident-postmortem-pipeline', name: 'Incident Postmortem Pipeline', why: 'Turn outages into structured learning by default.' },
    ],
    cost: [
      { slug: 'stack-xray', name: 'Stack X-Ray', why: 'Where the spend leaks: AWS, vendors, redundant tools.' },
      { slug: 'data-hygiene-bot', name: 'Data Hygiene Bot', why: 'Cheaper queries, smaller pipelines, faster jobs.' },
    ],
    risk: [
      { slug: 'reliability-retainer', name: 'Reliability Retainer', why: 'On-call backup and weekly reliability work.' },
      { slug: 'hipaa-readiness-audit', name: 'HIPAA Readiness Audit', why: 'For health-data handling teams.' },
    ],
  },
  operating: {
    speed: [
      { slug: 'automation-retainer', name: 'Automation Retainer', why: 'A pipeline a quarter, ongoing.' },
      { slug: 'release-notes-automation', name: 'Release Notes Automation', why: 'Hours back per month, every month.' },
    ],
    quality: [
      { slug: 'ai-quality-retainer', name: 'AI Quality Retainer', why: 'Evals, dashboards, and regression triage as a service.' },
      { slug: 'reliability-retainer', name: 'Reliability Retainer', why: 'Quiet on-call, patched dependencies, observability tuned.' },
    ],
    cost: [
      { slug: 'stack-xray', name: 'Stack X-Ray', why: 'Annual cost review against actual usage.' },
      { slug: 'reliability-retainer', name: 'Reliability Retainer', why: 'Right-size infra and shed waste continuously.' },
    ],
    risk: [
      { slug: 'fractional-cto-retainer', name: 'Fractional CTO Retainer', why: 'Operator-grade leadership without the full-time hire.' },
      { slug: 'founders-tech-partner', name: "Founder's Tech Partner", why: 'Architecture and review for one founder, monthly.' },
    ],
  },
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
}

export function DecisionTree() {
  const [stage, setStage] = useState<Stage | null>(null)
  const [pain, setPain] = useState<Pain | null>(null)

  const recs = stage && pain ? REC_TABLE[stage][pain] : null

  useEffect(() => {
    if (stage && pain) {
      track('decision_tree_complete', { stage, pain })
    }
  }, [stage, pain])

  const reset = () => {
    setStage(null)
    setPain(null)
  }

  return (
    <div className="rounded-2xl border border-[#2A2826] bg-gradient-to-br from-[#12110F] via-[#12110F] to-[#0ED3CF]/[0.03] p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-4 h-4 text-[#0ED3CF]" />
        <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
          Find the right engagement
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 mb-6">
        <h2 className="text-2xl sm:text-3xl font-normal text-[#FAFAFA]">
          Three quick questions.
        </h2>
        {(stage || pain) && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#78716C] hover:text-[#FAFAFA] transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!stage && (
          <motion.div key="stage" {...fadeIn}>
            <p className="text-sm text-[#A8A29E] mb-4">
              <span className="text-[#0ED3CF]">1 / 2</span> · What stage are you in?
            </p>
            <motion.div
              className="grid sm:grid-cols-2 gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {STAGE_OPTS.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                  onClick={() => setStage(opt.value)}
                  className="text-left rounded-xl border border-[#2A2826] bg-[#1A1917] p-4 hover:border-[#0ED3CF]/40 hover:bg-[#0ED3CF]/5 transition-colors"
                >
                  <span className="text-base font-semibold text-[#FAFAFA] block">{opt.label}</span>
                  <span className="text-xs text-[#A8A29E] mt-1 block">{opt.sub}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {stage && !pain && (
          <motion.div key="pain" {...fadeIn}>
            <p className="text-sm text-[#A8A29E] mb-4">
              <span className="text-[#0ED3CF]">2 / 2</span> · Biggest pain right now?
            </p>
            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {PAIN_OPTS.map((opt) => (
                <motion.button
                  key={opt.value}
                  type="button"
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                  onClick={() => setPain(opt.value)}
                  className="text-left rounded-xl border border-[#2A2826] bg-[#1A1917] p-4 hover:border-[#0ED3CF]/40 hover:bg-[#0ED3CF]/5 transition-colors"
                >
                  <span className="text-base font-semibold text-[#FAFAFA] block">{opt.label}</span>
                  <span className="text-xs text-[#A8A29E] mt-1 block">{opt.sub}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {recs && (
          <motion.div
            key="recs"
            data-decision-tree-complete
            data-stage={stage}
            data-pain={pain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-sm text-[#A8A29E] mb-4">
              Based on{' '}
              <span className="text-[#FAFAFA] font-semibold">
                {STAGE_OPTS.find((s) => s.value === stage)?.label.toLowerCase()}
              </span>{' '}
              with a{' '}
              <span className="text-[#FAFAFA] font-semibold">
                {PAIN_OPTS.find((p) => p.value === pain)?.label.toLowerCase()}
              </span>{' '}
              pain, start here:
            </p>
            <motion.div
              className="grid md:grid-cols-3 gap-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07 } },
              }}
            >
              {recs.map((r) => (
                <motion.div
                  key={r.slug}
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                >
                  <Link
                    href={`/services/${r.slug}`}
                    className="group block rounded-xl border border-[#0ED3CF]/20 bg-[#0ED3CF]/[0.03] p-5 hover:border-[#0ED3CF]/50 hover:bg-[#0ED3CF]/[0.06] transition-colors h-full"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
                      Recommended
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
                      {r.name}
                    </h3>
                    <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{r.why}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-[#0ED3CF] group-hover:translate-x-0.5 transition-transform">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
