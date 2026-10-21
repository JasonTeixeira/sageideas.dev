import Link from 'next/link'

/**
 * The cohesion band — dropped before the footer on every academy marketing page
 * so the flagships stop being orphans and each page hands off to the next.
 * `current` hides the card for the page you're on. Static, fast (no images).
 */

const INK = '#F2EFE9'
const DIM = '#9598A2'
const LINE = '#1E1E24'
const ACCENT_INK = '#8FA0FF'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export type EcosystemKey = 'method' | 'try' | 'projects' | 'map' | 'catalog' | 'starter'

const STOPS: { key: EcosystemKey; href: string; label: string; blurb: string }[] = [
  { key: 'method', href: '/academy/method', label: 'The method', blurb: 'Why it actually builds senior engineers' },
  { key: 'try', href: '/academy/try', label: 'Try a lesson', blurb: 'Fix real code in your browser — free, no signup' },
  { key: 'projects', href: '/academy/labs', label: 'The Labs', blurb: 'Real builds you ship and keep — new ones every month' },
  { key: 'map', href: '/academy/map', label: 'The map', blurb: 'The whole curriculum, connected' },
  { key: 'catalog', href: '/academy/catalog', label: 'Browse courses', blurb: 'Every track, foundations to AI engineering' },
]

export function EcosystemBand({ current, heading = 'One system. Keep exploring.' }: { current?: EcosystemKey; heading?: string }) {
  const stops = STOPS.filter((s) => s.key !== current).slice(0, 4)
  return (
    <section style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ ...serif, margin: 0, fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 32px)', letterSpacing: '-0.02em' }}>{heading}</h2>
          <Link href="/academy/signup" style={{ ...mono, fontSize: 12, color: ACCENT_INK, textDecoration: 'none' }}>start free →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 14, marginTop: 28 }}>
          {stops.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              style={{
                display: 'block',
                border: `1px solid ${LINE}`,
                borderRadius: 14,
                background: '#111115',
                padding: '20px 20px 22px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>{s.label}</div>
              <p style={{ margin: '8px 0 14px', fontSize: 13.5, color: DIM, lineHeight: 1.5 }}>{s.blurb}</p>
              <span style={{ ...mono, fontSize: 11, color: ACCENT_INK }}>open →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
