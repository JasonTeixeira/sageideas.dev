'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

const STORAGE_KEY = 'sticky-cta-dismissed-v1'

export function StickyCta({
  pitch = 'Ready to ship your first agent?',
  ctaLabel = 'Book a 30-min call',
  ctaHref = '/contact',
}: {
  pitch?: string
  ctaLabel?: string
  ctaHref?: string
}) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true)
      return
    }
    setDismissed(false)

    const onScroll = () => {
      const scrollTop = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = max > 0 ? scrollTop / max : 0
      setVisible(ratio >= 0.3)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setDismissed(true)
  }

  if (dismissed || !visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 translate-y-0"
      role="region"
      aria-label="Call to action"
    >
      <div className="bg-[#1A1917]/95 backdrop-blur border-t border-[#2A2826] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <p className="text-[#FAFAFA] text-sm sm:text-base font-medium truncate">
            {pitch}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-1.5 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-2 text-[#78716C] hover:text-[#FAFAFA] hover:bg-[#2A2826] rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
