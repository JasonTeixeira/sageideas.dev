'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Calendar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { CareTier } from '@/data/services/tiers'
import { SectionLabel } from '@/components/section-label'
import { GlowCard } from '@/components/glow-card'
import { CareCheckoutButton } from '@/components/studio/care-checkout-button'
import { Pipeline } from '@/components/pipeline'
import { getPipeline } from '@/data/pipelines'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55 },
}

type Tile = { title: string; description: string }

const careDeepDive: Record<
  string,
  { included: string[]; outOfScope: string[]; tiles: Tile[]; faqs: { q: string; a: string }[] }
> = {
  'site-care': {
    included: [
      'Uptime + uptime alerts',
      'Security patches + dependency updates',
      'Copy + content updates (up to 4 requests / month)',
      'Lighthouse + Core Web Vitals upkeep',
      'Small feature tweaks (under 4 hrs / month)',
      'Monthly health report',
    ],
    outOfScope: [
      'Net-new multi-page builds (use Ship)',
      'Full redesigns (use a Sprint)',
      'Custom backend systems (use Build)',
    ],
    tiles: [
      {
        title: 'Patches + uptime',
        description:
          'CMS patches, dependency upgrades, security advisories, and uptime monitoring on a 5-minute interval.',
      },
      {
        title: 'Content + copy',
        description:
          'Up to 4 content requests per month — new sections, copy edits, image swaps, hero tweaks.',
      },
      {
        title: 'Performance',
        description:
          'Quarterly Lighthouse passes, Core Web Vitals tracking, image optimization, and JS bundle review.',
      },
      {
        title: 'Tweaks',
        description:
          'Small features under 4 hrs each — form fields, analytics events, schema, third-party scripts.',
      },
    ],
    faqs: [
      {
        q: 'What sites is this for?',
        a: 'Existing marketing or product sites that need a steady hand — no major rebuilds, just upkeep. Ideal for sites we shipped together via Ship or Build, but happy to take over almost any modern stack.',
      },
      {
        q: 'How fast are updates?',
        a: 'Standard turnaround is 2 business days for content edits and small tweaks. Anything urgent (production bugs, security issues) is handled same-day during business hours.',
      },
      {
        q: 'What if I need more than 4 requests?',
        a: "We bank requests month-to-month, and you can always add a one-time block. If you're consistently over, we'll talk about moving to Build or a custom retainer.",
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Stripe subscription, no annual commitment, no early termination. Cancel and you keep all your code, content, and credentials.',
      },
    ],
  },
  'brand-care': {
    included: [
      'Asset library upkeep + new templates',
      'Brand guideline edits as the company evolves',
      'Up to 6 small-batch design requests / month',
      'Quarterly brand health review',
      'Logo + favicon refreshes',
      'Fonts + color updates across collateral',
    ],
    outOfScope: [
      'Full identity systems (use Brand Sprint)',
      'Major rebrands (use a custom Build)',
      'Photoshoots / video production',
    ],
    tiles: [
      {
        title: 'Asset library',
        description:
          'Maintain your shared library — social templates, slide decks, sales one-pagers, event assets — and add new ones as needs come up.',
      },
      {
        title: 'Guidelines',
        description:
          'Brand guidelines stay in sync with how you actually use the brand — typography, voice, applied examples, logo locks.',
      },
      {
        title: 'Small-batch design',
        description:
          'Up to 6 requests per month — social posts, Notion / Slack assets, sales decks, email banners, conference banners.',
      },
      {
        title: 'Quarterly review',
        description:
          'Once a quarter we walk through brand health — usage, drift, gaps, and a short fix list for the next 90 days.',
      },
    ],
    faqs: [
      {
        q: 'Who is this for?',
        a: 'Teams that already have an identity in place (whether from Brand Sprint or somewhere else) and want a steady designer on call instead of hiring full-time.',
      },
      {
        q: 'What counts as a small-batch request?',
        a: 'Anything that fits inside an existing template or a few hours of design — social posts, sales decks, event banners, email graphics, hero updates, small landing pages.',
      },
      {
        q: 'Do you cover web design changes?',
        a: 'Brand-level changes yes (logo, color, type, hero treatments). Site engineering changes belong on Site Care or Ship.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Stripe subscription, no annual commitment. You keep your full asset library and source files.',
      },
    ],
  },
  'content-care': {
    included: [
      'Refresh up to 4 existing posts / month',
      'Internal linking + cluster strengthening',
      'Light social + newsletter repurposing',
      'Topic + keyword suggestions',
      'Monthly analytics check-in',
      'On-page SEO upkeep',
    ],
    outOfScope: [
      'Net-new long-form drafts (use Content Engine)',
      'Programmatic SEO builds (use a Sprint)',
      'Full editorial systems (custom Build)',
    ],
    tiles: [
      {
        title: 'Post refreshes',
        description:
          'Update up to 4 existing posts per month — facts, screenshots, CTAs, internal links, schema, on-page SEO.',
      },
      {
        title: 'Internal linking',
        description:
          'Strengthen topic clusters as your library grows so existing posts compound instead of decaying.',
      },
      {
        title: 'Repurposing',
        description:
          'Light social + newsletter repurposing — pull threads, hooks, and snippets from each refreshed post.',
      },
      {
        title: 'Reporting',
        description:
          'Monthly check-in with traffic, ranking changes, top decliners, and a focused suggestion list.',
      },
    ],
    faqs: [
      {
        q: 'How is this different from Content Engine?',
        a: 'Content Engine ships new long-form pieces every week. Content Care keeps an existing library healthy — refreshes, internal linking, repurposing, analytics. Many teams run both.',
      },
      {
        q: 'Do you write new pieces?',
        a: 'Not under Content Care. We focus refresh hours on what you already have. For new long-form, layer Content Engine or scope a Content Sprint.',
      },
      {
        q: 'Can you handle WordPress / Webflow / MDX / Sanity?',
        a: "Yes. We've worked across all of them. We work in your CMS — no migration required.",
      },
      {
        q: 'Cancel anytime?',
        a: 'Yes. Monthly Stripe subscription, no annual commitment, no minimum.',
      },
    ],
  },
}

export function CarePageContent({ care }: { care: CareTier }) {
  const detail = careDeepDive[care.slug]

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-25" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#E85D3A]/10 border border-[#E85D3A]/30 text-[#E85D3A] text-xs font-mono">
                <RefreshCw className="w-3 h-3" /> Monthly retainer
              </span>
              <span className="text-xs font-mono text-[#78716C]">
                Cancel anytime
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-[#FAFAFA] leading-tight">
              {care.name}
            </h1>
            <p className="mt-4 text-2xl text-[#A8A29E] leading-snug">
              {care.tagline}
            </p>
            <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-2xl">
              {care.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CareCheckoutButton care={care} />
              <Link
                href="/book"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A8A29E] hover:text-[#FAFAFA] transition-colors"
              >
                <Calendar className="w-4 h-4" /> Book a call first
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-mono text-[#78716C]">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#12110F] border border-[#2A2826]">
                <ShieldCheck className="w-3 h-3 text-[#0ED3CF]" /> Secure Stripe checkout
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-[#12110F] border border-[#2A2826]">
                {care.price}/mo · billed monthly
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-20">
        {/* What's included / out of scope */}
        <motion.section {...fadeUp} className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6">
            <SectionLabel>What&apos;s included</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-5">
              Every month
            </h2>
            <ul className="space-y-3">
              {(detail?.included ?? care.outcomes).map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0ED3CF] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#FAFAFA]/90 leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6">
            <SectionLabel>Not included</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-5">
              When this isn&apos;t the right fit
            </h2>
            <ul className="space-y-3">
              {(detail?.outOfScope ?? []).map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#A8A29E] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#A8A29E] leading-snug">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-[#78716C] leading-snug">
              Need something bigger? Scope a custom engagement —{' '}
              <Link
                href="/contact?engagement=custom"
                className="text-[#0ED3CF] hover:underline"
              >
                talk to Sage
              </Link>
              .
            </p>
          </div>
        </motion.section>

        {/* Visual pipeline */}
        {(() => {
          const pipeline = getPipeline(care.slug)
          if (!pipeline) return null
          return (
            <motion.section {...fadeUp}>
              <SectionLabel>The journey</SectionLabel>
              <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-3">
                How {care.shortName} actually runs
              </h2>
              <p className="text-[#A8A29E] mb-8 max-w-2xl">
                A monthly retainer that runs on a calm cadence. Click any stage to see
                what you do, what I do, and what you walk away with.
              </p>
              <Pipeline pipeline={pipeline} />
            </motion.section>
          )
        })()}

        {/* Detail tiles */}
        {detail && (
          <motion.section {...fadeUp}>
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">
              The {care.shortName} workflow
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {detail.tiles.map((t) => (
                <GlowCard key={t.title} glowColor="violet">
                  <div className="p-6">
                    <h3 className="font-semibold text-[#FAFAFA] mb-2">{t.title}</h3>
                    <p className="text-sm text-[#A8A29E] leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </GlowCard>
              ))}
            </div>
          </motion.section>
        )}

        {/* FAQ */}
        {detail && detail.faqs.length > 0 && (
          <motion.section {...fadeUp}>
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold text-[#FAFAFA] mb-8">
              Quick answers
            </h2>
            <div className="space-y-4">
              {detail.faqs.map((f) => (
                <div
                  key={f.q}
                  className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5"
                >
                  <h3 className="font-semibold text-[#FAFAFA] mb-2">{f.q}</h3>
                  <p className="text-sm text-[#A8A29E] leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* CTA */}
        <motion.div
          {...fadeUp}
          className="rounded-2xl bg-gradient-to-br from-[#E85D3A]/10 via-[#12110F] to-[#0ED3CF]/10 border border-[#E85D3A]/20 p-8 sm:p-12 text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-3">
            Ready for steady upkeep?
          </h2>
          <p className="text-[#A8A29E] mb-8 max-w-lg mx-auto">
            {care.price}/mo. Cancel anytime. Or book a call to talk through a custom
            scope first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CareCheckoutButton care={care} />
            <Link
              href="/contact?engagement=custom"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A8A29E] hover:text-[#FAFAFA] transition-colors"
            >
              Talk to Sage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
