'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'sage-capacity-signal-dismissed-2026-q3'

type Props = {
  /** Override the default copy if the studio's capacity changes mid-quarter. */
  message?: string
  /** Optional CTA href and label. Defaults to /contact. */
  ctaHref?: string
  ctaLabel?: string
}

export function CapacitySignal({
  message = '2 of 3 build slots open · Q3 starts July 1',
  ctaHref = '/contact',
  ctaLabel = 'Hold a slot',
}: Props) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY)
      setDismissed(v === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  return (
    <div className="relative rounded-xl border border-[#0ED3CF]/30 bg-[#0ED3CF]/5 px-4 py-2.5 mb-8 flex flex-wrap items-center gap-3">
      <span
        className="inline-block w-2 h-2 rounded-full bg-[#0ED3CF] shrink-0"
        aria-hidden
      >
        <span className="block w-2 h-2 rounded-full bg-[#0ED3CF] animate-ping" />
      </span>
      <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E] flex-1">
        <span className="text-[#0ED3CF]">{message}</span>
      </span>
      <a
        href={ctaHref}
        className="text-xs font-mono uppercase tracking-widest text-[#0ED3CF] hover:text-[#FAFAFA] transition-colors"
      >
        {ctaLabel} →
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, '1')
          } catch {}
          setDismissed(true)
        }}
        className="text-[#78716C] hover:text-[#FAFAFA] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
