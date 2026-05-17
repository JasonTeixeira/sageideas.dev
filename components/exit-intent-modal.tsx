'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'

const STORAGE_KEY = 'exit-intent-shown-v1'

export function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    if (!window.matchMedia('(min-width: 1024px)').matches) return

    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget !== null) return
      if (e.clientY > 10) return
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
      sessionStorage.setItem(STORAGE_KEY, '1')
      setOpen(true)
    }
    document.addEventListener('mouseleave', onLeave)
    return () => document.removeEventListener('mouseleave', onLeave)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    // Focus the CTA on open for keyboard users
    ctaRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative max-w-md w-full bg-[#1A1917] border border-[#2A2826] rounded-2xl p-8 shadow-2xl"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-[#78716C] hover:text-[#FAFAFA] hover:bg-[#2A2826] rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-lg bg-[#0ED3CF]/10 flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-[#0ED3CF]" />
        </div>

        <h2
          id="exit-intent-title"
          className="text-2xl font-bold text-[#FAFAFA] tracking-tight leading-tight"
        >
          Before you go — score your AI readiness in 4 minutes
        </h2>
        <p className="mt-3 text-[#A8A29E] text-sm leading-relaxed">
          Ten short questions. A grounded score with three concrete next steps you
          can act on this week. No email gate.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            ref={ctaRef}
            href="/lab/ai-readiness"
            onClick={() => setOpen(false)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            Take the AI Readiness Score
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="text-[#78716C] hover:text-[#FAFAFA] text-sm px-4 py-2.5 transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
