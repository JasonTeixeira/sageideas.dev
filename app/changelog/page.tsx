import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { changelog, type ChangelogEntry } from '@/lib/changelogData'

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'A real, dated feed of what has shipped on Sage Ideas Studio — features, fixes, content, and infrastructure changes.',
  alternates: { canonical: 'https://www.sageideas.dev/changelog' },
  openGraph: {
    title: 'Changelog — Sage Ideas',
    description: 'Everything that has actually shipped, dated and grouped by month.',
    url: 'https://www.sageideas.dev/changelog',
    images: ['/og-default.svg'],
  },
}

const TAG_STYLE: Record<ChangelogEntry['tag'], { label: string; cls: string }> = {
  feat: { label: 'feat', cls: 'border-[#0ED3CF]/40 bg-[#0ED3CF]/[0.06] text-[#22D3EE]' },
  fix: { label: 'fix', cls: 'border-[#F59E0B]/40 bg-[#F59E0B]/[0.06] text-[#FBBF24]' },
  refactor: { label: 'refactor', cls: 'border-[#A78BFA]/40 bg-[#A78BFA]/[0.06] text-[#C4B5FD]' },
  content: { label: 'content', cls: 'border-[#10B981]/40 bg-[#10B981]/[0.06] text-[#34D399]' },
}

function formatMonth(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatDay(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function groupByMonth(entries: ChangelogEntry[]) {
  const groups: Record<string, ChangelogEntry[]> = {}
  for (const e of entries) {
    const key = e.date.slice(0, 7) // yyyy-mm
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }
  // Sort months desc and entries within each month desc
  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, items]) => ({
      key,
      label: formatMonth(items[0].date),
      items: items.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    }))
}

export default function ChangelogPage() {
  const groups = groupByMonth(changelog)
  const totalShipped = changelog.length

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-3xl">
          <SectionLabel>Changelog</SectionLabel>
          <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl font-normal text-[#FAFAFA] leading-tight tracking-tight">
            What we&apos;ve shipped.
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed">
            A real, dated feed pulled straight from the repo. Features, fixes, content, infrastructure — grouped by month,
            most recent first.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            <Stat label="Shipped" value={String(totalShipped)} />
            <Stat label="Months" value={String(groups.length)} />
            <Stat label="Cadence" value="Weekly" />
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[200px_1fr] gap-8">
          {/* Sticky month nav (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <div className="text-xs font-mono uppercase tracking-widest text-[#78716C] mb-3">Jump to</div>
              {groups.map((g) => (
                <a
                  key={g.key}
                  href={`#${g.key}`}
                  className="block text-sm text-[#A8A29E] hover:text-[#FAFAFA] transition py-1"
                >
                  {g.label}
                </a>
              ))}
            </div>
          </aside>

          {/* Entries */}
          <div className="space-y-16">
            {groups.map((g) => (
              <section key={g.key} id={g.key} className="scroll-mt-24">
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">{g.label}</h2>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#78716C]">
                    {g.items.length} {g.items.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                <ol className="relative space-y-4">
                  {/* Vertical line */}
                  <span
                    aria-hidden="true"
                    className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#2A2826] via-[#2A2826]/60 to-transparent"
                  />

                  {g.items.map((e, idx) => {
                    const tag = TAG_STYLE[e.tag]
                    return (
                      <li key={`${g.key}-${idx}`} className="relative pl-8">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-3 h-3.5 w-3.5 rounded-full border border-[#2A2826] bg-[#12110F]"
                        >
                          <span className="absolute inset-1 rounded-full bg-[#0ED3CF]/60" />
                        </span>

                        <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-5 hover:border-[#3D3A37] transition">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className={[
                                'inline-flex items-center text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border',
                                tag.cls,
                              ].join(' ')}
                            >
                              {tag.label}
                              {e.scope && <span className="ml-1 text-[#78716C]">({e.scope})</span>}
                            </span>
                            <span className="text-xs font-mono text-[#78716C]">{formatDay(e.date)}</span>
                          </div>
                          <div className="text-base sm:text-lg font-semibold text-[#FAFAFA] leading-snug">{e.title}</div>
                          {e.body && (
                            <p className="mt-2 text-sm text-[#A8A29E] leading-relaxed">{e.body}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-[#2A2826] bg-gradient-to-br from-[#12110F] to-[#0B0A09] p-8 sm:p-12 text-center">
          <SectionLabel>What&apos;s next</SectionLabel>
          <h2 className="mt-3 text-3xl sm:text-4xl font-normal text-[#FAFAFA] tracking-tight">
            New work ships every week.
          </h2>
          <p className="mt-3 text-[#A8A29E] leading-relaxed max-w-2xl mx-auto">
            Studio engagements, lab products, blog posts, and platform receipts all show up here. Want a thread?
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ED3CF] hover:text-[#22D3EE]"
            >
              Read the blog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[#3D3A37]">·</span>
            <Link
              href="/lab"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ED3CF] hover:text-[#22D3EE]"
            >
              See lab products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[#3D3A37]">·</span>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ED3CF] hover:text-[#22D3EE]"
            >
              Start a conversation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2A2826] bg-[#12110F] p-3">
      <div className="text-xs font-mono uppercase tracking-widest text-[#78716C]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[#FAFAFA] tabular-nums">{value}</div>
    </div>
  )
}
