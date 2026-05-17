'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Shield,
  FileCheck,
  GitBranch,
  Cloud,
  TestTube,
  Lock,
  ExternalLink,
  CheckCircle2,
  MessageSquareQuote,
  Activity,
  Database,
  Clock,
  ScrollText,
  AlertTriangle,
} from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { Button } from '@/components/ui/button'
import { TestimonialCard } from '@/components/testimonial-card'
import { LogoStrip } from '@/components/logo-strip'
import { EvidenceStrip } from '@/components/evidence-strip'
import { references, trustedBy } from '@/data/references'
import { PageHeroBg } from '@/components/page-hero-bg'

const trustEvidence = [
  {
    src: '/artifacts/evidence/lighthouse-ci.svg',
    label: 'Performance',
    caption: 'Lighthouse CI gating every PR — perf, a11y, SEO, and best-practices budgets enforced before merge.',
  },
  {
    src: '/artifacts/evidence/playwright-report.svg',
    label: 'E2E Tests',
    caption: 'Playwright suite running on every commit — cross-browser regression coverage on critical user flows.',
  },
  {
    src: '/artifacts/evidence/github-actions-run.svg',
    label: 'CI/CD',
    caption: 'GitHub Actions pipeline: install → lint → typecheck → test → build → deploy — no manual steps.',
  },
  {
    src: '/artifacts/evidence/security-scan.svg',
    label: 'Security',
    caption: 'CodeQL + dependency review on every PR. Vulnerabilities surface before they ship, not after.',
  },
  {
    src: '/artifacts/evidence/landing-zone-ci.svg',
    label: 'Infra',
    caption: 'Terraform-managed AWS landing zone — IAM, OIDC, networking, all in version control.',
  },
  {
    src: '/artifacts/evidence/percy-diff.svg',
    label: 'Visual QA',
    caption: 'Percy visual regression on every deploy — pixel-level diff before changes hit production.',
  },
]

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

const certifications = [
  { provider: 'ISTQB', name: 'Certified Tester Foundation Level (CTFL)', category: 'testing' },
  { provider: 'ISTQB', name: 'Test Automation Engineer (TAE)', category: 'testing' },
  { provider: 'ISTQB', name: 'Certified Tester AI Testing (CT-AI)', category: 'testing' },
  { provider: 'AWS', name: 'Certified Cloud Practitioner', category: 'cloud' },
  { provider: 'AWS', name: 'Certified Solutions Architect — Associate', category: 'cloud' },
  { provider: 'AWS', name: 'Certified Developer — Associate', category: 'cloud' },
  { provider: 'AWS', name: 'Certified SysOps Administrator — Associate', category: 'cloud' },
  { provider: 'AWS', name: 'Certified DevOps Engineer — Professional', category: 'cloud' },
  { provider: 'Cisco', name: 'CCNA (Routing & Switching)', category: 'networking' },
]

const categoryColors: Record<string, string> = {
  testing: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20',
  cloud: 'text-[#0ED3CF] bg-[#0ED3CF]/10 border-[#0ED3CF]/20',
  networking: 'text-[#E85D3A] bg-[#E85D3A]/10 border-[#E85D3A]/20',
}

const codeQualityStandards = [
  'TypeScript strict mode (no implicit any, no unchecked returns)',
  'ESLint + Prettier configured and enforced in CI',
  'Husky pre-commit hooks (lint, type-check, test)',
  'Minimum test coverage: 60% line coverage enforced by CI gate',
  'All external API calls have error handling and retry logic',
  'No hardcoded secrets — all credentials via environment variables or AWS Secrets Manager',
  'Dependency audits: npm audit / pip audit in CI, no known critical vulnerabilities shipped',
]

const testingFrameworks = [
  { layer: 'Unit', frameworks: 'Jest, Vitest' },
  { layer: 'Component', frameworks: 'Testing Library' },
  { layer: 'API', frameworks: 'Supertest' },
  { layer: 'Contract', frameworks: 'Pact' },
  { layer: 'E2E', frameworks: 'Playwright, Cypress' },
  { layer: 'Performance', frameworks: 'k6, Lighthouse CI' },
  { layer: 'Security', frameworks: 'OWASP ZAP' },
  { layer: 'Accessibility', frameworks: 'Axe' },
  { layer: 'Visual regression', frameworks: 'Percy / Chromatic' },
  { layer: 'BDD', frameworks: 'Cucumber' },
]

const cicdStandards = [
  'TypeScript type check — every PR',
  'ESLint (zero warnings policy)',
  'Full unit test suite',
  'Build verification',
  'E2E smoke test',
  'Security scan (OWASP ZAP on deployment pipelines)',
  'Lighthouse CI performance budget check',
  'GitHub Actions for all CI/CD',
  'Environment segregation: dev / staging / production',
  'GitHub OIDC for AWS deployments (no long-lived credentials)',
  'Rollback capability on all production deployments',
]

const infraStandards = [
  'VPC with public/private subnet architecture',
  'S3 + CloudFront for static assets (no public bucket access)',
  'Lambda + API Gateway for serverless workloads',
  'GitHub OIDC for CI/CD authentication (no IAM user keys)',
  'AWS Secrets Manager for credential management',
  'CloudTrail + Security Hub enabled by default',
  'tfsec + checkov security scanning on all Terraform PRs',
]

const openSourceStats = [
  { value: '106', label: 'Public repositories' },
  { value: '1,438', label: 'Commits (last 12 months)' },
  { value: '57', label: 'Pull requests (last 12 months)' },
  { value: '27', label: 'GitHub followers' },
]

const sections = [
  { id: 'receipts', icon: Activity, label: 'Live receipts' },
  { id: 'certifications', icon: Shield, label: 'Certifications' },
  { id: 'quality', icon: FileCheck, label: 'Code Quality' },
  { id: 'testing', icon: TestTube, label: 'Testing' },
  { id: 'cicd', icon: GitBranch, label: 'CI/CD' },
  { id: 'infra', icon: Cloud, label: 'Infrastructure' },
  { id: 'data-handling', icon: Database, label: 'Data handling' },
  { id: 'guarantees', icon: ScrollText, label: 'Guarantees' },
  { id: 'honesty', icon: AlertTriangle, label: 'What could go wrong' },
  { id: 'oss', icon: Lock, label: 'Open Source' },
  { id: 'references', icon: MessageSquareQuote, label: 'References' },
]

const trustReceipts = [
  {
    metric: 'Reply window',
    value: '< 48h',
    detail: 'Well-matched inquiries get a response within two business days. No “I’ll get back to you” ghosting.',
    icon: Clock,
  },
  {
    metric: 'NDA on request',
    value: 'Same day',
    detail: 'Mutual NDA available before scope discussion. Template at /legal/nda — sign electronically, no lawyer required.',
    icon: FileCheck,
  },
  {
    metric: 'Production posture',
    value: 'Stripe + Supabase + AWS',
    detail: 'Same stack we ship for clients. Daily encrypted backups, IAM-scoped access, OIDC-only deploys.',
    icon: Shield,
  },
  {
    metric: 'Code transparency',
    value: 'Public repo',
    detail: 'This site’s source is open. Every commit is auditable history of how the studio actually operates.',
    icon: GitBranch,
  },
]

const dataHandling = [
  {
    label: 'Where data lives',
    body:
      'Customer data lives in Supabase (Postgres, US-East-2) and Stripe. No analytics platform stores PII beyond hashed identifiers — Vercel Analytics is privacy-first by design.',
  },
  {
    label: 'Retention',
    body:
      'Inquiry records: kept for two years from last contact, then auto-purged. Engagement artifacts: kept for the duration of the engagement plus 12 months unless an MSA specifies longer.',
  },
  {
    label: 'Access',
    body:
      'Service-role keys are server-side only. Row-level security on every customer-facing table. No third-party support seat has read access to customer data — the studio is one operator.',
  },
  {
    label: 'Sub-processors',
    body:
      'Vercel (hosting/CDN), Supabase (database & auth), Stripe (payments), Resend (transactional email), AWS (infrastructure for client work). Full list maintained on /legal/privacy.',
  },
  {
    label: 'Incident response',
    body:
      'Security incidents are disclosed to affected clients within 72 hours. Post-incident report includes root cause, blast radius, and remediation steps — no PR-spin.',
  },
  {
    label: 'Right to delete',
    body:
      'Email sage@sageideas.dev with a deletion request and your records are purged within five business days, including downstream caches and backups in the next rotation.',
  },
]

const guarantees = [
  {
    title: 'Fixed price means fixed price',
    body:
      'Quoted scope is what you pay. Scope changes require a written amendment and explicit approval before any additional work begins. No surprise invoices, ever.',
  },
  {
    title: 'Refund before work begins',
    body:
      'If we haven’t started, we issue a full refund. No questions, no friction. Once work begins, one-time engagements are non-refundable but always negotiable on outcome.',
  },
  {
    title: 'Cancel monthly anytime',
    body:
      'Site Care, Brand Care, Content Care, Scale, Operate, Content Engine — all cancel through Stripe in two clicks. Billed through end-of-cycle. No 12-month lock-ins.',
  },
  {
    title: 'Handoff that survives',
    body:
      'Every engagement ships with documentation, runbooks, and a knowledge-transfer call. The system survives without me on the next call — that’s the bar.',
  },
  {
    title: 'No bait-and-switch staffing',
    body:
      'The person who scopes the work is the person who builds it. There’s no “we’ll assign a team” — it’s one operator on every line of code.',
  },
]

const honestyItems = [
  {
    risk: 'You need a 10-person delivery team this quarter',
    truth:
      'Sage Ideas is one operator. We can do extraordinary depth on one or two parallel workstreams — not breadth across ten. If you need a staffing agency, we are the wrong fit and we will say so on the first call.',
  },
  {
    risk: 'You want a full-time, on-call, replace-your-CTO arrangement',
    truth:
      'Studio Engagement is up to 30 hours per week with defined response windows. It is not 24/7 on-call. If you need a fulltime engineering lead embedded in your team, hire one — we’ll help you scope the role.',
  },
  {
    risk: 'You’re shopping on price alone',
    truth:
      'Productized engagements start at $1,500 because that’s the floor at which the work is actually high-quality. There is no $500 audit. Cheap consulting is expensive when it’s wrong.',
  },
  {
    risk: 'You expect equity-only or revenue-share',
    truth:
      'For pre-revenue startups in specific circumstances, we’ll consider partial equity (cash + equity, not equity-only). Pure speculation arrangements are declined politely.',
  },
  {
    risk: 'You need someone to ship code fast and ask questions later',
    truth:
      'We scope before we build. Discovery and architecture come first — always. If you want a contractor who builds whatever you ask without pushback, we are the wrong choice.',
  },
]

export function TrustContent() {
  return (
    <div className="relative min-h-screen bg-[#09090B]">
          <PageHeroBg src="/images/hero-trust.jpg" />
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp} className="max-w-3xl">
          <SectionLabel>Evidence</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-normal text-[#FAFAFA] leading-tight">
            Why teams trust<br />the studio.
          </h1>
          <p className="mt-6 text-xl text-[#A8A29E] font-medium">We don&apos;t ask you to take our word for it. Here&apos;s the evidence.</p>
          <p className="mt-4 text-lg text-[#A8A29E] leading-relaxed">
            Trust in a software engagement comes from verifiable evidence, not assertions. Every claim on this page is
            backed by something you can check: a public GitHub repo, a certification verification link, a methodology
            document, a test suite count.
          </p>
        </motion.div>

        {/* Quick nav chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap gap-2 mt-10"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A8A29E] bg-[#12110F] border border-[#2A2826] rounded-full px-3 py-1.5 hover:border-[#0ED3CF] hover:text-[#0ED3CF] transition-colors"
            >
              <s.icon className="h-3 w-3" />
              {s.label}
            </a>
          ))}
        </motion.div>
      </section>

      {/* Certifications */}
      {/* Live receipts */}
      <section id="receipts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>Live receipts</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            What we promise, in numbers.
          </h2>
          <p className="text-[#A8A29E] text-base leading-relaxed max-w-3xl">
            Operational facts that should be true before you send a deposit. Each one is something you can verify
            today.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {trustReceipts.map((r, i) => {
            const Icon = r.icon
            return (
              <motion.div
                key={r.metric}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5 hover:border-[#0ED3CF]/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-[#0ED3CF]/10">
                    <Icon className="h-4 w-4 text-[#0ED3CF]" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
                    {r.metric}
                  </span>
                </div>
                <div className="text-xl font-bold text-[#FAFAFA] mb-2 leading-tight">{r.value}</div>
                <p className="text-xs text-[#A8A29E] leading-relaxed">{r.detail}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Evidence strip — real artifacts from real shipped infrastructure */}
      <section id="evidence" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div {...fadeInUp} className="mb-2">
          <SectionLabel>Evidence</SectionLabel>
        </motion.div>
        <EvidenceStrip
          items={trustEvidence}
          heading="Receipts from real shipped infrastructure."
          blurb="These are not stock images. Every tile below maps to a real artifact in the public repo — CI logs, test reports, scans, and infra configs. Click into the source to verify."
          linkArtifacts
        />
      </section>

      <section id="certifications" className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-[#0ED3CF]" />
              <SectionLabel>Certifications</SectionLabel>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-3">
              9 active certifications across testing, cloud, and networking.
            </h2>
            <p className="text-[#78716C] text-sm mb-2">
              All certifications are active. Verification links available on request — just ask during a discovery call.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
            {certifications.map((cert, i) => (
              <motion.div
                key={cert.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-3 p-4 bg-[#09090B] border border-[#2A2826] rounded-xl"
              >
                <div className={`mt-0.5 px-2 py-0.5 text-xs font-mono rounded border flex-shrink-0 ${categoryColors[cert.category]}`}>
                  {cert.provider}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#FAFAFA]">{cert.name}</p>
                  <p className="text-xs text-[#78716C] mt-0.5">Active</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Quality */}
      <section id="quality" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <FileCheck className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>Code Quality</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            Every project ships with these standards enforced.
          </h2>
        </motion.div>
        <div className="space-y-3 max-w-3xl mt-8">
          {codeQualityStandards.map((std, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex items-start gap-3 p-4 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 flex-shrink-0" />
              <span className="text-[#A8A29E] text-sm">{std}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testing Infrastructure */}
      <section id="testing" className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-2">
              <TestTube className="h-5 w-5 text-[#0ED3CF]" />
              <SectionLabel>Testing Infrastructure</SectionLabel>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
              13 testing frameworks. Every layer covered.
            </h2>
            <p className="text-[#A8A29E] mb-3">
              See the{' '}
              <Link href="/work/quality-telemetry" className="text-[#0ED3CF] hover:text-[#22D3EE]">
                Quality Telemetry case study
              </Link>{' '}
              for the full architecture.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8 max-w-4xl">
            {testingFrameworks.map((fw, i) => (
              <motion.div
                key={fw.layer}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="p-4 bg-[#09090B] border border-[#2A2826] rounded-xl"
              >
                <p className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF] mb-2">{fw.layer}</p>
                <p className="text-sm text-[#A8A29E]">{fw.frameworks}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CI/CD Standards */}
      <section id="cicd" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>CI/CD Standards</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            No code ships without passing CI gates.
          </h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mt-8">
          {cicdStandards.map((std, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 flex-shrink-0" />
              <span className="text-[#A8A29E] text-sm">{std}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Infrastructure Standards */}
      <section id="infra" className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="h-5 w-5 text-[#0ED3CF]" />
              <SectionLabel>Infrastructure</SectionLabel>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
              Terraform-managed. Security-scanned. Auditable.
            </h2>
            <p className="text-[#A8A29E] mb-8">All infrastructure provisioned via Terraform.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
            {infraStandards.map((std, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex items-start gap-3 p-3 bg-[#09090B] border border-[#2A2826] rounded-xl"
              >
                <Lock className="h-4 w-4 text-[#0ED3CF] mt-0.5 flex-shrink-0" />
                <span className="text-[#A8A29E] text-sm">{std}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section id="oss" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>Open-Source Record</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            106 public repositories. 1,438 commits in the last year.
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-2xl">
            All open-source projects are publicly available and maintained. The commit history is not curated for
            appearances — it&apos;s the actual development record.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mb-10">
          {openSourceStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center p-4 bg-[#12110F] border border-[#2A2826] rounded-xl"
            >
              <p className="text-3xl font-normal text-[#FAFAFA] font-mono">{stat.value}</p>
              <p className="text-xs text-[#78716C] mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            asChild
            className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold"
          >
            <a href="https://github.com/JasonTeixeira" target="_blank" rel="noopener noreferrer">
              View GitHub profile
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </section>

      {/* Data handling */}
      <section id="data-handling" className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-[#0ED3CF]" />
              <SectionLabel>Data handling</SectionLabel>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
              Where your data lives, who can read it, and how long.
            </h2>
            <p className="text-[#A8A29E] text-base leading-relaxed max-w-3xl">
              The facts. No SOC-2 certificate yet — the studio is too young to have one. Here’s the operational
              equivalent: a plain-English description of how the studio handles client data, sub-processors, and
              incidents.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {dataHandling.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border border-[#2A2826] bg-[#0B0A09] p-5"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF] mb-2">
                  {d.label}
                </div>
                <p className="text-sm text-[#D4D4D8] leading-relaxed">{d.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section id="guarantees" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <ScrollText className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>Engagement guarantees</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            What we put in writing.
          </h2>
          <p className="text-[#A8A29E] text-base leading-relaxed max-w-3xl">
            Every engagement signs an MSA + SOW. These five guarantees show up in every one of them — not as
            marketing copy, as contractual terms.
          </p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {guarantees.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5 hover:border-[#10B981]/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                <h3 className="text-sm font-semibold text-[#FAFAFA]">{g.title}</h3>
              </div>
              <p className="text-sm text-[#A8A29E] leading-relaxed">{g.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Honesty / what could go wrong */}
      <section id="honesty" className="bg-[#12110F] border-y border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div {...fadeInUp}>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              <SectionLabel>What could go wrong</SectionLabel>
            </div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
              Here’s when we are the wrong fit.
            </h2>
            <p className="text-[#A8A29E] text-base leading-relaxed max-w-3xl">
              The fastest way to lose your time and ours is pretending we’re right for every situation. We aren’t.
              These are the most common mismatches — if you see yourself here, save us both a discovery call.
            </p>
          </motion.div>
          <div className="space-y-4 mt-10 max-w-4xl">
            {honestyItems.map((h, i) => (
              <motion.div
                key={h.risk}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border border-[#2A2826] bg-[#0B0A09] p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-md bg-[#F59E0B]/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#FAFAFA] mb-2">If — {h.risk}</div>
                    <p className="text-sm text-[#A8A29E] leading-relaxed">{h.truth}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* References */}
      <section id="references" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div {...fadeInUp}>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquareQuote className="h-5 w-5 text-[#0ED3CF]" />
            <SectionLabel>References</SectionLabel>
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-normal text-[#FAFAFA] mb-4">
            Talk to past collaborators directly.
          </h2>
          <p className="text-[#A8A29E] text-base leading-relaxed max-w-3xl">
            Sage Ideas is a young studio. Rather than ship cherry-picked
            testimonials, every prospective client gets the option to talk
            directly to people I&apos;ve built things with — fintech engineers,
            founders, ops leads. Real phone numbers, real conversations, no
            scripts.
          </p>
        </motion.div>
        <div className="mt-10">
          <LogoStrip
            entries={trustedBy}
            label="Industries shipped into"
            blurb="Most engagements run under NDA. Names withheld until written permission lands."
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {references.map((r, i) => (
            <TestimonialCard key={r.id} reference={r} index={i} />
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm text-[#78716C] mt-8 max-w-3xl"
        >
          Reference contact details are shared with prospective clients during
          discovery, with both parties&apos; consent. As the client roster grows,
          quoted testimonials will replace this honest stub — not before.
        </motion.p>
      </section>

      {/* CTA */}
      <section className="bg-[#12110F] border-t border-[#2A2826]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap gap-4 items-center"
          >
            <Button
              asChild
              variant="outline"
              className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
            >
              <Link href="/process">
                See our process
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold"
            >
              <Link href="/book">
                Book a call
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
