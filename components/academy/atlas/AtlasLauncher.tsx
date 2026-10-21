'use client'

import { lazy, Suspense, useState } from 'react'
import { useT } from '@/components/i18n/locale-provider'

const AtlasIntake = lazy(async () => {
  const atlasModule = await import('./AtlasIntake')
  return { default: atlasModule.AtlasIntake }
})

/**
 * Mounts a persistent "Find your path" launcher. The larger intake experience
 * is fetched only after explicit learner intent, keeping initial navigation
 * responsive and avoiding an unsolicited first-visit interruption.
 */
export function AtlasLauncher() {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <>
      {open ? (
        <Suspense fallback={null}>
          <AtlasIntake onClose={() => setOpen(false)} />
        </Suspense>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            left: 20,
            bottom: 20,
            zIndex: 90,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 16px',
            borderRadius: 24,
            border: '1px solid rgba(143,160,255,0.35)',
            background: 'rgba(17,17,24,0.86)',
            backdropFilter: 'blur(8px)',
            color: '#F2EFE9',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 12px 32px -12px rgba(0,0,0,0.7)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #A9B6FF, #3D5AFE)',
              boxShadow: '0 0 10px rgba(61,90,254,0.7)',
            }}
          />
          {t('Find your path')}
        </button>
      )}
    </>
  )
}
