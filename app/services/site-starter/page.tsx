import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { tiersBySlug, type Tier } from '@/data/services/tiers'
import { CheckoutButton } from '@/components/studio/checkout-button'
import { SectionLabel } from '@/components/section-label'

const SITE = 'https://www.sageideas.dev'
const SLUGS = ['site-starter-landing', 'site-starter-marketing', 'site-starter-pro'] as const

export const metadata: Metadata = {
  title: 'Site Starter — Landing, Marketing, or Pro',
  description:
    'Three productized site builds with Stripe checkout. $1,500 landing, $2,500 marketing, $3,500 pro with CMS-backed blog. Fixed scope, fixed price, mobile-first, SEO-ready.',
  alternates: { canonical: `${SITE}/services/site-starter` },
  openGraph: {
    title: 'Site Starter — Landing, Marketing, or Pro',
    description: 'Productized site builds. $1,500 / $2,500 / $3,500. Mobile-first, SEO-ready, deployed in days.',
    url: `${SITE}/services/site-starter`,
    images: [{ url: '/og?title=Site+Starter&subtitle=Landing+%2F+Marketing+%2F+Pro' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og?title=Site+Starter&subtitle=Landing+%2F+Marketing+%2F+Pro'],
  },
}

export default function SiteStarterPage() {
  const tiers = SLUGS.map((slug) => tiersBySlug[slug]).filter(Boolean) as Tier[]

  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    name: 'Site Starter',
    description: 'Three productized site builds: Landing, Marketing, Pro.',
    url: `${SITE}/services/site-starter`,
    lowPrice: '1500.00',
    highPrice: '3500.00',
    priceCurrency: 'USD',
    offerCount: 3,
    offers: tiers.map((t) => ({
      '@type': 'Offer',
      name: t.name,
      price: (t.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE}/services/site-starter`,
      availability: 'https://schema.org/InStock',
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <div className="min-h-screen bg-[#09090B]">
        {/* Hero — tightened so tier cards land above the fold at 1080px */}
        <section className="relative pt-16 pb-4 overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
            <div className="max-w-3xl">
              <SectionLabel>Site Starter</SectionLabel>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-[#FAFAFA] leading-tight">
                A real site, live in days. <span className="text-[#0ED3CF]">Pick a tier.</span>
              </h1>
              <p className="mt-3 text-base text-[#A8A29E] leading-relaxed max-w-2xl">
                Three fixed-scope site builds with Stripe checkout. Mobile-first, SEO-ready,
                deployed to Vercel with a custom domain. Pay, kick off, ship.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C]">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                  Next.js 15 + Tailwind
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                  Vercel deploy + DNS
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                  Mobile-first responsive
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0ED3CF]" />
                  SEO foundation
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-16">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.slug}
                className={`relative rounded-2xl border bg-[#12110F] p-6 flex flex-col ${
                  tier.highlight
                    ? 'border-[#0ED3CF]/50 shadow-[0_0_60px_rgba(6,182,212,0.15)]'
                    : 'border-[#2A2826]'
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-6 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#0ED3CF]/30 bg-[#0ED3CF]/10 text-[#0ED3CF]">
                    Most popular
                  </span>
                )}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-[#FAFAFA] mb-1">{tier.shortName}</h2>
                  <p className="text-sm text-[#A8A29E] leading-snug">{tier.tagline}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-[#FAFAFA]">{tier.price}</span>
                  <span className="text-[#78716C] text-sm ml-1">one-time</span>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-[#78716C] mb-5">
                  <Clock className="w-3 h-3" />
                  {tier.timeline}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.deliverables.slice(0, 5).map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm text-[#D4D4D8]">
                      <Check className="w-4 h-4 text-[#0ED3CF] shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-[#78716C] mb-4 font-mono uppercase tracking-wider">
                  Revisions: {tier.slug === 'site-starter-landing' ? '1 round' : '2 rounds'}
                </div>
                <CheckoutButton tier={tier} label="Get Started" variant="primary" />
              </div>
            ))}
          </div>
        </section>

        {/* What's included across all tiers */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-3">Every tier ships with</h2>
          <p className="text-[#A8A29E] mb-8 max-w-2xl">
            The baseline you should expect from any site we build — not optional, not negotiated.
          </p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              'Mobile-first responsive design (tested 320px — 4K)',
              'Lighthouse 95+ across Performance, A11y, SEO, Best Practices',
              'Open Graph + favicon + structured data',
              'Spam-protected contact form wired to your email',
              'Analytics (Google Analytics or Plausible)',
              'Vercel production deploy with custom domain',
              'Loom walkthrough + handoff doc',
              'Source code in your GitHub org if you want it',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-[#D4D4D8]">
                <Check className="w-5 h-5 text-[#0ED3CF] shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-6">How to pick</h2>
          <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1917] border-b border-[#2A2826]">
                <tr>
                  <th className="px-4 py-3 text-left text-[#A8A29E] font-mono uppercase tracking-wider text-xs">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left text-[#A8A29E] font-mono uppercase tracking-wider text-xs">
                    Landing
                  </th>
                  <th className="px-4 py-3 text-left text-[#A8A29E] font-mono uppercase tracking-wider text-xs">
                    Marketing
                  </th>
                  <th className="px-4 py-3 text-left text-[#0ED3CF] font-mono uppercase tracking-wider text-xs">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2826] text-[#D4D4D8]">
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">Pages</td>
                  <td className="px-4 py-3">1</td>
                  <td className="px-4 py-3">4</td>
                  <td className="px-4 py-3">6</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">CMS-backed blog</td>
                  <td className="px-4 py-3 text-[#78716C]">—</td>
                  <td className="px-4 py-3 text-[#78716C]">—</td>
                  <td className="px-4 py-3 text-[#0ED3CF]">Yes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">SEO foundation</td>
                  <td className="px-4 py-3">Basic</td>
                  <td className="px-4 py-3">Full</td>
                  <td className="px-4 py-3">Full</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">Revisions</td>
                  <td className="px-4 py-3">1 round</td>
                  <td className="px-4 py-3">2 rounds</td>
                  <td className="px-4 py-3">2 rounds</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">Post-launch support</td>
                  <td className="px-4 py-3 text-[#78716C]">—</td>
                  <td className="px-4 py-3 text-[#78716C]">—</td>
                  <td className="px-4 py-3">30 days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">Turnaround</td>
                  <td className="px-4 py-3">5 business days</td>
                  <td className="px-4 py-3">7-10 business days</td>
                  <td className="px-4 py-3">2 weeks</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-[#A8A29E]">Price</td>
                  <td className="px-4 py-3 text-[#FAFAFA] font-bold">$1,500</td>
                  <td className="px-4 py-3 text-[#FAFAFA] font-bold">$2,500</td>
                  <td className="px-4 py-3 text-[#0ED3CF] font-bold">$3,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Site Care upsell */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-2xl border border-[#E85D3A]/20 bg-gradient-to-br from-[#E85D3A]/[0.06] to-transparent p-8 sm:p-10">
            <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
              <div className="max-w-2xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E85D3A] mb-3 inline-block">
                  Add ongoing maintenance
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] mb-3">
                  Add Site Care — $300/mo
                </h2>
                <p className="text-[#A8A29E] leading-relaxed">
                  Ongoing maintenance: security patches, copy edits, performance tuning, content
                  updates, small feature tweaks. Cancel anytime. Pair with any Site Starter tier.
                </p>
              </div>
              <Link
                href="/services/site-care"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E85D3A]/40 bg-[#E85D3A]/10 hover:bg-[#E85D3A]/20 hover:border-[#E85D3A]/70 text-[#FAFAFA] text-sm font-medium py-3 px-5 transition-all whitespace-nowrap"
              >
                See Site Care
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <h2 className="text-3xl font-bold text-[#FAFAFA] mb-6">Common questions</h2>
          <div className="space-y-5">
            {[
              {
                q: 'Which tier should I pick?',
                a: 'Landing if you need one page to validate an idea or run an ad. Marketing if you have a real business with multiple service pages. Pro if you plan to publish content from day one and want a CMS-backed blog.',
              },
              {
                q: 'What if I outgrow Site Starter?',
                a: 'Upgrade to Ship ($2,500) for a heavier 2-week marketing site with a custom integration, or Build (from $9,500) for a full app + site + automation engagement. Code carries forward — no rewrite.',
              },
              {
                q: 'Do you write the copy?',
                a: 'We provide structure, headlines, and edits. Long-form copy is BYO or available as a paid add-on per tier. We do not ship lorem ipsum to launch.',
              },
              {
                q: 'When do I pay?',
                a: 'Stripe charges in full at checkout. We start the next business day. If we cannot start within a week, we say so before charging.',
              },
              {
                q: 'What about a logo or brand?',
                a: 'BYO logo and brand. If you need identity work, pair with Brand Sprint ($2,500) for a complete verbal + visual system before the site build.',
              },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5">
                <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{item.q}</h3>
                <p className="text-sm text-[#A8A29E] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
