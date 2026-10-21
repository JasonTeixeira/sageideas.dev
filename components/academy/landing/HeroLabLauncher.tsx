'use client'

import { lazy, Suspense, useState } from 'react'
import { useT } from '@/components/i18n/locale-provider'

const HeroLab = lazy(async () => {
  const heroLabModule = await import('./HeroLab')
  return { default: heroLabModule.HeroLab }
})

const MONO = { fontFamily: 'var(--font-mono), monospace' } as const
const STARTER = `def average(values):
    # BUG: this returns the sum, not the average — fix it
    return sum(values)

print(average([10, 20, 30]))`

function StaticLabPreview({ activate, loading = false }: { activate: () => void; loading?: boolean }) {
  const t = useT()
  return (
    <figure style={{ margin: 0, minWidth: 0, border: '1px solid #1E1E24', borderRadius: 16, background: '#111115', overflow: 'hidden', boxShadow: '0 32px 80px -32px rgba(0,0,0,0.85)' }}>
      <figcaption style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #1E1E24' }}>
        <span style={{ ...MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2' }}>
          {t('In-browser Python · no signup')}
        </span>
        <span style={{ ...MONO, fontSize: 10.5, color: '#9598A2' }}>{loading ? t('starting python…') : t('ready to run')}</span>
      </figcaption>
      <pre aria-label={t('Python exercise preview')} style={{ ...MONO, margin: 0, minHeight: 148, overflow: 'auto', background: '#0B0B0E', color: '#B6B6C0', padding: '16px 20px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {STARTER}
      </pre>
      <div style={{ ...MONO, padding: '13px 18px', borderTop: '1px solid #1E1E24', background: '#0B0B0E', fontSize: 12.5, color: '#9598A2' }}>
        {t('Run it. It fails. Fix line 3, run again — watch it go green.')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderTop: '1px solid #1E1E24', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={activate}
          disabled={loading}
          style={{ ...MONO, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3D5AFE', color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 600, padding: '9px 18px', borderRadius: 18, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? t('starting…') : `▸ ${t('Run')}`}
        </button>
        <span style={{ ...MONO, fontSize: 10.5, color: '#9598A2', marginLeft: 'auto' }}>
          {t('real runtime · in a lesson this check is server-verified')}
        </span>
      </div>
    </figure>
  )
}

export function HeroLabLauncher() {
  const [active, setActive] = useState(false)
  if (!active) return <StaticLabPreview activate={() => setActive(true)} />
  return (
    <Suspense fallback={<StaticLabPreview activate={() => undefined} loading />}>
      <HeroLab />
    </Suspense>
  )
}
