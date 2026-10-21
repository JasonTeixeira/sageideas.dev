'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import { captureAcademyEvent } from './academyAnalytics'

const SageChatPanel = lazy(async () => {
  const panelModule = await import('./SageChatPanel')
  return { default: panelModule.SageChatPanel }
})

/** A lightweight launcher; the reply engine and panel load only after intent. */
export function SageChat() {
  const [open, setOpen] = useState(false)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) void captureAcademyEvent('chat_opened', { page: window.location.pathname })
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="Chat with Sprout"
        aria-expanded={open}
        aria-controls="sprout-chat-panel"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: '#3D5AFE',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 19,
          boxShadow: '0 0 24px rgba(61,90,254,0.4), 0 12px 32px -8px rgba(0,0,0,0.6)',
          zIndex: 95,
          transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        ◆
      </button>
      {open ? (
        <Suspense fallback={null}>
          <SageChatPanel onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  )
}

/** Delegated Academy funnel telemetry with no eager analytics SDK cost. */
export function FunnelTelemetry() {
  useEffect(() => {
    const page = window.location.pathname
    const onClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest('a, button')
      if (!element) return
      const href = element.getAttribute('href') ?? undefined
      const text = (element.textContent ?? '').trim().slice(0, 80)
      if (!text && !href) return
      void captureAcademyEvent('cta_click', { href, text, page })
    }
    const fired = new Set<number>()
    const onScroll = () => {
      const documentElement = document.documentElement
      const depth = ((window.scrollY + window.innerHeight) / documentElement.scrollHeight) * 100
      for (const mark of [25, 50, 75, 100]) {
        if (depth < mark || fired.has(mark)) continue
        fired.add(mark)
        void captureAcademyEvent('scroll_depth', { depth: mark, page })
      }
    }
    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return null
}
