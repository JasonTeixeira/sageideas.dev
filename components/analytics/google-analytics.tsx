'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const CONSENT_STORAGE_KEY = 'sage-cookie-consent-v1'
const CONSENT_EVENT = 'sage:cookie-consent'
const DEFAULT_GA4_MEASUREMENT_ID = 'G-PS7LKSEGVW'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

type Consent = 'accepted' | 'essential' | null

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || DEFAULT_GA4_MEASUREMENT_ID
  const requireConsent = process.env.NEXT_PUBLIC_GA4_REQUIRE_CONSENT !== 'false'
  const [consent, setConsent] = useState<Consent>(null)

  useEffect(() => {
    if (!requireConsent) {
      setConsent('accepted')
      return
    }

    const update = (value: unknown) => {
      setConsent(value === 'accepted' || value === 'essential' ? value : null)
    }
    try {
      update(window.localStorage.getItem(CONSENT_STORAGE_KEY))
    } catch {
      update(null)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY) update(event.newValue)
    }
    const onConsent = (event: Event) => {
      update((event as CustomEvent<{ consent?: unknown }>).detail?.consent)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CONSENT_EVENT, onConsent)
    }
  }, [requireConsent])

  useEffect(() => {
    if (!requireConsent || !window.gtag) return
    window.gtag('consent', 'update', {
      analytics_storage: consent === 'accepted' ? 'granted' : 'denied',
    })
  }, [consent, requireConsent])

  if (process.env.NODE_ENV !== 'production' || !/^G-[A-Z0-9]+$/i.test(measurementId)) return null

  const canLoadAnalytics = !requireConsent || consent === 'accepted'

  return (
    <>
      <Script
        id="ga4-consent"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              analytics_storage: '${requireConsent ? 'denied' : 'granted'}',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied'
            });
          `,
        }}
      />
      {canLoadAnalytics && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                window.gtag = window.gtag || function(){dataLayer.push(arguments);}
                gtag('consent', 'update', { analytics_storage: 'granted' });
                gtag('js', new Date());
                gtag('config', '${measurementId}', {
                  send_page_view: true,
                  anonymize_ip: true,
                  cookie_flags: 'SameSite=Lax;Secure'
                });
              `,
            }}
          />
        </>
      )}
    </>
  )
}
