'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Search, PenTool, Hammer, Server, MessageSquare, ChevronDown } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { Button } from '@/components/ui/button'
import { ArtifactGallery } from '@/components/artifact-gallery'
import { useState } from 'react'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

const steps = [
  {
    number: '01',
    name: 'Discover',
    icon: Search,
    headline: 'Define the problem before designing the solution.',
    body: 'Before any code is written, we map the problem space. What are the business outcomes? What does success look like in 30 days, 90 days, 12 months? What are the constraints — technical, budget, timeline, organizational?',
    deliverables: [
      { label: 'Audit', items: 'Asset inventory + assessment framework' },
      { label: 'Ship / Automate', items: 'Scope document + tech stack confirmation' },
      { label: 'Build', items: 'Architecture brief + data model draft + integration map' },
      { label: 'Operate', items: 'Technical health assessment + 90-day priority stack' },
    ],
    note: 'No engagement proceeds to Architect without a signed scope document.',
    duration: '1–3 days depending on engagement size',
  },
  {
    number: '02',
    name: 'Architect',
    icon: PenTool,
    headline: 'Design the system before you build it.',
    body: 'Architecture decisions are the most expensive mistakes to fix retroactively. We design before we code. The architecture review is the last checkpoint where scope changes are inexpensive. After this, we\'re building.',
    deliverables: [
      { label: 'System design', items: 'Component diagram, data flow, external dependencies' },
      { label: 'Database schema', items: 'Entity-relationship model, RLS policy map' },
      { label: 'API contracts', items: 'Endpoints, request/response shapes, auth patterns' },
      { label: 'Stack confirmation', items: 'Frameworks, services, deployment targets' },
      { label: 'Risk register', items: 'What could go wrong, mitigation plan' },
    ],
    duration: '1–5 days depending on complexity',
  },
  {
    number: '03',
    name: 'Build',
    icon: Hammer,
    headline: 'Production-grade from the first commit.',
    body: "We don't build prototypes and then rebuild them as production systems. We build production systems from the first line of code — typed, tested, and CI-gated.",
    deliverables: [
      { label: 'TypeScript strict mode', items: 'No implicit any, no unchecked returns' },
      { label: 'CI/CD active from day one', items: 'No "add tests later" — gates run on every PR' },
      { label: 'Test coverage minimum', items: 'Unit tests for all business logic, integration tests for all API endpoints' },
      { label: 'Code review', items: 'All PRs reviewed against architecture spec' },
      { label: 'Progress updates', items: 'Weekly async written summary + available for sync call' },
      { label: 'Open development', items: 'Access to the development branch throughout — no black-box development' },
    ],
    duration: 'Varies by tier (2 weeks → 12 weeks)',
  },
  {
    number: '04',
    name: 'Operate',
    icon: Server,
    headline: 'Ship, then stand behind it.',
    body: "Every engagement ends with production deployment, documentation, and a defined handoff. We don't ship and disappear. For ongoing Scale, Operate, and Care retainers (Site Care, Brand Care, Content Care), this step is a continuous loop — monthly deliverables, monthly health reports, continuous improvement.",
    deliverables: [
      { label: 'Production deployment', items: 'Deployed to your infrastructure' },
      { label: 'Environment docs', items: 'Configuration documentation for every environment' },
      { label: 'Runbook', items: 'Common failure modes and resolution steps' },
      { label: '30-day bug warranty', items: 'Defects only, not new features' },
      { label: 'Handoff call', items: 'Walkthrough + Q&A' },
      { label: 'Optional Care retainer', items: 'Site, Brand, or Content Care to keep momentum' },
    ],
    duration: 'Ongoing for Scale, Operate, and Care retainers',
  },
]

const cadence = [
  {
    icon: MessageSquare,
    title: 'Weekly progress updates',
    body: 'Written async summary every week — what shipped, what\'s next, any decisions needed from you.',
  },
  {
    icon: MessageSquare,
    title: 'Async via Slack or Linear',
    body: 'Day-to-day communication happens async. You have visibility into the work without needing to manage it.',
  },
  {
    icon: MessageSquare,
    title: 'No ghost mode',
    body: "If something changes, I tell you immediately. Surprises only happen when people don't communicate — we communicate.",
  },
]

const faqs = [
  {
    q: 'Do I need to be involved throughout the build?',
    a: 'Checkpoints are defined, not constant. Expect 2–3 async touchpoints per week and one sync call per milestone. You shouldn\'t need to manage the work — just review it.',
  },
  {
    q: 'What if requirements change after we\'ve started?',
    a: 'Changes happen. Any change to the signed scope is documented, estimated, and approved before work begins on the new scope. No silent additions.',
  },
  {
    q: 'How do I know the code is actually production quality?',
    a: 'You have access to the development branch throughout the engagement. CI gates are public. The test suite runs on every PR. Lighthouse scores are documented. Evidence, not assertion.',
  },
  {
    q: 'What happens if something breaks after delivery?',
    a: 'Every engagement includes a 30-day bug warranty — defects in the delivered scope are fixed at no additional cost. New features or scope changes are scoped separately.',
  },
  {
    q: 'How are multi-week engagements billed?',
    a: 'Audit, Ship, Automate, SEO Sprint, Brand Sprint: paid in full before work begins. Build: 50% upfront, 50% on delivery. Scale, Operate, and Care retainers (Site Care, Brand Care, Content Care): monthly subscription, cancel anytime after the minimum commitment period.',
  },
  {
    q: 'What if my project does not fit a productized tier?',
    a: 'Custom engagements and retainers are always available. The productized tiers are starting points, not ceilings. If you need a different scope, a different cadence, or a hybrid of multiple tiers, we shape a SOW around what you actually need. Email sage@sageideas.dev with a short brief and we can talk through it.',
  },
  {
    q: 'Can I combine a productized tier with an ongoing retainer?',
    a: 'Yes — that is a common pattern. A Brand Sprint plus Brand Care, a Build plus Operate, or an SEO Sprint plus Content Care. The productized engagement does the heavy lift; the retainer keeps the momentum.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[#2A2826]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[#FAFAFA] font-medium group-hover:text-[#0ED3CF] transition-colors pr-4">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-[#78716C] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-5 text-[#A8A29E] text-sm leading-relaxed">{a}</div>
      )}
    </div>
  )
}

export function ProcessContent() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>Methodology</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-bold text-[#FAFAFA] leading-tight">
            Four steps.<br />No surprises.
          </h1>
          <p className="mt-6 text-xl text-[#A8A29E] leading-relaxed">
            Every engagement follows the same four-step methodology. The details change by tier. The discipline doesn&apos;t.
          </p>
          <p className="mt-4 text-lg text-[#A8A29E] leading-relaxed">
            There are two ways to build software: make it up as you go, or follow a process that&apos;s been refined across
            dozens of projects. The Sage Ideas methodology exists because we&apos;ve seen what happens without it — and
            we&apos;ve seen what becomes possible with it.
          </p>
        </motion.div>
      </section>

      {/* 4 Steps */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <GlowCard>
                  <div className="p-8 lg:p-10">
                    <div className="grid lg:grid-cols-5 gap-8">
                      {/* Step header */}
                      <div className="lg:col-span-2">
                        <div className="flex items-center gap-4 mb-4">
                          <span
                            aria-hidden="true"
                            className="text-5xl font-bold text-[#2A2826] font-mono leading-none select-none"
                          >
                            {step.number}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <step.icon className="h-5 w-5 text-[#0ED3CF]" />
                              <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">Step {step.number}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#FAFAFA]">{step.name}</h2>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-[#FAFAFA] mb-3">{step.headline}</h3>
                        <p className="text-[#A8A29E] text-sm leading-relaxed">{step.body}</p>
                        {step.note && (
                          <p className="mt-3 text-xs text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/20 rounded-lg px-3 py-2">
                            {step.note}
                          </p>
                        )}
                        <p className="mt-4 text-xs text-[#78716C] font-mono">
                          Duration: {step.duration}
                        </p>
                      </div>

                      {/* Deliverables */}
                      <div className="lg:col-span-3">
                        <p className="text-xs font-mono uppercase tracking-widest text-[#78716C] mb-4">
                          Deliverables
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {step.deliverables.map((d) => (
                            <div
                              key={d.label}
                              className="p-3 bg-[#09090B] border border-[#2A2826] rounded-lg"
                            >
                              <p className="text-xs font-semibold text-[#FAFAFA] mb-1">{d.label}</p>
                              <p className="text-xs text-[#78716C]">{d.items}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual proof — what each step actually produces */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-[#2A2826]">
        <motion.div {...fadeInUp} className="mb-12">
          <SectionLabel>Evidence</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] tracking-tight">
            What each step actually produces.
          </h2>
          <p className="text-[#A8A29E] mt-4 max-w-2xl leading-relaxed">
            Every engagement leaves a paper trail. Architecture diagrams from
            <span className="text-[#FAFAFA]"> Architect</span>, CI runs from
            <span className="text-[#FAFAFA]"> Build</span>, dashboards and
            scan output from <span className="text-[#FAFAFA]">Operate</span>.
            These are real artifacts from real engagements — not stock illustrations.
          </p>
        </motion.div>
        <ArtifactGallery
          eyebrow=""
          artifacts={[
            {
              src: '/images/diagrams/aws-landing-zone.svg',
              kind: 'diagram',
              label: 'Architect · system design',
              aspect: 'wide',
              caption: 'A signed scope document before any code ships. Component diagrams, data flow, RLS policy maps, and API contracts — we never “figure it out as we go.”',
            },
            {
              src: '/artifacts/evidence/github-actions-run.svg',
              kind: 'terminal',
              label: 'Build · CI run',
              aspect: 'video',
              caption: 'Lint, typecheck, unit, contract, and E2E gates pass on every PR. The build is the deliverable that lets the next deploy be boring.',
            },
            {
              src: '/artifacts/evidence/playwright-report.svg',
              kind: 'report',
              label: 'Build · E2E coverage',
              aspect: 'video',
              caption: 'Test reports stakeholders can actually read — critical journeys, what passed, what was skipped and why.',
            },
            {
              src: '/artifacts/evidence/lighthouse-ci.svg',
              kind: 'dashboard',
              label: 'Operate · quality budget',
              aspect: 'video',
              caption: 'Performance and accessibility budgets enforced in CI. The site never silently gets slower or less accessible after launch.',
            },
          ]}
          columns={2}
        />
      </section>

      {/* Communication cadence */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Communication</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4">What you can expect.</h2>
          <p className="text-[#A8A29E] mb-10 max-w-2xl">
            Predictable, documented communication. No chasing updates. No wondering where your project is.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl">
          {cadence.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <div className="w-2 h-2 bg-[#0ED3CF] rounded-full mb-4" />
              <h3 className="font-semibold text-[#FAFAFA] mb-2">{item.title}</h3>
              <p className="text-sm text-[#A8A29E] leading-relaxed">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-10">Common questions.</h2>
          </motion.div>
          <div className="max-w-3xl">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          <Button
            asChild
            className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold px-8"
          >
            <Link href="/pricing">
              See pricing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent px-8"
          >
            <Link href="/book">
              Book a call
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  )
}
