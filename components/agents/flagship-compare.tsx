'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

type CompareRow = {
  slug: string
  name: string
  price: string
  timeline: string
  mode: string
  bestFor: string
  href: string
  accent: string
}

const ROWS: CompareRow[] = [
  {
    slug: 'ai-implementation-consulting',
    name: 'AI Implementation Consulting',
    price: 'from $1,000',
    timeline: '2 weeks',
    mode: 'Audit',
    bestFor: 'Don’t know where AI fits',
    href: '/services/ai-implementation-consulting',
    accent: '#22D3EE',
  },
  {
    slug: 'ai-agent-development',
    name: 'AI Agent Development',
    price: 'from $2,600',
    timeline: '4 weeks',
    mode: 'Build',
    bestFor: 'Repetitive ops work eating your week',
    href: '/services/ai-agent-development',
    accent: '#A855F7',
  },
  {
    slug: 'ai-voice-agent',
    name: 'AI Voice Agent',
    price: 'from $1,800',
    timeline: '3 weeks',
    mode: 'Build',
    bestFor: 'Missed inbound calls',
    href: '/services/ai-voice-agent',
    accent: '#A78BFA',
  },
  {
    slug: 'ai-lead-engine',
    name: 'AI Lead Engine',
    price: 'from $2,200',
    timeline: '4 weeks',
    mode: 'Build',
    bestFor: 'Targeted outreach without spam',
    href: '/services/ai-lead-engine',
    accent: '#F59E0B',
  },
  {
    slug: 'agent-operations-retainer',
    name: 'Agent Operations Retainer',
    price: 'from $600/mo',
    timeline: 'Monthly',
    mode: 'Operate',
    bestFor: 'Already shipped — keep it sharp',
    href: '/services/agent-operations-retainer',
    accent: '#34D399',
  },
]

export function FlagshipCompare({ currentSlug }: { currentSlug: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-[#2A2826] bg-[#12110F] overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 border-b border-[#2A2826] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            Compare flagship offers
          </p>
          <p className="text-[#FAFAFA] text-sm mt-1 font-medium">
            Five engagements. Pick what matches your situation.
          </p>
        </div>
        <Link
          href="/services"
          className="text-xs font-mono text-[#78716C] hover:text-[#FAFAFA] transition-colors inline-flex items-center gap-1"
        >
          See all services
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-widest text-[#78716C] bg-[#0B0A09]">
              <th className="text-left px-5 py-3 font-medium">Engagement</th>
              <th className="text-left px-3 py-3 font-medium">Price</th>
              <th className="text-left px-3 py-3 font-medium">Timeline</th>
              <th className="text-left px-3 py-3 font-medium">Mode</th>
              <th className="text-left px-3 py-3 font-medium">Best for</th>
              <th className="text-right px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const isCurrent = row.slug === currentSlug
              return (
                <tr
                  key={row.slug}
                  className={
                    isCurrent
                      ? 'border-t border-[#2A2826] bg-[#141418]'
                      : 'border-t border-[#2A2826] hover:bg-[#141418]/60 transition-colors'
                  }
                  style={
                    isCurrent
                      ? {
                          boxShadow: `inset 3px 0 0 ${row.accent}`,
                        }
                      : undefined
                  }
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.accent }}
                      />
                      <span className="text-[#FAFAFA] font-medium">
                        {row.name}
                      </span>
                      {isCurrent && (
                        <span
                          className="inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{
                            color: row.accent,
                            backgroundColor: `${row.accent}1A`,
                          }}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          You’re here
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-[#FAFAFA] font-mono text-[13px] whitespace-nowrap">
                    {row.price}
                  </td>
                  <td className="px-3 py-3.5 text-[#A8A29E] whitespace-nowrap">
                    {row.timeline}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className="text-[10.5px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{
                        color: row.accent,
                        backgroundColor: `${row.accent}14`,
                      }}
                    >
                      {row.mode}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[#A8A29E] text-[13.5px]">
                    {row.bestFor}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {isCurrent ? (
                      <span className="text-[10.5px] font-mono uppercase tracking-widest text-[#57534E]">
                        —
                      </span>
                    ) : (
                      <Link
                        href={row.href}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#A8A29E] hover:text-[#FAFAFA] transition-colors"
                      >
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.section>
  )
}
