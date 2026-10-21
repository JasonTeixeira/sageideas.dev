'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/i18n/locale-provider'

/**
 * Filter bar + course grid from "Sage Courses.dc.html" — the sticky track
 * chips, the count line, and the card grid (live-first sort, non-live cards
 * dimmed to 0.72) all match the design's renderVals() logic. Client component
 * only because the track filter is interactive state.
 */

const LINE = '#1E1E24'
const INK = '#F2EFE9'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export type TrackKey = 'foundations' | 'engineering' | 'data' | 'ai' | 'shipit' | 'growth'

export type CatalogCard = {
  track: TrackKey
  name: string
  outcome: string
  meta: string
  live: boolean
  /** Real course route when the course exists in the DB; null → /academy/signup */
  href: string | null
}

// tracks() from the design file, verbatim (keys, labels, tints).
const TRACKS: { key: 'all' | TrackKey; label: string; tint: string }[] = [
  { key: 'all', label: 'All tracks', tint: '#8FA0FF' },
  { key: 'foundations', label: 'Foundations', tint: '#6E83FF' },
  { key: 'engineering', label: 'Engineering', tint: '#8FA0FF' },
  { key: 'data', label: 'Data', tint: '#18B663' },
  { key: 'ai', label: 'AI Engineering', tint: '#FF2D9B' },
  { key: 'shipit', label: 'Ship-It', tint: '#E0A93E' },
  { key: 'growth', label: 'Growth', tint: '#7C3AED' },
]

const EMBLEMS: Record<TrackKey, string> = {
  foundations: '/art/academy/emblem-foundations.webp',
  engineering: '/art/academy/emblem-engineering.webp',
  data: '/art/academy/emblem-data.webp',
  ai: '/art/academy/emblem-ai.webp',
  shipit: '/art/academy/emblem-shipit.webp',
  growth: '/art/academy/emblem-growth.webp',
}

function tintOf(t: TrackKey): string {
  return TRACKS.find((x) => x.key === t)?.tint ?? '#8FA0FF'
}
function labelOf(t: TrackKey): string {
  return TRACKS.find((x) => x.key === t)?.label ?? t
}

export function CatalogGrid({ cards }: { cards: CatalogCard[] }) {
  const t = useT()
  const [track, setTrack] = useState<'all' | TrackKey>('all')
  const [q, setQ] = useState('')

  const needle = q.trim().toLowerCase()
  const filtered = cards.filter(
    (c) =>
      (track === 'all' || c.track === track) &&
      (!needle || `${c.name} ${c.outcome}`.toLowerCase().includes(needle)),
  )
  // live first — same stable sort as the design's renderVals()
  const sorted = [...filtered].sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0))
  const liveCount = sorted.filter((c) => c.live).length

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(20px, 4vw, 48px) clamp(64px, 9vw, 110px)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 32,
          position: 'sticky',
          top: 68,
          zIndex: 40,
          background: 'rgba(11,11,14,0.92)',
          backdropFilter: 'blur(10px)',
          padding: '14px 0',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        {TRACKS.map((trackOpt) => {
          const selected = track === trackOpt.key
          return (
            <button
              key={trackOpt.key}
              type="button"
              onClick={() => setTrack(trackOpt.key)}
              aria-pressed={selected}
              style={{
                ...mono,
                fontSize: 11.5,
                padding: '9px 16px',
                borderRadius: 20,
                border: `1px solid ${selected ? 'rgba(61,90,254,0.6)' : LINE}`,
                color: selected ? INK : '#9C9CA6',
                background: selected ? 'rgba(61,90,254,0.12)' : 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s',
              }}
            >
              {t(trackOpt.label)}
            </button>
          )
        })}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search courses…')}
          aria-label={t('Search courses')}
          style={{
            ...mono,
            marginLeft: 'auto',
            width: 'clamp(140px, 22vw, 220px)',
            fontSize: 12,
            padding: '9px 14px',
            borderRadius: 20,
            border: `1px solid ${LINE}`,
            background: '#0B0B0E',
            color: INK,
            outline: 'none',
          }}
        />
        <div style={{ ...mono, fontSize: 11, color: '#9598A2', alignSelf: 'center', whiteSpace: 'nowrap' }}>
          {sorted.length} {t(sorted.length === 1 ? 'course' : 'courses')} · {liveCount} {t('live')}
        </div>
      </div>
      {sorted.length === 0 ? (
        <p style={{ ...mono, fontSize: 13, color: '#9598A2', padding: '20px 0' }}>
          {t('No courses match')} &ldquo;{q}&rdquo;. {t('Try another term or track.')}
        </p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
        {sorted.map((c) => {
          const tint = tintOf(c.track)
          return (
            <Link
              key={c.name}
              href={c.href ?? '/academy/signup'}
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 14,
                background: '#111115',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 13,
                opacity: c.live ? 1 : 0.72,
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), border-color 0.22s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: tint }}>
                  {t(labelOf(c.track))}
                </span>
                <span style={{ ...mono, fontSize: 9.5, color: c.live ? '#18B663' : '#9598A2', whiteSpace: 'nowrap' }}>
                  {c.live ? <>✓ {t('live')}</> : <>⬜ {t('in production')}</>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    border: `1px solid ${tint}4D`,
                    backgroundColor: '#0B0B0E',
                    backgroundImage: `url('${EMBLEMS[c.track]}')`,
                    backgroundSize: '170%',
                    backgroundPosition: 'center',
                  }}
                />
                <span style={{ ...serif, fontWeight: 600, fontSize: 20, letterSpacing: '-0.015em', lineHeight: 1.18 }}>{c.name}</span>
              </div>
              <div style={{ fontSize: 13.5, color: '#9C9CA6', textWrap: 'pretty', flex: 1 }}>{c.outcome}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, paddingTop: 13 }}>
                <span style={{ ...mono, fontSize: 10.5, color: '#9598A2' }}>{c.meta}</span>
                <span style={{ ...mono, fontSize: 11, color: c.live ? '#8FA0FF' : '#9598A2' }}>
                  {c.live ? <>{t('Enroll')} →</> : <>{t('Join to get notified')} →</>}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
