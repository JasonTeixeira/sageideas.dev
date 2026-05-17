import Link from 'next/link'
import { ArrowRight, Compass, Sparkles, RefreshCw, Package, Briefcase } from 'lucide-react'
import type { ExtendedTier } from '@/data/services/extended'

type CareTier = {
  slug: string
  name: string
  shortName: string
  tagline: string
  price: string
  cadence: 'monthly'
  ctaHref: string
}

type Row = {
  slug: string
  name: string
  tagline: string
  price: string
  timeline: string
  href: string
}

function rowFromExtended(t: ExtendedTier): Row {
  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    price: t.price,
    timeline: t.timeline,
    href: `/services/${t.slug}`,
  }
}

function rowFromCare(t: CareTier): Row {
  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    price: `${t.price}/mo`,
    timeline: 'Monthly · cancel anytime',
    href: `/services/${t.slug}`,
  }
}

function MenuColumn({
  label,
  accent,
  icon: Icon,
  blurb,
  rows,
}: {
  label: string
  accent: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  blurb: string
  rows: Row[]
}) {
  return (
    <div className="rounded-2xl border border-[#2A2826] bg-[#12110F] p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: accent }} aria-hidden />
        <span
          className="text-xs font-mono uppercase tracking-widest"
          style={{ color: accent }}
        >
          {label}
        </span>
      </div>
      <p className="text-sm text-[#A8A29E] mb-5 leading-snug">{blurb}</p>
      <ul className="space-y-3 flex-1">
        {rows.map((r) => (
          <li key={r.slug}>
            <Link
              href={r.href}
              className="group flex items-start justify-between gap-3 text-sm text-[#A8A29E] hover:text-[#FAFAFA] transition-colors py-1"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#FAFAFA] mb-0.5 truncate">{r.name}</div>
                <div className="text-xs text-[#78716C] leading-snug">{r.timeline}</div>
              </div>
              <span
                className="shrink-0 text-xs font-mono px-2 py-0.5 rounded border"
                style={{
                  color: accent,
                  borderColor: `${accent}33`,
                  backgroundColor: `${accent}10`,
                }}
              >
                {r.price}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ExtendedPricingMenu({
  extended,
  care,
}: {
  extended: ExtendedTier[]
  care: CareTier[]
}) {
  const flagship = extended.filter((t) => t.category === 'ai-flagship').map(rowFromExtended)
  const diagnostics = extended.filter((t) => t.category === 'diagnostics').map(rowFromExtended)
  const aiServices = extended.filter((t) => t.category === 'ai-services').map(rowFromExtended)
  const automation = extended
    .filter((t) => t.category === 'automation-pipelines')
    .map(rowFromExtended)
  const aiProducts = extended.filter((t) => t.category === 'ai-products').map(rowFromExtended)
  const newRetainers = extended.filter((t) => t.category === 'retainers').map(rowFromExtended)
  const careRows = care.map(rowFromCare)
  const bundle = extended.find((t) => t.slug === 'studio-package')
  const bespoke = extended.find((t) => t.slug === 'bespoke-build')

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
          Full menu
        </span>
        <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA] mb-3">
          Every engagement, in one place.
        </h2>
        <p className="text-[#A8A29E] max-w-2xl">
          Diagnostics on-ramp into productized work. Productized work hands off to a retainer.
          The bundle wraps it all into one contract. Or scope something bespoke.
        </p>
      </div>

      {/* Flagship row — premium tier featured first */}
      {flagship.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#22D3EE]/30 bg-gradient-to-br from-[#22D3EE]/10 via-[#12110F] to-[#12110F] p-6 relative overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ backgroundColor: '#22D3EE' }}
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#22D3EE]" aria-hidden />
              <span className="text-xs font-mono uppercase tracking-widest text-[#22D3EE]">
                AI Flagship
              </span>
              <span className="ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#22D3EE]/55 text-[#22D3EE] bg-[#22D3EE]/10">
                ★ Featured
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#FAFAFA] mb-1">
              Custom AI agents, voice agents, and lead engines
            </h3>
            <p className="text-sm text-[#A8A29E] mb-5 max-w-2xl">
              Built on your business. Cloud-hosted, eval-driven, human-in-the-loop. Custom pricing
              available on every flagship tier — the listed price is the floor.
            </p>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {flagship.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={r.href}
                    className="group block rounded-xl border border-[#22D3EE]/20 bg-black/30 hover:bg-black/50 hover:border-[#22D3EE]/50 transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <span className="font-semibold text-[#FAFAFA] leading-snug">{r.name}</span>
                      <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded border border-[#22D3EE]/40 text-[#22D3EE] bg-[#22D3EE]/10 whitespace-nowrap">
                        {r.price}
                      </span>
                    </div>
                    <div className="text-xs text-[#78716C] leading-snug">{r.timeline}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <MenuColumn
          label="Diagnostic"
          icon={Compass}
          accent="#EC4899"
          blurb="Cheap, fast, defensible. Find out before you commit."
          rows={diagnostics}
        />
        <MenuColumn
          label="Productized · AI"
          icon={Sparkles}
          accent="#0ED3CF"
          blurb="Fixed-scope AI engineering — eval-driven, observable, deployable."
          rows={aiServices}
        />
        <MenuColumn
          label="Productized · Automation"
          icon={Briefcase}
          accent="#E85D3A"
          blurb="Boring, reliable workflows that replace manual handoffs."
          rows={automation}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <MenuColumn
          label="Customer-facing AI"
          icon={Sparkles}
          accent="#F59E0B"
          blurb="Search, onboarding, support deflection. Built with citations and analytics."
          rows={aiProducts}
        />
        <MenuColumn
          label="Retainers"
          icon={RefreshCw}
          accent="#10B981"
          blurb="Recurring scope, concrete monthly deliverables. Cancel anytime."
          rows={[...newRetainers, ...careRows]}
        />
      </div>

      {/* Bundle + Bespoke */}
      {(bundle || bespoke) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {bundle && (
            <Link
              href={`/services/${bundle.slug}`}
              className="group rounded-2xl border border-[#0ED3CF]/40 bg-gradient-to-br from-[#0ED3CF]/10 via-[#12110F] to-[#12110F] p-8 hover:border-[#0ED3CF] transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-[#0ED3CF]" aria-hidden />
                <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
                  Done-For-You bundle
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#FAFAFA] mb-2">{bundle.name}</h3>
              <p className="text-[#A8A29E] mb-4 flex-1">{bundle.tagline}</p>
              <div className="flex items-center justify-between pt-4 border-t border-[#2A2826]">
                <span className="text-xl font-bold text-[#FAFAFA]">{bundle.price}</span>
                <span className="text-xs font-mono text-[#0ED3CF] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  See what&apos;s inside <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          )}
          {bespoke && (
            <Link
              href={`/services/${bespoke.slug}`}
              className="group rounded-2xl border border-[#2A2826] bg-[#12110F] p-8 hover:border-[#3D3A37] transition-colors flex flex-col"
            >
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-[#A8A29E]" aria-hidden />
                <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E]">
                  Bespoke
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#FAFAFA] mb-2">{bespoke.name}</h3>
              <p className="text-[#A8A29E] mb-4 flex-1">{bespoke.tagline}</p>
              <div className="flex items-center justify-between pt-4 border-t border-[#2A2826]">
                <span className="text-xl font-bold text-[#FAFAFA]">Custom-priced</span>
                <span className="text-xs font-mono text-[#A8A29E] inline-flex items-center gap-1 group-hover:translate-x-0.5 group-hover:text-[#FAFAFA] transition-all">
                  Book a scoping call <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
