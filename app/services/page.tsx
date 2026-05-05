import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { tiersOrdered, careTiers } from '@/data/services/tiers'
import { SectionLabel } from '@/components/section-label'
import { Button } from '@/components/ui/button'
import { ServicesGrid } from './services-grid'
import { ExtendedCatalog, ExtendedCategoryNav } from './extended-catalog'
import { RefreshCw, Sparkles, Layers, FlaskConical } from 'lucide-react'
import { CapacitySignal } from '@/components/social-proof/capacity-signal'
import { TestimonialCarousel } from '@/components/social-proof/testimonial-carousel'
import { testimonials } from '@/data/social-proof/testimonials'
import { DecisionTree } from '@/components/services/decision-tree'

// Evidence pulled from real Lab products / Work case studies. No fabricated metrics.
const evidenceItems = [
  {
    category: 'AI services',
    title: 'Nexural — GPT-4 Discord assistant in production',
    body: 'Real-time fintech platform with an LLM-backed Discord bot answering portfolio queries. 200+ AI queries per week, 0 billing incidents, 61 test suites covering the AI surface.',
    tags: ['GPT-4', 'Discord API', 'Stripe', '185 DB tables'],
    href: '/lab/nexural',
    accent: '#06B6D4',
  },
  {
    category: 'Customer-facing AI',
    title: 'Jobpoise — citation-grounded generation, no hallucinations',
    body: 'AI cover letters where every output traces to a source (resume bullet, JD requirement) via a structured citation layer. Three-tier Stripe billing, Chrome extension, Gmail integration.',
    tags: ['OpenAI', 'Citations', 'Chrome MV2', 'Gmail OAuth'],
    href: '/lab/jobpoise',
    accent: '#F59E0B',
  },
  {
    category: 'Automation pipelines',
    title: 'AlphaStream — 200+ indicators, 5 ML models, automated signal pipeline',
    body: 'End-to-end ML signal engine: data ingestion, feature engineering, training, evaluation, and signal output — all automated. The pattern behind our automation-pipeline offers.',
    tags: ['Python', 'ML', 'CI/CD', 'Pipelines'],
    href: '/lab/alphastream',
    accent: '#8B5CF6',
  },
] as const

const SITE = 'https://www.sageideas.dev'

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Thirty-plus engagements from Sage Ideas: productized engineering and QA tiers, AI reliability audits, RAG and agent ops, automation pipelines, customer-facing AI products, productized retainers, diagnostic on-ramps, and a 90-day done-for-you bundle. Fixed scope, transparent pricing, custom welcome.',
  alternates: { canonical: `${SITE}/services` },
  openGraph: {
    title: 'Services',
    description: 'Engineering, QA, AI, and automation engagements. Fixed scope. Custom welcome.',
    images: [{ url: '/og?title=Services&subtitle=Engineering%2C+AI%2C+automation%2C+and+retainers.' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og?title=Services&subtitle=Engineering%2C+AI%2C+automation%2C+and+retainers.'],
  },
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <SectionLabel>Engagements</SectionLabel>
            <h1 className="mt-4 text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight">
              Engineering. AI. Automation.{' '}
              <span className="text-[#06B6D4]">Custom welcome.</span>
            </h1>
            <p className="mt-6 text-lg text-[#A1A1AA] leading-relaxed max-w-2xl">
              Productized engagements with fixed scope. AI reliability audits, RAG and
              agent ops, automation pipelines, customer-facing AI products, retainers,
              diagnostic on-ramps, and full done-for-you bundles. Or scope something
              custom — free 30-minute call, 48-hour proposal, no asterisks.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#71717A]">
              <Link
                href="#ai-and-automation"
                className="inline-flex items-center gap-1.5 text-[#06B6D4] hover:text-[#0EA5E9] transition-colors font-medium"
              >
                Jump to AI & Automation
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-[#3F3F46]">·</span>
              <Link
                href="/capabilities"
                className="inline-flex items-center gap-1.5 text-[#A1A1AA] hover:text-[#06B6D4] transition-colors"
              >
                Capability matrix
              </Link>
              <span className="text-[#3F3F46]">·</span>
              <Link
                href="/industries"
                className="inline-flex items-center gap-1.5 text-[#A1A1AA] hover:text-[#06B6D4] transition-colors"
              >
                Browse by industry
              </Link>
              <span className="text-[#3F3F46]">·</span>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-[#A1A1AA] hover:text-[#06B6D4] transition-colors"
              >
                Compare every tier
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capacity signal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CapacitySignal />
      </section>

      {/* Decision tree */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <DecisionTree />
      </section>

      {/* Site Starter highlight — productized site builds */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Link
          href="/services/site-starter"
          className="group block rounded-2xl border border-[#06B6D4]/30 bg-gradient-to-br from-[#06B6D4]/[0.08] via-[#0891B2]/[0.04] to-transparent p-8 hover:border-[#06B6D4]/60 transition-colors"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4] mb-3 inline-block">
                New · Productized
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-2">
                Site Starter — $1,500 to $3,500
              </h3>
              <p className="text-[#A1A1AA] leading-relaxed">
                Three fixed-scope site builds with Stripe checkout. Landing ($1,500, 5 days),
                Marketing ($2,500, 7-10 days), or Pro ($3,500, 2 weeks with CMS-backed blog).
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-[#06B6D4] text-sm font-mono group-hover:translate-x-0.5 transition-transform">
              See tiers
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      </section>

      {/* Tier Grid — productized engagements with Stripe checkout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#06B6D4]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#06B6D4]">
            Productized engagements
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">Engineering & QA</h2>
        <p className="text-[#A1A1AA] mb-8 max-w-2xl">
          Fixed scope, fixed price, Stripe checkout. The original Sage Ideas catalog —
          strategy audits, marketing-site sprints, brand work, and platform builds.
        </p>
        <ServicesGrid tiers={tiersOrdered} />
      </section>

      {/* AI & Automation — extended catalog */}
      <section id="ai-and-automation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-24">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#06B6D4]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#06B6D4]">
            AI & Automation
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">
          Twenty-two more ways we can help.
        </h2>
        <p className="text-[#A1A1AA] mb-6 max-w-2xl">
          Six categories spanning AI reliability, automation pipelines, customer-facing
          AI products, productized retainers, diagnostic on-ramps, and full done-for-you
          bundles. Inquiry-first — every engagement is scoped before you commit.
        </p>
        <div className="mb-10">
          <ExtendedCategoryNav />
        </div>
        <ExtendedCatalog />
      </section>

      {/* Evidence — real Lab + Work tied to new categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-[#A1A1AA]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#A1A1AA]">
            Proof from the Lab
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">
          We ship these patterns ourselves first.
        </h2>
        <p className="text-[#A1A1AA] mb-8 max-w-2xl">
          Every offer above is built on a pattern already running in production — in our Lab
          or in shipped client work. Three concrete examples:
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {evidenceItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-[#27272A] bg-[#0F0F12] p-6 hover:border-[#3F3F46] transition-colors flex flex-col"
            >
              <span
                className="text-[10px] font-mono uppercase tracking-widest mb-3"
                style={{ color: item.accent }}
              >
                {item.category}
              </span>
              <h3 className="text-lg font-semibold text-[#FAFAFA] leading-snug mb-2 group-hover:text-[#FAFAFA]">
                {item.title}
              </h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed mb-4 flex-1">{item.body}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono uppercase tracking-wider text-[#71717A] bg-[#0A0A0C] border border-[#27272A] rounded px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span
                className="inline-flex items-center gap-1 text-xs font-mono group-hover:translate-x-0.5 transition-transform"
                style={{ color: item.accent }}
              >
                See it in the Lab <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#71717A]">
          <Link href="/lab" className="hover:text-[#06B6D4] transition-colors">
            Browse the full Lab →
          </Link>
          <Link href="/work" className="hover:text-[#06B6D4] transition-colors">
            Read client case studies →
          </Link>
        </div>
      </section>

      {/* Care retainers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#8B5CF6]">
            Monthly retainers
          </span>
        </div>
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">Care plans</h2>
        <p className="text-[#A1A1AA] mb-8 max-w-2xl">
          Lightweight monthly retainers for teams who already shipped. Cancel anytime.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {careTiers.map((c) => (
            <Link
              key={c.slug}
              href={`/services/${c.slug}`}
              className="group rounded-2xl border border-[#8B5CF6]/20 bg-gradient-to-br from-[#8B5CF6]/[0.04] to-transparent p-6 hover:border-[#8B5CF6]/50 hover:from-[#8B5CF6]/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-[#8B5CF6]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#8B5CF6]">
                  Retainer
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#FAFAFA] mb-1">{c.name}</h3>
              <div className="text-sm text-[#FAFAFA]/90 font-medium mb-3">
                {c.price}/mo
              </div>
              <p className="text-sm text-[#A1A1AA] leading-snug mb-4">{c.tagline}</p>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-[#8B5CF6] group-hover:translate-x-0.5 transition-transform">
                Explore <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <SectionLabel>What clients say</SectionLabel>
        </div>
        <TestimonialCarousel testimonials={testimonials} />
      </section>

      {/* Custom packages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-[#27272A] bg-[#0F0F12] p-8 sm:p-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#A1A1AA]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#A1A1AA]">
              Custom packages
            </span>
          </div>
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">
            Or scope something custom.
          </h2>
          <p className="text-[#A1A1AA] max-w-2xl leading-relaxed mb-6">
            Need a hybrid engagement? A multi-month build? A retainer with specific
            deliverables? Every engagement can be custom-scoped — transparent quote,
            fixed price, no asterisks.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#27272A] hover:border-[#06B6D4] text-[#FAFAFA]"
            >
              <Link href="/contact?engagement=custom">
                Talk to Sage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-[#A1A1AA]"
            >
              <Link href="/capabilities">See the matrix</Link>
            </Button>
          </div>
        </div>

        {/* Not sure which? */}
        <div className="mt-10 rounded-2xl border border-[#27272A] bg-[#0F0F12] p-8 sm:p-12 text-center">
          <p className="text-[#71717A] text-sm font-mono uppercase tracking-widest mb-3">
            Not sure which fits?
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-4">
            Start with a conversation.
          </h2>
          <p className="text-[#A1A1AA] max-w-xl mx-auto mb-8">
            Book a free 30-minute discovery call. We&apos;ll talk through what you&apos;re building,
            what you&apos;ve already tried, and which engagement — if any — is the right fit.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#06B6D4] hover:bg-[#0891B2] text-[#09090B] font-semibold"
          >
            <Link href="/book">
              Book a Discovery Call
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
