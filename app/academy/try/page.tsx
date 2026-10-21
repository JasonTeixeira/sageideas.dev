import type { Metadata } from 'next'
import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
import { IdempotencyLab } from '@/components/academy/sample/IdempotencyLab'
import { getT } from '@/lib/i18n/t'
import { getLocale } from '@/lib/i18n/server'
import { localizedAlternates } from '@/lib/i18n/alternates'
import { SkipToContent } from '@/components/skip-to-content'

const INK = '#F2EFE9'
const DIM = '#9C9CA6'
const LINE = '#1E1E24'
const ACCENT = '#3D5AFE'
const ACCENT_INK = '#8FA0FF'
const GREEN = '#18B663'
const RED = '#E5484D'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('Try a real lesson, free — no signup — Sage Academy'),
    description: t(
      'A real Sage Academy lesson you can do right now, no account: understand idempotency, then fix a double-charging payment in an in-browser Python lab and watch the check go green.'
    ),
    alternates: localizedAlternates('/academy/try', locale),
    openGraph: {
      title: t('Try a real Sage Academy lesson — free, no signup'),
      description: t(
        'Fix a double-charging payment in your browser and watch the check go green. This is what every lesson feels like.'
      ),
      images: ['/og?title=Try+a+real+lesson&subtitle=No+signup+%C2%B7+fix+it+in+your+browser'],
    },
    twitter: { card: 'summary_large_image', images: ['/og?title=Try+a+real+lesson&subtitle=No+signup+%C2%B7+fix+it+in+your+browser'] },
  }
}

const kicker: React.CSSProperties = { ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: ACCENT_INK }
const blockNum: React.CSSProperties = { ...mono, fontSize: 11, color: ACCENT_INK }
const h2: React.CSSProperties = { ...serif, fontWeight: 600, fontSize: 'clamp(24px, 3vw, 34px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '8px 0 0', textWrap: 'balance' }
const body: React.CSSProperties = { margin: '14px 0 0', color: DIM, fontSize: 16.5, lineHeight: 1.65, maxWidth: '62ch' }

function Block({ n, kind, children }: { n: string; kind: string; children: React.ReactNode }) {
  return (
    <section className="sage-rise" style={{ borderTop: `1px solid ${LINE}`, padding: 'clamp(36px, 5vw, 56px) 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={blockNum}>{n}</span>
        <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: DIM }}>{kind}</span>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

function RetryRow({
  label,
  color,
  charges,
  keyed,
  t,
}: {
  label: string
  color: string
  charges: string
  keyed: boolean
  t: (source: string) => string
}) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#0B0B0E', padding: '18px 20px' }}>
      <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color, marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ ...mono, fontSize: 12, color: DIM }}>{t('client')}</span>
        <div style={{ position: 'relative', flex: '1 1 120px', minWidth: 90, height: 24 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} aria-hidden="true" className="sgpulse" style={{ position: 'absolute', top: 9, left: 0, width: 7, height: 7, borderRadius: '50%', background: color, animationDelay: `${i * 0.5}s` }} />
          ))}
          <span style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 1.5, background: LINE }} />
          <span style={{ ...mono, position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: DIM }}>{t('retry ×3')}</span>
        </div>
        {keyed ? <span style={{ ...mono, fontSize: 11, color: ACCENT_INK, border: `1px solid rgba(61,90,254,0.4)`, borderRadius: 8, padding: '5px 9px' }}>{t('idem-key')}</span> : null}
        <span style={{ ...mono, fontSize: 12, color: DIM }}>{t('charge')}</span>
        <span style={{ ...serif, fontSize: 26, fontWeight: 600, color, minWidth: 28, textAlign: 'center' }}>{charges}</span>
      </div>
    </div>
  )
}

// The animated "retry storm" diagram — CSS-only pulses travelling the request
// lines. Without a key, 3 retries → 3 charges (red). With a key → 1 (green).
function RetryDiagram({ t }: { t: (source: string) => string }) {
  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
      <style>{`@keyframes sgpulseMove{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:100%;opacity:0}}.sgpulse{animation:sgpulseMove 1.5s linear infinite}@media (prefers-reduced-motion: reduce){.sgpulse{animation:none;left:50%}}`}</style>
      <RetryRow label={t('Without a key — every retry charges')} color={RED} charges="3" keyed={false} t={t} />
      <RetryRow label={t('With an idempotency key — retries are no-ops')} color={GREEN} charges="1" keyed t={t} />
    </div>
  )
}

export default async function TryLessonPage() {
  const t = await getT()
  return (
    <>
      <SkipToContent />
      <AcademyNav />
      <div style={{ background: '#0B0B0E', color: INK, fontFamily: 'var(--font-sans), sans-serif', overflowX: 'clip', minHeight: '100vh' }}>
        <main id="main-content" tabIndex={-1} style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 40px) 100px' }}>
          {/* lesson chrome */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={kicker}>{t('Free sample lesson · no signup')}</div>
            <div style={{ ...mono, fontSize: 11, color: DIM }}>{t('~4 min · real python in your browser')}</div>
          </div>
          <h1 style={{ ...serif, margin: '16px 0 0', fontWeight: 600, fontSize: 'clamp(30px, 4.6vw, 52px)', lineHeight: 1.02, letterSpacing: '-0.028em', textWrap: 'balance' }}>
            {t('Why retrying a payment is')} <em style={{ fontStyle: 'italic', color: RED }}>{t('dangerous')}</em> {t('— and the one line that fixes it.')}
          </h1>

          {/* 01 — the stake (pretest / productive failure) */}
          <Block n="01" kind={t('the stake')}>
            <p style={body}>
              {t("A customer's connection drops mid-checkout, so their app quietly")} <b style={{ color: INK }}>{t('retries the charge')}</b> —
              {t('three times. Your naive code runs three times. The customer is charged')} <b style={{ color: RED }}>3×</b> {t("for one order, and now it's your 3am page. This exact bug has cost real companies real money. Let's make it impossible.")}
            </p>
          </Block>

          {/* 02 — the concept (one mental model, <=40 words) */}
          <Block n="02" kind={t('the mental model')}>
            <h2 style={h2}>{t('Idempotency: same request, same effect — no matter how many times.')}</h2>
            <p style={body}>
              {t('An operation is')} <b style={{ color: INK }}>{t('idempotent')}</b> {t('when doing it once and doing it ten times land you in the same place. The trick: give each request a unique')} <b style={{ color: ACCENT_INK }}>{t('key')}</b>{t(", remember the keys you've handled, and make a repeat key a no-op. Retries become safe.")}
            </p>
          </Block>

          {/* 03 — the diagram */}
          <Block n="03" kind={t('see it')}>
            <RetryDiagram t={t} />
          </Block>

          {/* 04 — the lab (productive failure → fix → proof) */}
          <Block n="04" kind={t('your turn — fix it')}>
            <p style={{ ...body, marginTop: 0, marginBottom: 20 }}>
              {t("Here's the broken")} <b style={{ color: INK }}>charge()</b>{t('. Run it — it charges three times. Then add the guard so a repeated key does nothing, and run again. Real Python, running right here.')}
            </p>
            <IdempotencyLab />
          </Block>

          {/* 05 — verification / recap */}
          <Block n="05" kind={t('prove it — no vibes')}>
            <p style={body}>
              {t('Green means')} <b style={{ color: GREEN }}>{t('3 retries → 1 charge')}</b>{t(". You didn't read about idempotency — you implemented it, and a check confirmed it. That's every Sage lesson: a mental model, a diagram, and a proof a skeptic can run. No self-graded quiz, no “I think I get it.”")}
            </p>
          </Block>

          {/* CTA */}
          <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 8, paddingTop: 40 }}>
            <h2 style={{ ...serif, fontWeight: 600, fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.02em', textWrap: 'balance' }}>
              {t('That was one lesson. There are')} <em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('hundreds')}</em> {t('more.')}
            </h2>
            <p style={{ ...body }}>{t('Each one ends in a proof like this and stacks into a portfolio a hiring manager can run.')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
              <Link href="/academy/signup" style={{ display: 'inline-flex', background: ACCENT, color: '#fff', textDecoration: 'none', fontSize: 15.5, fontWeight: 600, padding: '16px 30px', borderRadius: 28, boxShadow: '0 0 26px rgba(61,90,254,0.4)' }}>{t('Start free')}</Link>
              <Link href="/academy/method" style={{ display: 'inline-flex', color: INK, border: `1px solid #2A2A33`, textDecoration: 'none', fontSize: 15.5, padding: '15px 28px', borderRadius: 28 }}>{t('How the method works →')}</Link>
              <Link href="/academy/projects" style={{ ...mono, fontSize: 12, color: ACCENT_INK, textDecoration: 'none', alignSelf: 'center' }}>{t("what you'll build →")}</Link>
            </div>
          </div>
        </main>
      </div>
      <EcosystemBand current="try" />
      <AcademyFooter />
    </>
  )
}
