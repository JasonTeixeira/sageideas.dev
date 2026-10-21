'use client'

import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'

let initialized = false
let posthogClient: typeof import('posthog-js').default | null = null

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
    void import('posthog-js').then(({ default: posthog }) => {
      if (initialized) return
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: 'identified_only',
        // No session recording on marketing — keeps the ~50-80KB rrweb recorder
        // out of the bundle and avoids recording prospects on the public site.
        disable_session_recording: true,
      })
      posthogClient = posthog
      initialized = true
    }).catch(() => undefined)
  }, [])

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized || !posthogClient) return
  try {
    posthogClient.capture(event, props)
  } catch {}
}
