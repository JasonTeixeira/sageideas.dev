'use client'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useT } from '@/components/i18n/locale-provider'

const VideoSection = lazy(async () => {
  const videoModule = await import('./VideoSection')
  return { default: videoModule.VideoSection }
})

function VideoPlaceholder({ activate, loading = false }: { activate: () => void; loading?: boolean }) {
  const t = useT()
  return (
    <section id="watch" style={{ borderTop: '1px solid #1E1E24' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>{t('The ideas in motion')}</div>
          <h2 style={{ fontFamily: 'var(--font-serif), Georgia, serif', margin: '14px 0 0', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.04, letterSpacing: '-0.025em', color: '#F2EFE9', textWrap: 'balance' }}>
            {t('The concepts behind modern AI — explained, not name-dropped.')}
          </h2>
          <p style={{ margin: '18px 0 0', color: '#9C9CA6', fontSize: 16.5, maxWidth: '58ch', textWrap: 'pretty' }}>
            {t("The same clarity every lesson is built for — the ideas you'll actually use, each explained in under a minute.")}
          </p>
          <button
            type="button"
            onClick={activate}
            disabled={loading}
            style={{ marginTop: 28, border: '1px solid rgba(61,90,254,0.5)', borderRadius: 22, background: 'rgba(61,90,254,0.08)', color: '#F2EFE9', padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? t('Loading explainers…') : t('Explore the video explainers')}
          </button>
        </div>
      </div>
    </section>
  )
}

export function DeferredVideoSection() {
  const [active, setActive] = useState(false)
  const boundaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active || !boundaryRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setActive(true)
      observer.disconnect()
    }, { rootMargin: '600px 0px' })
    observer.observe(boundaryRef.current)
    return () => observer.disconnect()
  }, [active])

  return (
    <div ref={boundaryRef}>
      {active ? (
        <Suspense fallback={<VideoPlaceholder activate={() => undefined} loading />}>
          <VideoSection />
        </Suspense>
      ) : (
        <VideoPlaceholder activate={() => setActive(true)} />
      )}
    </div>
  )
}
