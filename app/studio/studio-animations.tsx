'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Code2, Cpu, Users, XCircle } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { MetricCounter } from '@/components/metric-counter'
import { Button } from '@/components/ui/button'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

// Inlined here so the parent server component never has to pass icon
// components (functions) across the server/client boundary.
const pillars = [
  {
    icon: Code2,
    title: 'We build what we operate',
    description:
      'Every service offering at Sage Ideas is something we use ourselves. The infrastructure patterns we sell are the same ones running our own products. The AI workflows we build for clients are the same ones powering our lab. We don’t pitch theory — we ship proof.',
    accent: 'cyan' as const,
  },
  {
    icon: Cpu,
    title: 'AI-native by default',
    description:
      'We don’t bolt AI onto existing workflows. We design systems where AI acceleration is assumed from day one — in code generation, in testing, in content pipelines, in customer-facing features. This isn’t a trend we adopted; it’s how we’ve built since 2024.',
    accent: 'cyan' as const,
  },
  {
    icon: Users,
    title: 'Solo studio, agency rigor',
    description:
      'One person running a production-grade process: CI/CD gates, contract testing, Lighthouse budgets, accessibility audits, security scans, idempotent webhooks, RLS policies, SOC2-aware architecture. The output is indistinguishable from a five-person agency, shipped on a solo timeline.',
    accent: 'cyan' as const,
  },
] as const

const nonServices = [
  'Enterprise sales engagements (six-month procurement cycles, vendor panels)',
  'Agencies-of-agencies (no subcontracting the work to another team)',
  'Design-only engagements (brand decks, mockups without implementation)',
  'Native mobile-first builds (iOS/Android apps as the primary deliverable)',
  'Support-only retainers (helpdesk, ticketing, on-call without a build component)',
]

const metrics = [
  { value: '6', label: 'Live Products' },
  { value: '106', label: 'GitHub Repos' },
  { value: '1,438', label: 'Commits / Year' },
  { value: '9', label: 'Active Certs' },
]

const stackCategories = [
  { label: 'Frontend', items: 'Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Framer Motion' },
  { label: 'Backend', items: 'FastAPI, Python, Node.js' },
  { label: 'Data', items: 'PostgreSQL, Supabase, DynamoDB, S3' },
  { label: 'Infrastructure', items: 'AWS (Lambda, ECS, SES, DynamoDB, S3, CloudFront), Terraform, GitHub OIDC' },
  { label: 'AI/ML', items: 'OpenAI API, Anthropic Claude, XGBoost, LightGBM, scikit-learn, LangChain' },
  { label: 'Testing', items: 'Playwright, Jest, Vitest, Testing Library, Supertest, Pact, k6, Lighthouse CI, OWASP ZAP, Axe' },
]

export function StudioAnimations() {
  return (
    <div>
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>About</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-bold text-[#FAFAFA] leading-tight">
            The studio.
          </h1>
          <h2 className="mt-6 text-2xl font-semibold text-[#A8A29E]">
            One engineer. One LLC. Years of compounded decisions and shipped systems.
          </h2>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
            Sage Ideas LLC was founded in 2024 with a specific thesis: that the right process, the right infrastructure,
            and AI-native development practices allow a single practitioner to build and ship software at a quality level
            that matches a small agency — with the added benefit of direct accountability.
          </p>
          <p className="mt-4 text-lg text-[#A8A29E] leading-relaxed">
            Before the studio, Jason Teixeira spent five years as a fintech engineer at HighStrike (2021–2026) — building
            trading infrastructure, market data systems, and real-time financial applications that handled production load.
            That&apos;s where the engineering discipline came from: systems that don&apos;t fail on a volatile trading day demand
            a level of rigor that carries over into everything since.
          </p>
          <p className="mt-4 text-[#78716C]">The studio operates out of Orlando, FL. Remote-first by default.</p>
        </motion.div>
      </section>

      {/* Pillars */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <SectionLabel>Pillars</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA]">How we think about the work</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <GlowCard className="h-full">
                  <div className="p-8">
                    <div className="p-3 bg-[#0ED3CF]/10 rounded-xl w-fit mb-6">
                      <pillar.icon className="h-6 w-6 text-[#0ED3CF]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#FAFAFA] mb-3">{pillar.title}</h3>
                    <p className="text-[#A8A29E] text-sm leading-relaxed">{pillar.description}</p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How the studio works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>Engagement Model</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-8">How the studio works</h2>
          <div className="space-y-6 text-[#A8A29E] text-lg leading-relaxed">
            <p>
              Clients work with Jason directly — not an account manager, not a project coordinator, not a handoff to a
              handoff team after the sales call. The same person who scoped the project is the person building it. That
              accountability is structural, not a feature we sell.
            </p>
            <p>
              Every engagement follows the same methodology: Discover → Architect → Build → Operate. The scope is defined
              in writing before work begins. The price in the proposal is the price you pay — no &quot;starting from,&quot;
              no surprise overages.
            </p>
            <p>
              Engagements are productized by tier: Audit ($1,500), Ship (from $5,000), Automate (from $8,000), Build
              (from $25,000), Scale, and Operate. Each tier has a defined scope and defined deliverables. You know what
              you&apos;re getting before you sign anything.
            </p>
            <p>
              Larger agencies have their place — complex team coordination, ongoing managed services at scale, 24/7
              support organizations. For discrete software products, AI workflows, and infrastructure architecture, a
              studio of one with the right process is faster, more accountable, and more consistent.
            </p>
          </div>
        </motion.div>
      </section>

      {/* What we don't do */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp} className="max-w-3xl">
            <SectionLabel>Scope</SectionLabel>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4">What we don&apos;t do</h2>
            <p className="text-[#A8A29E] mb-8 text-lg">
              Self-qualification matters. These are honest limits — not failures, just not the right fit for this studio.
            </p>
            <div className="space-y-4">
              {nonServices.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-start gap-3 p-4 bg-[#09090B] border border-[#2A2826] rounded-xl"
                >
                  <XCircle className="h-5 w-5 text-[#78716C] mt-0.5 flex-shrink-0" />
                  <span className="text-[#A8A29E]">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* The values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Values</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-12">The values, plainly stated.</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
          {[
            {
              title: 'Ship over present.',
              body: 'We prefer working software over polished decks. Every engagement ends with deployed, tested code — not a recommendations document.',
            },
            {
              title: 'Evidence over assertion.',
              body: "We don't claim quality. We document it. Test suites, Lighthouse scores, CI gates, cert verifications — the evidence is always available.",
            },
            {
              title: 'Fixed scope, honest price.',
              body: "We've seen what scope ambiguity does to client relationships. Every engagement has a scope document. The price in the proposal is the price you pay.",
            },
            {
              title: 'Build to last.',
              body: "We build systems we'd be comfortable maintaining in two years. TypeScript strict mode, documented architecture decisions, runbooks for failure modes.",
            },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <GlowCard className="h-full">
                <div className="p-6">
                  <h3 className="font-semibold text-[#FAFAFA] mb-2">{v.title}</h3>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">{v.body}</p>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-10"
          >
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <MetricCounter value={m.value} label={m.label} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The stack */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <SectionLabel>Stack</SectionLabel>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-4">The stack.</h2>
          <p className="text-[#A8A29E] mb-10 max-w-2xl">Full stack from UI to infrastructure. Every layer chosen for production reliability, not demo convenience.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {stackCategories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-5 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <p className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF] mb-2">{cat.label}</p>
              <p className="text-sm text-[#A8A29E] leading-relaxed">{cat.items}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6"
        >
          <Link
            href="/stack"
            className="inline-flex items-center text-[#0ED3CF] hover:text-[#22D3EE] text-sm font-medium transition-colors group"
          >
            See the full stack reference
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* CTAs */}
      <section className="bg-[#12110F] border-t border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
              <Link href="/founder">
                Read the founder story
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent px-8"
            >
              <Link href="/work">
                See the work
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
