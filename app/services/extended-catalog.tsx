import Link from 'next/link'
import {
  ArrowRight,
  Sparkles,
  Workflow,
  Bot,
  RefreshCw,
  Compass,
  Package,
  Clock,
  ShieldCheck,
  TrendingUp,
  Briefcase,
} from 'lucide-react'
import {
  extendedCategories,
  extendedTiersByCategory,
  type ExtendedCategoryMeta,
  type ExtendedTier,
} from '@/data/services/extended'
import { getServiceTier, tierLabel } from '@/data/services/tier-classification'
import { getVisualMeta } from '@/data/services/visual-meta'
import { ServiceIcon } from '@/components/services/icon'

type IconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement> & { size?: string | number }
>

const iconFor: Record<ExtendedCategoryMeta['icon'], IconComponent> = {
  sparkles: Sparkles,
  workflow: Workflow,
  bot: Bot,
  refresh: RefreshCw,
  compass: Compass,
  package: Package,
  shield: ShieldCheck,
  trending: TrendingUp,
  briefcase: Briefcase,
}

function ServiceCard({ tier, accent }: { tier: ExtendedTier; accent: string }) {
  const sTier = getServiceTier(tier)
  const meta = getVisualMeta(tier.slug)
  return (
    <Link
      href={`/services/${tier.slug}`}
      className="group rounded-2xl border border-[#2A2826] bg-[#12110F] p-5 hover:border-[#3D3A37] transition-colors flex flex-col"
      style={{ ['--accent' as string]: accent }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex w-7 h-7 rounded-md items-center justify-center"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <ServiceIcon name={meta.icon} className="w-3.5 h-3.5" />
        </span>
        <span
          className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
          style={{
            color: accent,
            borderColor: `${accent}40`,
            backgroundColor: `${accent}10`,
          }}
        >
          {tierLabel[sTier]}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[#FAFAFA] leading-snug">{tier.name}</h3>
        <span
          className="shrink-0 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
          style={{
            color: accent,
            borderColor: `${accent}40`,
            backgroundColor: `${accent}10`,
          }}
        >
          {tier.price}
        </span>
      </div>
      <p className="text-sm text-[#A8A29E] leading-snug mb-4 flex-1">{tier.tagline}</p>
      <div className="flex items-center justify-between text-xs font-mono text-[#78716C] pt-3 border-t border-[#2A2826]">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {tier.timeline}
        </span>
        <span
          className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5"
          style={{ color: accent }}
        >
          Details <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  )
}

export function ExtendedCatalog() {
  return (
    <div className="space-y-16">
      {extendedCategories.map((cat) => {
        const Icon = iconFor[cat.icon]
        const items = extendedTiersByCategory[cat.key]
        if (items.length === 0) return null
        const isFlagship = cat.key === 'ai-flagship'
        return (
          <section
            key={cat.key}
            id={`cat-${cat.key}`}
            className={`scroll-mt-24${
              isFlagship
                ? ' relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0B0F] via-[#0F1014] to-[#0B0B0F] p-6 sm:p-10 overflow-hidden'
                : ''
            }`}
            aria-labelledby={`cat-heading-${cat.key}`}
          >
            {isFlagship && (
              <>
                <div
                  className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 pointer-events-none"
                  style={{ backgroundColor: cat.accent }}
                  aria-hidden
                />
                <div
                  className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"
                  aria-hidden
                />
              </>
            )}
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: cat.accent }} aria-hidden />
                <span
                  className="text-xs font-mono uppercase tracking-widest"
                  style={{ color: cat.accent }}
                >
                  {cat.label}
                </span>
                {isFlagship && (
                  <span
                    className="ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border"
                    style={{
                      color: cat.accent,
                      borderColor: `${cat.accent}55`,
                      backgroundColor: `${cat.accent}14`,
                    }}
                  >
                    ★ Featured
                  </span>
                )}
              </div>
              <h2
                id={`cat-heading-${cat.key}`}
                className={`font-normal text-[#FAFAFA] mb-2 ${
                  isFlagship ? 'text-4xl sm:text-5xl tracking-tight' : 'text-3xl'
                }`}
              >
                {isFlagship ? 'AI Flagship Suite' : cat.label}
              </h2>
              <p
                className={`text-[#A8A29E] mb-8 max-w-2xl ${
                  isFlagship ? 'text-lg' : ''
                }`}
              >
                {cat.tagline}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((t) => (
                  <ServiceCard key={t.slug} tier={t} accent={cat.accent} />
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function ExtendedCategoryNav() {
  return (
    <nav
      aria-label="Service categories"
      className="flex flex-wrap items-center gap-2 text-xs font-mono"
    >
      {extendedCategories.map((cat) => (
        <a
          key={cat.key}
          href={`#cat-${cat.key}`}
          className="px-3 py-1.5 rounded-full border border-[#2A2826] bg-[#12110F] text-[#A8A29E] hover:text-[#FAFAFA] hover:border-[#3D3A37] transition-colors"
        >
          {cat.label}
        </a>
      ))}
    </nav>
  )
}
