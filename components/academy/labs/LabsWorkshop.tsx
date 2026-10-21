'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/components/i18n/locale-provider'
import { LAB_TRACKS, type LabProject, type LabTrack } from '@/data/academy/labs'

const INK = '#F2EFE9'
const DIM = '#9C9CA6'
const FAINT = '#9598A2'
const LINE = '#1E1E24'
const BLUE = '#3D5AFE'
const GREEN = '#18B663'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

const DIFFICULTY_LABEL = ['', 'Starter', 'Applied', 'Working', 'Advanced', 'Senior'] as const

/** A 5-segment difficulty meter — reads at a glance, no numbers to decode. */
function DifficultyMeter({ level, tint }: { level: number; tint: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: 14,
            height: 4,
            borderRadius: 2,
            background: i <= level ? tint : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </span>
  )
}

function LabCard({ lab, featured }: { lab: LabProject; featured?: boolean }) {
  const t = useT()
  const track = LAB_TRACKS[lab.track]
  const [hover, setHover] = useState(false)
  return (
    <Link
      href={`/academy/labs/${lab.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gridColumn: featured ? 'span 2' : 'span 1',
        textDecoration: 'none',
        color: 'inherit',
        border: `1px solid ${hover ? 'rgba(61,90,254,0.45)' : LINE}`,
        borderRadius: 16,
        background: hover
          ? 'linear-gradient(180deg, rgba(61,90,254,0.05), #101014)'
          : '#0E0E12',
        padding: featured ? 'clamp(24px, 3vw, 34px)' : '22px',
        transition: 'border-color 180ms ease, transform 180ms ease, background 180ms ease',
        transform: hover ? 'translateY(-3px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* work-order header: track · difficulty · hours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: track.tint }}>
          {track.label}
        </span>
        <span aria-hidden style={{ color: FAINT }}>·</span>
        <DifficultyMeter level={lab.difficulty} tint={track.tint} />
        <span style={{ ...mono, fontSize: 10.5, color: FAINT }}>{DIFFICULTY_LABEL[lab.difficulty]}</span>
        <span style={{ ...mono, fontSize: 10.5, color: FAINT, marginLeft: 'auto' }}>~{lab.hours}h</span>
      </div>

      <h3
        style={{
          ...serif,
          margin: '16px 0 0',
          fontWeight: 600,
          fontSize: featured ? 'clamp(24px, 2.6vw, 32px)' : 20,
          lineHeight: 1.12,
          letterSpacing: '-0.02em',
          color: INK,
        }}
      >
        {lab.title}
      </h3>
      <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.6, color: DIM, maxWidth: '54ch' }}>
        {featured ? lab.whatYouBuild : lab.tagline}
      </p>

      {/* PROVES — the differentiator, set apart as a résumé line */}
      <div
        style={{
          marginTop: 18,
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid rgba(24,182,99,0.22)',
          background: 'rgba(24,182,99,0.05)',
        }}
      >
        <div style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: GREEN, marginBottom: 6 }}>
          {t('Résumé line')}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#CFE9DA' }}>{lab.resumeLine}</div>
      </div>

      {/* footer: phases + proof-check count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <span style={{ ...mono, fontSize: 10.5, color: FAINT }}>
          {lab.phases.join(' → ')}
        </span>
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            marginLeft: 'auto',
            color: hover ? INK : DIM,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
          {lab.acceptanceChecks.length} {t('checks · proof')}
        </span>
      </div>
    </Link>
  )
}

type SortableTrack = LabTrack | 'all'

export function LabsWorkshop({ labs }: { labs: LabProject[] }) {
  const t = useT()
  const [track, setTrack] = useState<SortableTrack>('all')
  const [maxDiff, setMaxDiff] = useState<number>(5)
  const [q, setQ] = useState('')
  const [newOnly, setNewOnly] = useState(false)

  const newestMonth = useMemo(
    () => labs.reduce((m, l) => (l.addedMonth > m ? l.addedMonth : m), ''),
    [labs],
  )

  const trackCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const l of labs) c[l.track] = (c[l.track] || 0) + 1
    return c
  }, [labs])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return labs.filter((l) => {
      if (track !== 'all' && l.track !== track) return false
      if (l.difficulty > maxDiff) return false
      if (newOnly && l.addedMonth !== newestMonth) return false
      if (needle) {
        const hay = `${l.title} ${l.tagline} ${l.resumeLine} ${l.stack.join(' ')} ${l.proves.join(' ')}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [labs, track, maxDiff, q, newOnly, newestMonth])

  const chipBase: React.CSSProperties = {
    ...mono,
    fontSize: 12,
    padding: '8px 14px',
    borderRadius: 20,
    border: `1px solid ${LINE}`,
    background: 'transparent',
    color: DIM,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms ease',
  }
  const chipOn = (tint: string): React.CSSProperties => ({
    ...chipBase,
    border: `1px solid ${tint}`,
    background: `${tint}14`,
    color: INK,
  })

  return (
    <section id="catalog" style={{ borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 48px)' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={() => setTrack('all')} style={track === 'all' ? chipOn(BLUE) : chipBase}>
            {t('All')} · {labs.length}
          </button>
          {(Object.keys(LAB_TRACKS) as LabTrack[])
            .filter((tk) => trackCounts[tk])
            .map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => setTrack(track === tk ? 'all' : tk)}
                style={track === tk ? chipOn(LAB_TRACKS[tk].tint) : chipBase}
              >
                {LAB_TRACKS[tk].label} · {trackCounts[tk]}
              </button>
            ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 16 }}>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Search builds, stacks, skills…')}
            aria-label={t('Search builds')}
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              background: '#0E0E12',
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: '11px 15px',
              fontSize: 14,
              color: INK,
              outline: 'none',
            }}
          />
          <label style={{ ...mono, fontSize: 11.5, color: DIM, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {t('up to')}
            <input
              type="range"
              min={1}
              max={5}
              value={maxDiff}
              onChange={(e) => setMaxDiff(Number(e.target.value))}
              aria-label="Maximum difficulty"
              style={{ accentColor: BLUE }}
            />
            <span style={{ color: INK, minWidth: 56 }}>{DIFFICULTY_LABEL[maxDiff]}</span>
          </label>
          <button
            type="button"
            onClick={() => setNewOnly((v) => !v)}
            style={newOnly ? chipOn(GREEN) : chipBase}
          >
            ✦ {t('New this month')}
          </button>
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: 18,
            marginTop: 28,
          }}
        >
          {filtered.map((lab) => (
            <LabCard key={lab.slug} lab={lab} featured={track === 'all' && !q && lab.featured} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ ...mono, fontSize: 13, color: DIM, padding: '40px 0', textAlign: 'center' }}>
            {t('No builds match that filter yet — more ship every month.')}
          </div>
        )}
      </div>
    </section>
  )
}
