import Link from 'next/link'
import { LABS, LAB_TRACKS } from '@/data/academy/labs'
import { getT } from '@/lib/i18n/t'

const INK = '#F2EFE9'
const DIM = '#9C9CA6'
const FAINT = '#9598A2'
const LINE = '#1E1E24'
const BLUE = '#3D5AFE'
const GREEN = '#18B663'
const ACCENT_INK = '#8FA0FF'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

const section: React.CSSProperties = { borderTop: `1px solid ${LINE}` }
const container: React.CSSProperties = { maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }

/**
 * Homepage band that surfaces the Labs workshop — the "build real things" depth.
 * Server component; reads the live catalog so counts and featured builds stay
 * in sync with data/academy/labs.ts (no numbers to hand-maintain).
 */
export async function LabsHomeSection() {
  const t = await getT()
  const featured = LABS.filter((l) => l.featured).slice(0, 3)
  const trackCount = new Set(LABS.map((l) => l.track)).size

  return (
    <section id="labs" style={{ ...section, background: '#0D0D11' }}>
      <div style={container}>
        {/* Header row: thesis + counter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: ACCENT_INK }}>
              {t('The Labs · build real things')}
            </div>
            <h2 style={{ ...serif, margin: '14px 0 0', fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 46px)', lineHeight: 1.04, letterSpacing: '-0.025em', textWrap: 'balance' }}>
              {t('Courses build the judgment. Labs are where you')} <em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('use it.')}</em>
            </h2>
            <p style={{ margin: '18px 0 0', color: DIM, fontSize: 16.5, lineHeight: 1.6, maxWidth: '56ch', textWrap: 'pretty' }}>
              {t('A growing workshop of real, buildable systems — each ends in a runnable proof and the exact line you can put on your résumé. New builds every month.')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'clamp(20px, 3vw, 40px)' }}>
            <div>
              <div style={{ ...serif, fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 44px)', color: GREEN, lineHeight: 1 }}>{LABS.length}</div>
              <div style={{ fontSize: 12.5, color: '#9598A2', marginTop: 6 }}>{t('builds, and counting')}</div>
            </div>
            <div>
              <div style={{ ...serif, fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 44px)', color: INK, lineHeight: 1 }}>{trackCount}</div>
              <div style={{ fontSize: 12.5, color: '#9598A2', marginTop: 6 }}>{t('tracks')}</div>
            </div>
          </div>
        </div>

        {/* Featured builds */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18, marginTop: 40 }}>
          {featured.map((lab) => {
            const track = LAB_TRACKS[lab.track]
            return (
              <Link
                key={lab.slug}
                href={`/academy/labs/${lab.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  color: 'inherit',
                  border: `1px solid ${LINE}`,
                  borderRadius: 16,
                  background: '#0B0B0E',
                  padding: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: track.tint }}>{track.label}</span>
                  <span aria-hidden style={{ color: FAINT }}>·</span>
                  <span style={{ ...mono, fontSize: 10.5, color: FAINT }}>~{lab.hours}h</span>
                </div>
                <h3 style={{ ...serif, margin: '14px 0 0', fontWeight: 600, fontSize: 21, lineHeight: 1.15, letterSpacing: '-0.015em', color: INK }}>{lab.title}</h3>
                <p style={{ margin: '10px 0 0', fontSize: 14, color: DIM, lineHeight: 1.55 }}>{lab.tagline}</p>
                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <div style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: GREEN, marginBottom: 6 }}>{t('Résumé line')}</div>
                  <div style={{ fontSize: 12.5, color: '#CFE9DA', lineHeight: 1.5 }}>{lab.resumeLine}</div>
                  <div style={{ ...mono, fontSize: 10.5, color: FAINT, marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
                    {lab.acceptanceChecks.length} {t('checks · proof')}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ marginTop: 32 }}>
          <Link
            href="/academy/labs"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...mono, fontSize: 13.5, color: INK, border: `1px solid ${BLUE}`, background: 'rgba(61,90,254,0.08)', textDecoration: 'none', padding: '13px 24px', borderRadius: 24 }}
          >
            {t('Explore all')} {LABS.length} {t('builds →')}
          </Link>
        </div>
      </div>
    </section>
  )
}
