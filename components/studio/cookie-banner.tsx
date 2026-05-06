'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'sage-cookie-consent-v1'

type Consent = 'accepted' | 'essential' | null

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Delay hydration by a moment so the banner doesn't fight the hero CTA on first paint.
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Consent
        setConsent(stored)
      } catch {
        // localStorage unavailable — show banner on every load.
      }
      setHydrated(true)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  const persist = (value: Exclude<Consent, null>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Ignore — privacy-mode browsers may block storage.
    }
    setConsent(value)
  }

  if (!hydrated || consent !== null) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent"
        className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-[40] pointer-events-none"
      >
        <div className="bg-[#0F0F12] border border-[#27272A] rounded-2xl p-5 shadow-2xl shadow-black/40 backdrop-blur-md pointer-events-auto">
          <h2 className="text-sm font-semibold text-[#FAFAFA] mb-1">We use a few cookies.</h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Essential cookies keep the site working. Analytics cookies help us understand which
            content is useful. You can change your mind anytime in our{' '}
            <Link
              href="/legal/cookies"
              className="text-[#06B6D4] hover:text-[#0EA5E9] underline underline-offset-2"
            >
              Cookie Policy
            </Link>
            .
          </p>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]"
              onClick={() => persist('essential')}
            >
              Essential only
            </Button>
            <Button
              size="sm"
              className="bg-[#06B6D4] hover:bg-[#0891B2] text-[#09090B] font-medium"
              onClick={() => persist('accepted')}
            >
              Accept all
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
