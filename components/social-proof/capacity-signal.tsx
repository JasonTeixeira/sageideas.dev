'use client'

import { useSyncExternalStore } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'sage-capacity-signal-dismissed-2026-q3'

// localStorage-backed store for the "dismissed" flag.
// useSyncExternalStore is the React 19 / strict-mode-safe way to bridge an
// external value into render — it satisfies react-hooks/set-state-in-effect.
function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

function getDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// SSR + first client render: pretend it is dismissed so the strip never
// flashes on screen before localStorage is consulted. Once mounted,
// useSyncExternalStore swaps in the real value.
function getServerSnapshot(): boolean {
  return true
}

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
  const dismissed = useSyncExternalStore(subscribe, getDismissed, getServerSnapshot)

  if (dismissed) return null

  return (
    <div className="relative rounded-xl border border-[#3D5AFE]/30 bg-[#3D5AFE]/5 px-4 py-2.5 mb-8 flex flex-wrap items-center gap-3">
      <span
        className="inline-block w-2 h-2 rounded-full bg-[#3D5AFE] shrink-0"
        aria-hidden
      >
        <span className="block w-2 h-2 rounded-full bg-[#3D5AFE] animate-ping" />
      </span>
      <span className="text-xs font-mono uppercase tracking-widest text-[#A8A29E] flex-1">
        <span className="text-[#8FA0FF]">{message}</span>
      </span>
      <a
        href={ctaHref}
        className="text-xs font-mono uppercase tracking-widest text-[#8FA0FF] hover:text-[#FAFAFA] transition-colors"
      >
        {ctaLabel} →
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, '1')
            // Manually fire so useSyncExternalStore subscribers in this tab
            // re-read — storage events only fire cross-tab.
            window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
          } catch {}
        }}
        className="text-[#78716C] hover:text-[#FAFAFA] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
