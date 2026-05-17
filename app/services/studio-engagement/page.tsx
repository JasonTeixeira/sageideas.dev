import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Lock, Calendar, FileLock } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { HeroMotionLayer } from '@/components/hero-motion-layer'
import { JsonLd } from '@/components/json-ld'

const SITE = 'https://www.sageideas.dev'

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Studio Engagement',
  url: `${SITE}/services/studio-engagement`,
  provider: {
    '@type': 'Organization',
    name: 'Sage Ideas LLC',
    url: SITE,
  },
  description:
    'Quarterly embedded studio engagement for founders shipping production fintech, AI-native, or billing-grade software. By application only.',
  serviceType: 'Embedded Engineering Engagement',
  areaServed: { '@type': 'Country', name: 'United States' },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '25000',
    availability: 'https://schema.org/LimitedAvailability',
    url: `${SITE}/contact?type=studio&source=studio-engagement`,
    eligibleQuantity: { '@type': 'QuantitativeValue', minValue: 1, unitText: 'quarter' },
  },
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE}/services` },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Studio Engagement',
      item: `${SITE}/services/studio-engagement`,
    },
  ],
}

export const metadata: Metadata = {
  title: 'Studio Engagement — By application',
  description:
    'A quarterly studio engagement for founders who want production fintech-grade software shipped under one keyboard. By application only.',
  alternates: { canonical: `${SITE}/services/studio-engagement` },
  openGraph: {
    title: 'Studio Engagement',
    description: 'By application only. Quarterly minimum. One operator, one keyboard.',
    url: `${SITE}/services/studio-engagement`,
    images: [
      {
        url: '/og?title=Studio+Engagement&subtitle=By+application+only',
      },
    ],
  },
}

const fitFor = [
  'You\u2019re shipping a production fintech, AI-native, or billing-grade product and the wrong architecture decision costs you a quarter.',
  'You\u2019ve hired agencies before and the handoff is the part that always breaks.',
  'You want one accountable engineer through scoping, build, deploy, and the first 90 days of operation.',
  'Your engagement runs at least one full quarter and you want commit-level visibility weekly.',
]

const notFitFor = [
  'You need a marketing site or a one-time sprint \u2014 use the productized tiers.',
  'You want a project manager and three handoffs \u2014 use a traditional agency.',
  'You\u2019re evaluating five vendors in parallel and lowest bid wins.',
  'You have not yet decided whether to build the thing.',
]

const includes = [
  {
    title: 'Founder-grade scoping',
    body:
      'A signed scope document before week one \u2014 architecture diagrams, data model, API contracts, the rollback plan for every shipped surface. No \u201cwe\u2019ll figure it out as we go.\u201d',
  },
  {
    title: 'One keyboard, end-to-end',
    body:
      'The person on every call is the person typing every commit. No offshore handoff, no swap-in resource inheriting the runway.',
  },
  {
    title: 'Production-grade by default',
    body:
      'CI/CD gates, typed APIs, idempotent webhooks, additive migrations, RLS where it belongs, the 30-second rollback rule on every change. The same standards Sage Ideas runs on its own production fintech.',
  },
  {
    title: 'Weekly written changelog',
    body:
      'A Monday changelog with what shipped, what\u2019s shipping, what\u2019s blocked. No status calls that should have been emails.',
  },
  {
    title: '90-day operate window',
    body:
      'After build, the first 90 days of production are covered \u2014 monitoring, on-call coverage, incident response, the runbooks, the documentation handoff. We don\u2019t ship and disappear.',
  },
  {
    title: 'IP, source, and runbook handoff',
    body:
      'You own the code. You own the infrastructure. You receive a documented handoff package that survives without us on the next call.',
  },
]

const cadence = [
  {
    label: 'Weeks 1\u20132',
    title: 'Scope and architect',
    body:
      'System design, data model, API contracts, rollback plan, scope sign-off. No code shipped yet \u2014 on purpose.',
  },
  {
    label: 'Weeks 3\u20139',
    title: 'Build and ship',
    body:
      'Production code behind feature flags. Daily commits, weekly changelog, fortnightly architecture reviews with you in the room.',
  },
  {
    label: 'Weeks 10\u201312',
    title: 'Stabilize and handoff',
    body:
      'Hardening, runbooks, monitoring, documentation. By week 12 the studio could disappear and the system would keep running.',
  },
  {
    label: 'Optional months 4\u20136',
    title: 'Operate or extend',
    body:
      'Continue as a fractional CTO retainer, scope the next quarter, or hand off to your team \u2014 your choice, agreed in advance.',
  },
]

export default function StudioEngagementPage() {
  return (
    <>
      <JsonLd data={[serviceSchema, breadcrumbSchema]} />
      {studioEngagementContent()}
    </>
  )
}

function studioEngagementContent() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#2A2826]">
        <HeroMotionLayer intensity="low" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0ED3CF]/30 bg-[#0ED3CF]/[0.06] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-6">
            <Lock className="w-3 h-3" /> By application only
          </div>
          <SectionLabel>Studio Engagement</SectionLabel>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FAFAFA] tracking-tight leading-[1.05]">
            One quarter. One keyboard.
            <br />
            <span className="text-[#0ED3CF]">Production-grade software</span>
            <br /> shipped end-to-end.
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-[#A8A29E] leading-relaxed max-w-2xl">
            For founders who don&rsquo;t want a vendor &mdash; they want the
            studio embedded for a quarter. Productized tiers exist for the work
            that fits a checkbox. This is for the work that doesn&rsquo;t.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-2">
                Investment
              </div>
              <div className="text-2xl font-bold text-[#FAFAFA]">Starts at $25k / quarter</div>
              <div className="text-xs text-[#78716C] mt-1.5">
                Custom-quoted after scoping. No surprises after sign-off.
              </div>
            </div>
            <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-2">
                Cadence
              </div>
              <div className="text-2xl font-bold text-[#FAFAFA]">12 weeks minimum</div>
              <div className="text-xs text-[#78716C] mt-1.5">
                Weekly changelog. Fortnightly architecture review.
              </div>
            </div>
            <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C] mb-2">
                Capacity
              </div>
              <div className="text-2xl font-bold text-[#FAFAFA]">3 slots / year</div>
              <div className="text-xs text-[#78716C] mt-1.5">
                One operator. The math is the constraint.
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/contact?type=studio&source=studio-engagement"
              className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Apply for a quarter
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 border border-[#2A2826] hover:border-[#0ED3CF]/50 text-[#FAFAFA] px-6 py-3 rounded-lg transition-colors"
            >
              Book a discovery call first
            </Link>
            <span className="text-xs font-mono text-[#78716C] ml-1">
              Replies within 48 business hours
            </span>
          </div>
        </div>
      </section>

      {/* Fit / not fit */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <SectionLabel>Built for</SectionLabel>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-6 leading-tight">
              You should apply if&hellip;
            </h2>
            <ul className="space-y-3">
              {fitFor.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-[#D4D4D8] leading-relaxed"
                >
                  <Check className="w-4 h-4 text-[#0ED3CF] mt-1 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel color="violet">Not built for</SectionLabel>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-6 leading-tight">
              You should not apply if&hellip;
            </h2>
            <ul className="space-y-3">
              {notFitFor.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-[#A8A29E] leading-relaxed"
                >
                  <span className="font-mono text-[#78716C] text-sm pt-0.5 shrink-0">
                    &mdash;
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-[#78716C]">
              For one-shot work, see the{' '}
              <Link
                href="/pricing"
                className="text-[#0ED3CF] hover:text-[#22D3EE] underline-offset-4 hover:underline"
              >
                productized tiers
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* What it includes */}
      <section className="border-y border-[#2A2826] bg-[#0B0A09]/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <SectionLabel>What it includes</SectionLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-12 leading-tight max-w-3xl">
            What you actually get for one quarter of the studio.
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {includes.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6 hover:border-[#0ED3CF]/30 transition-colors"
              >
                <h3 className="text-lg font-semibold text-[#FAFAFA] mb-2">
                  {item.title}
                </h3>
                <p className="text-[#A8A29E] leading-relaxed text-sm">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cadence */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <SectionLabel>Cadence</SectionLabel>
        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-10 leading-tight max-w-3xl">
          Twelve weeks. One operator. Predictable rhythm.
        </h2>
        <div className="space-y-3">
          {cadence.map((p, i) => (
            <div
              key={p.title}
              className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6 grid md:grid-cols-[180px_1fr] gap-4 items-start"
            >
              <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#0ED3CF]">
                  Phase {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-sm font-mono text-[#A8A29E]">{p.label}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#FAFAFA] mb-1.5">
                  {p.title}
                </h3>
                <p className="text-[#A8A29E] leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How application works */}
      <section className="border-y border-[#2A2826] bg-[#0B0A09]/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <SectionLabel>How the application works</SectionLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#FAFAFA] mb-10 leading-tight max-w-3xl">
            Four steps. No sales theater.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                n: '01',
                icon: FileLock,
                title: 'Application',
                body:
                  'You send a one-page brief. What you\u2019re building, what \u201cdone\u201d looks like, what is non-negotiable.',
              },
              {
                n: '02',
                icon: Calendar,
                title: 'Discovery call',
                body:
                  'Forty-five minutes. Honest read on whether this is the right engagement \u2014 even if the answer is no.',
              },
              {
                n: '03',
                icon: Check,
                title: 'Scope and quote',
                body:
                  'Within five business days you receive a fixed scope, fixed timeline, and a custom quote. Either it\u2019s a yes or it\u2019s not.',
              },
              {
                n: '04',
                icon: ArrowRight,
                title: 'Quarter starts',
                body:
                  'Contract signed, kickoff scheduled, week 1 begins on the agreed date. No drift between sign-off and start.',
              },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-xs font-mono text-[#0ED3CF]">{step.n}</div>
                  <step.icon className="w-4 h-4 text-[#A8A29E]" />
                </div>
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#A8A29E] leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.08),transparent_70%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <SectionLabel>Three slots open this year</SectionLabel>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold text-[#FAFAFA] tracking-tight leading-tight">
            Apply if it&rsquo;s the right shape.
          </h2>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-xl mx-auto">
            One brief. Forty-eight-hour reply. The studio takes engagements that
            fit and turns down the ones that don&rsquo;t. Both outcomes are
            fine.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?type=studio&source=studio-engagement"
              className="inline-flex items-center justify-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Apply for a quarter <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pov"
              className="inline-flex items-center justify-center gap-2 border border-[#2A2826] hover:border-[#E85D3A]/50 text-[#FAFAFA] px-6 py-3 rounded-lg transition-colors"
            >
              Read the POV first
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
