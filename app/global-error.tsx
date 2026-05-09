'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error]', error)
    // Report to /api/telemetry/error directly — this boundary sits above
    // the layout so we can't import the client reporter component.
    try {
      const body = JSON.stringify({
        message: error.message,
        stack: error.stack ?? null,
        digest: error.digest ?? null,
        severity: 'error',
        url: typeof window !== 'undefined' ? window.location.pathname : null,
      })
      if (navigator && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/telemetry/error', blob)
      } else {
        void fetch('/api/telemetry/error', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => undefined)
      }
    } catch {
      // best-effort
    }
  }, [error])

  // Must include html + body — this replaces the root layout when it fails.
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#09090B',
          color: '#FAFAFA',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 999,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Critical · root layout failed
          </div>
          <h1
            style={{
              fontSize: 48,
              margin: 0,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            We hit a wall.
          </h1>
          <p
            style={{
              marginTop: 16,
              color: '#A1A1AA',
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            The application crashed before it could render. The error is being logged. Try
            reloading the page.
          </p>
          {error.digest && (
            <div
              style={{
                marginTop: 16,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: 12,
                color: '#71717A',
              }}
            >
              digest: {error.digest}
            </div>
          )}
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={reset}
              style={{
                background: '#06B6D4',
                color: '#09090B',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Reload
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                color: '#FAFAFA',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #27272A',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Back home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
