'use client'

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import Image from 'next/image'
import type { LogoEntry } from '@/data/references'

type Props = {
  entries: LogoEntry[]
  /** Optional small heading prefix shown above the strip. */
  label?: string
  /** Optional contextual blurb shown to the right of the label. */
  blurb?: string
}

/**
 * Renders a row of client "logos." Most are anonymous monograms (initials in
 * a styled tile) because clients have not granted public-disclosure permission
 * yet. When permission is granted, set `anonymous: false` and `logo: '/logos/x.svg'`
 * in data/references.ts and the component will render the real logo.
 *
 * Anonymity is the honest default — no fake logos, no implied endorsements.
 */
export function LogoStrip({ entries, label, blurb }: Props) {
  return (
    <div>
      {(label || blurb) && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline gap-x-4 gap-y-2">
          {label && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF] shrink-0">
              {label}
            </span>
          )}
          {blurb && (
            <p className="text-xs text-[#78716C] leading-relaxed">{blurb}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {entries.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            className="group relative rounded-xl border border-[#2A2826] bg-[#12110F] p-4 hover:border-[#2A2826]/80 transition-colors"
            title={e.anonymous ? 'Under NDA — name withheld' : e.label}
          >
            {/* Logo or monogram tile */}
            <div className="aspect-[3/2] flex items-center justify-center mb-3">
              {e.logo && !e.anonymous ? (
                <Image
                  src={e.logo}
                  alt={e.label}
                  width={120}
                  height={60}
                  className="max-h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div
                  className={`text-2xl font-mono font-semibold tracking-tight ${
                    e.accent ?? 'text-[#0ED3CF]'
                  } opacity-90`}
                  aria-hidden
                >
                  {e.monogram ??
                    e.label
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                </div>
              )}
            </div>

            {/* Label row */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#E4E4E7] truncate">
                  {e.label}
                </div>
                <div className="text-[10px] text-[#78716C] truncate">
                  {e.industry}
                </div>
              </div>
              {e.anonymous && (
                <Lock
                  className="h-3 w-3 text-[#78716C] shrink-0"
                  aria-label="Under NDA"
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-[#78716C] leading-relaxed max-w-2xl">
        Most engagements operate under NDA. Real names + logos appear here only
        with written permission, replacing the monogram tile in place.
      </p>
    </div>
  )
}
