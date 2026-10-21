import type { Metadata } from 'next'
import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
import { LabsWorkshop } from '@/components/academy/labs/LabsWorkshop'
import { LABS, liveLabs } from '@/data/academy/labs'
import { getT } from '@/lib/i18n/t'
import { getLocale } from '@/lib/i18n/server'
import { localizedAlternates } from '@/lib/i18n/alternates'

const INK = '#F2EFE9'
const DIM = '#9C9CA6'
const FAINT = '#9598A2'
const LINE = '#1E1E24'
const BLUE = '#3D5AFE'
const GREEN = '#18B663'
const ACCENT_INK = '#8FA0FF'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('The Labs — a workshop of real, resume-ready builds — Sage Academy'),
    description: t(
      'Not exercises — real systems you build and keep. Every lab ships with a spec, a runnable proof, and the exact line you can put on your résumé. New builds every month.',
    ),
    alternates: localizedAlternates('/academy/labs', locale),
    openGraph: {
      title: t('The Labs — build real systems, keep the proof'),
      description: t('A monthly-growing workshop of resume-ready builds, each ending in a runnable check.'),
      images: ['/og?title=The+Labs&subtitle=Build+real+systems,+keep+the+proof'],
    },
    twitter: { card: 'summary_large_image', images: ['/og?title=The+Labs&subtitle=Build+real+systems,+keep+the+proof'] },
  }
}

const section: React.CSSProperties = { borderTop: `1px solid ${LINE}` }
const container: React.CSSProperties = { maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }

// The proof mechanic, said once.
const HOW = [
  { k: 'frame', t: 'A real brief', d: 'Every lab opens with a spec a real team would recognize — not a puzzle with one clever answer.' },
  { k: 'build', t: 'You build it', d: 'A starter scaffold and the Sage loop: map the system, decide under tradeoffs, ship the thing.' },
  { k: 'prove', t: 'It passes checks', d: 'Each build ends in runnable acceptance checks — the proof a skeptic can re-run, the reason it belongs on your résumé.' },
]

export default async function LabsPage() {
  const t = await getT()
  const labs = liveLabs()
  const trackCount = new Set(LABS.map((l) => l.track)).size
  const totalChecks = LABS.reduce((n, l) => n + l.acceptanceChecks.length, 0)

  const stats: [string, string][] = [
    [String(LABS.length), t('builds, and counting')],
    [String(trackCount), t('tracks')],
    [String(totalChecks), t('runnable proof checks')],
    [t('Monthly'), t('new builds added')],
  ]

  return (
    <>
      <AcademyNav />
      <main id="main-content" tabIndex={-1} style={{ background: '#0B0B0E', color: INK, fontFamily: 'var(--font-sans), sans-serif', overflowX: 'clip' }}>
        {/* HERO — the thesis */}
        <header
          className="sage-rise"
          style={{ ...container, paddingBottom: 'clamp(32px, 5vw, 56px)', backgroundImage: 'radial-gradient(85% 55% at 50% -10%, rgba(61,90,254,0.10) 0%, transparent 60%)' }}
        >
          <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: ACCENT_INK }}>
            {t('The Labs · a working workshop')}
          </div>
          <h1
            style={{
              ...serif,
              margin: '18px 0 0',
              fontWeight: 600,
              fontSize: 'clamp(40px, 6.4vw, 86px)',
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              maxWidth: '18ch',
              textWrap: 'balance',
            }}
          >
            {t('A workshop, not a')} <em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('worksheet.')}</em>
          </h1>
          <p style={{ margin: '26px 0 0', color: DIM, fontSize: 'clamp(17px, 1.5vw, 20px)', lineHeight: 1.6, maxWidth: '58ch', textWrap: 'pretty' }}>
            {t('Real systems you build and keep — each with a spec, a runnable proof, and the exact line you can put on your résumé. Pick a build, ship it, walk away with evidence.')}
          </p>

          {/* stat row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px, 4vw, 56px)', marginTop: 40 }}>
            {stats.map(([n, label], i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <div style={{ ...serif, fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 42px)', color: i === 0 ? GREEN : INK, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 13, color: '#9598A2', marginTop: 8, maxWidth: '16ch' }}>{label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* HOW A BUILD WORKS — the proof mechanic */}
        <section style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: ACCENT_INK }}>{t('How a build works')}</div>
            <h2 style={{ ...serif, margin: '14px 0 0', fontWeight: 600, fontSize: 'clamp(26px, 3.2vw, 40px)', lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: '20ch', textWrap: 'balance' }}>
              {t('Every lab ends in something a skeptic can')} <em style={{ fontStyle: 'italic', color: GREEN }}>{t('re-run.')}</em>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 18, marginTop: 36 }}>
              {HOW.map((h, i) => (
                <div key={h.k} style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#0E0E12', padding: 24 }}>
                  <div style={{ ...mono, fontSize: 10.5, color: FAINT }}>{String(i + 1).padStart(2, '0')} · {h.k}</div>
                  <div style={{ ...serif, margin: '12px 0 0', fontSize: 21, fontWeight: 600, color: INK }}>{t(h.t)}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: DIM, lineHeight: 1.6 }}>{t(h.d)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* THE CATALOG */}
        <LabsWorkshop labs={labs} />

        {/* CTA */}
        <section style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={{ ...container, textAlign: 'center' }}>
            <h2 style={{ ...serif, margin: 0, fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 46px)', lineHeight: 1.04, letterSpacing: '-0.025em', textWrap: 'balance' }}>
              {t('Pick a build. Ship it.')} <em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('Keep the proof.')}</em>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 30 }}>
              <Link href="/academy/signup" style={{ display: 'inline-flex', background: BLUE, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '15px 28px', borderRadius: 26, boxShadow: '0 0 22px rgba(61,90,254,0.35)' }}>
                {t('Start building free')}
              </Link>
              <Link href="/academy/method" style={{ display: 'inline-flex', color: INK, border: '1px solid #2A2A33', textDecoration: 'none', fontSize: 15, padding: '14px 28px', borderRadius: 26 }}>
                {t('See the method →')}
              </Link>
            </div>
          </div>
        </section>

        <EcosystemBand current="projects" />
      </main>
      <AcademyFooter />
    </>
  )
}
