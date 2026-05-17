'use client'

import { useState } from 'react'
import { FileText, Download, Mail } from 'lucide-react'

export type SampleTab = {
  id: string
  label: string
  /** Optional href to a real PDF / asset under /public. If absent, renders the placeholder card. */
  href?: string
  /** Optional preview image under /public. */
  preview?: string
  /** One-sentence description shown next to the preview. */
  description: string
}

const DEFAULT_TABS: SampleTab[] = [
  {
    id: 'audit',
    label: 'Sample Audit Report',
    description:
      'Twelve-page audit excerpt: scope, methodology, findings ranked by impact, and a prioritized fix list. Redacted.',
  },
  {
    id: 'monthly',
    label: 'Sample Monthly Report',
    description:
      'Two-page retainer report: what shipped this month, what is on deck, evals, incidents, hours.',
  },
  {
    id: 'arch',
    label: 'Sample Architecture Doc',
    description:
      'Reference architecture for an AI-native back-end: ingestion, retrieval, eval, observability.',
  },
]

export function SampleDeliverable({ tabs = DEFAULT_TABS }: { tabs?: SampleTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]

  if (!tab) return null

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <span className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF]">
        Sample deliverables
      </span>
      <h2 className="mt-3 text-3xl font-normal text-[#FAFAFA]">
        See the artifact, not the marketing.
      </h2>
      <p className="mt-2 text-[#A8A29E] max-w-2xl">
        Real shape, redacted content. Pick a tab to preview what ships.
      </p>

      <div className="mt-8 rounded-2xl border border-[#2A2826] bg-[#12110F] overflow-hidden">
        {/* Tab strip */}
        <div className="flex flex-wrap border-b border-[#2A2826]" role="tablist">
          {tabs.map((t) => {
            const isActive = t.id === active
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={`px-4 py-3 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 ${
                  isActive
                    ? 'text-[#0ED3CF] border-[#0ED3CF] bg-[#0ED3CF]/5'
                    : 'text-[#78716C] border-transparent hover:text-[#FAFAFA]'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab body */}
        <div className="p-6 sm:p-8 grid md:grid-cols-[1fr_280px] gap-6 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3 text-[#0ED3CF]">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">{tab.label}</span>
            </div>
            <p className="text-[#A8A29E] leading-relaxed">{tab.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {tab.href ? (
                <a
                  href={tab.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#0ED3CF]/40 bg-[#0ED3CF]/10 text-[#0ED3CF] px-3.5 py-2 text-sm font-medium hover:bg-[#0ED3CF]/20 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download preview
                </a>
              ) : (
                <a
                  href="mailto:sage@sageideas.dev?subject=Sample%20deliverable%20request"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#1A1917] text-[#FAFAFA] px-3.5 py-2 text-sm font-medium hover:border-[#0ED3CF]/50 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Request after intro call
                </a>
              )}
            </div>
            {!tab.href && (
              <p className="mt-3 text-xs font-mono uppercase tracking-widest text-[#57534E]">
                Sample provided after intro call · ask sage@sageideas.dev
              </p>
            )}
          </div>

          {/* Preview thumbnail */}
          <div className="aspect-[3/4] rounded-lg border border-[#2A2826] bg-[#1A1917] overflow-hidden flex items-center justify-center">
            {tab.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tab.preview}
                alt={`${tab.label} preview`}
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <PlaceholderPreview label={tab.label} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlaceholderPreview({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 240 320"
      className="w-full h-full"
      role="img"
      aria-label={`${label} preview`}
    >
      <defs>
        <linearGradient id="phPg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1f" />
          <stop offset="100%" stopColor="#0f0f12" />
        </linearGradient>
      </defs>
      <rect width="240" height="320" fill="url(#phPg)" />
      <g fill="#2A2826">
        <rect x="20" y="20" width="120" height="10" rx="2" />
        <rect x="20" y="40" width="80" height="6" rx="2" />
        <rect x="20" y="70" width="200" height="4" rx="2" />
        <rect x="20" y="82" width="180" height="4" rx="2" />
        <rect x="20" y="94" width="190" height="4" rx="2" />
        <rect x="20" y="106" width="160" height="4" rx="2" />
        <rect x="20" y="130" width="200" height="4" rx="2" />
        <rect x="20" y="142" width="170" height="4" rx="2" />
        <rect x="20" y="170" width="200" height="60" rx="4" />
        <rect x="20" y="245" width="140" height="4" rx="2" />
        <rect x="20" y="257" width="180" height="4" rx="2" />
        <rect x="20" y="269" width="160" height="4" rx="2" />
      </g>
      <rect x="20" y="170" width="200" height="60" fill="#0ED3CF" opacity="0.08" />
      <text x="120" y="305" textAnchor="middle" fontSize="9" fill="#57534E" fontFamily="monospace">
        SAMPLE · REDACTED
      </text>
    </svg>
  )
}
