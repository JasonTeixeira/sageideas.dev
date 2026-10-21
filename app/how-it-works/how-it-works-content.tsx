import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
import { getT } from '@/lib/i18n/t'

type T = (source: string) => string

/**
 * "How it works" — the mastery loop, implemented 1:1 from
 * "Sage Academy Download/Sage How It Works.dc.html": section order, markup,
 * inline styles, copy (the DCLogic 'en' strings verbatim), step visuals, and
 * artwork (localized to /art/academy). Design-internal links map to real
 * routes; chrome is the shared AcademyNav / AcademyFooter.
 *
 * The 78 / 71→94 numbers in the Review and Repair cards are the design's
 * illustrative lesson-score geometry (same sample UI the home page ships),
 * not user metrics.
 */

const ACCENT = '#3D5AFE'
const GREEN = '#18B663'
const AMBER = '#E0A93E'
const CORAL = '#E5484D'
const INK = '#F2EFE9'
const LINE = '#1E1E24'
const LINE_STRONG = '#2A2A33'
const MUTED = '#9598A2'
const FAINT = '#4A4A54'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

interface Step {
  name: string
  body: string
  tint: string
  cta?: { href: string; label: string }
  card: React.ReactNode
}

/*
 * Step copy + per-visual data, verbatim from the design's dict().en
 * (steps + v.frame…v.pkg). Tints follow renderVals():
 * [accent, accent, amber, accent, green, amber, coral, accent, accent, green].
 */
function buildSteps(t: T): Step[] {
  return [
    {
      name: t('Frame'),
      tint: '#8FA0FF',
      body: t(
        'Turn a messy stake into a precise, falsifiable question. Most engineers debug the wrong problem beautifully — framing is the skill that stops that.'
      ),
      card: <FrameCard t={t} />,
    },
    {
      name: t('Route'),
      tint: '#8FA0FF',
      body: t('Choose where to look first: cheapest disproof wins. Two paths get ruled out on paper before you touch anything.'),
      card: <RouteCard t={t} />,
    },
    {
      name: t('Map'),
      tint: AMBER,
      body: t('Draw the system with directions, owners, and defended omissions. The failure becomes a location, not a vibe.'),
      card: <MapCard t={t} />,
    },
    {
      name: t('Decide'),
      tint: '#8FA0FF',
      body: t('Commit in writing: options, costs, and the constraint that forced your hand. A memo, not a hunch.'),
      card: <DecideCard t={t} />,
    },
    {
      name: t('Prove'),
      tint: GREEN,
      body: t("A concrete check a skeptic can run. The starter fails; your fix passes; the output can't be faked."),
      // Conversion beat: at the Prove move, the reader can go run the loop for
      // real — the public engine demo is the strongest proof this page has.
      cta: { href: '/academy/engine', label: t('Try this move live — free, no account →') },
      card: <ProveCard t={t} />,
    },
    {
      name: t('Review'),
      tint: AMBER,
      body: t('Your artifact is read the way a staff engineer reads it — your score is capped by the weakest claim.'),
      card: <ReviewCard t={t} />,
    },
    {
      name: t('Repair'),
      tint: CORAL,
      body: t('Broken cases are the curriculum. One repair lifts the cap — and teaches more than ten passing runs.'),
      card: <RepairCard t={t} />,
    },
    {
      name: t('Space'),
      tint: '#8FA0FF',
      body: t("Recall prompts arrive on the forgetting curve's schedule, not yours. Six minutes, then back to work."),
      card: <SpaceCard t={t} />,
    },
    {
      name: t('Transfer'),
      tint: '#8FA0FF',
      body: t("The same move, applied in a new domain. That's the moment knowledge becomes judgment."),
      card: <TransferCard t={t} />,
    },
    {
      name: t('Package'),
      tint: GREEN,
      body: t('The artifact joins your ledger: claim, artifact, verdict. Shareable, verifiable, yours.'),
      card: <PackageCard t={t} />,
    },
  ]
}

export async function HowItWorksContent() {
  const t = await getT()
  const STEPS = buildSteps(t)
  return (
    <>
      <AcademyNav />
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0E',
          backgroundImage: 'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%)',
          color: INK,
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 16,
          lineHeight: 1.6,
          overflowX: 'clip',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
.hiwCard { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s; }
.hiwCard:hover { transform: translateY(-3px); border-color: var(--tint); }
@media (prefers-reduced-motion: reduce) { .hiwCard { transition: none; } .hiwCard:hover { transform: none; } }`,
          }}
        />

        {/* ============ HERO ============ */}
        <header style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(64px, 9vw, 120px) clamp(20px, 4vw, 48px) clamp(40px, 5vw, 64px)', textAlign: 'center' }}>
          <div style={{ ...mono, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>{t('The mastery loop')}</div>
          <h1 style={{ ...serif, margin: '18px auto 0', fontWeight: 600, fontSize: 'clamp(38px, 5.4vw, 72px)', lineHeight: 1.0, letterSpacing: '-0.028em', maxWidth: '18ch', textWrap: 'balance' }}>
            {t('Frame it. Map it. Prove it.')}
          </h1>
          <p style={{ margin: '22px auto 0', color: '#9C9CA6', fontSize: 17, maxWidth: '56ch', textWrap: 'pretty' }}>
            {t('Every course is an instance of the loop senior engineers run on autopilot. Ten moves, each one visible, each one ending in something a reviewer can inspect.')}
          </p>
          { }
          <img
            src="/art/academy/loop-brush.webp"
            alt={t('The Sage loop: frame, route, map, decide, prove')}
            style={{
              display: 'block',
              width: 'min(560px, 88%)',
              margin: '8px auto -34px',
              WebkitMaskImage: 'radial-gradient(70% 80% at 50% 50%, #000 42%, transparent 95%)',
              maskImage: 'radial-gradient(70% 80% at 50% 50%, #000 42%, transparent 95%)',
            }}
          />
        </header>

        {/* ============ THE 10 STEPS — VISUAL STORY ============ */}
        <section aria-label={t('The mastery loop, step by step')} style={{ maxWidth: 1100, margin: '0 auto', padding: '24px clamp(20px, 4vw, 48px) clamp(56px, 8vw, 96px)' }}>
          {STEPS.map((s, i) => (
            <div
              key={s.name}
              id={`step-${i + 1}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                gap: 'clamp(20px, 3vw, 44px)',
                alignItems: 'center',
                padding: 'clamp(28px, 4vw, 44px) 0',
                borderBottom: `1px solid ${LINE}`,
                direction: i % 2 === 0 ? 'ltr' : 'rtl',
              }}
            >
              {/* text */}
              <div style={{ direction: 'ltr', position: 'relative' }}>
                <div aria-hidden style={{ ...serif, position: 'absolute', left: -8, top: -34, fontWeight: 700, fontSize: 88, lineHeight: 1, color: 'rgba(255,255,255,0.05)', userSelect: 'none', pointerEvents: 'none' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: s.tint, marginBottom: 10 }}>
                    {String(i + 1).padStart(2, '0')}
                    {t(' / 10')}
                  </div>
                  <div style={{ ...serif, fontWeight: 600, fontSize: 'clamp(26px, 2.8vw, 36px)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{s.name}</div>
                  <p style={{ margin: '14px 0 0', color: '#9C9CA6', fontSize: 15, maxWidth: '46ch', textWrap: 'pretty' }}>{s.body}</p>
                  {s.cta ? (
                    <Link href={s.cta.href} style={{ ...mono, display: 'inline-block', marginTop: 16, fontSize: 12, color: '#18B663', textDecoration: 'none', borderBottom: '1px solid rgba(24,182,99,0.4)', paddingBottom: 2 }}>
                      {s.cta.label}
                    </Link>
                  ) : null}
                </div>
              </div>
              {/* visual */}
              <div
                className="hiwCard"
                style={{
                  ['--tint' as string]: s.tint,
                  direction: 'ltr',
                  border: `1px solid ${LINE}`,
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 40%), #111115',
                  padding: 24,
                  minHeight: 170,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                {s.card}
              </div>
            </div>
          ))}
        </section>

        {/* ============ STATEMENT BAND ============ */}
        <section style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(64px, 9vw, 120px) clamp(20px, 4vw, 48px)', position: 'relative' }}>
            { }
            <img
              src="/art/academy/loop-band.webp"
              alt=""
              style={{
                position: 'absolute',
                right: -60,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 'min(52%, 580px)',
                opacity: 0.5,
                pointerEvents: 'none',
                WebkitMaskImage: 'radial-gradient(72% 72% at 55% 50%, #000 25%, transparent 80%)',
                maskImage: 'radial-gradient(72% 72% at 55% 50%, #000 25%, transparent 80%)',
              }}
            />
            <div style={{ position: 'relative' }}>
              <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: MUTED }}>{t('Ten moves · one loop')}</div>
              <div style={{ ...serif, marginTop: 18, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(36px, 5.6vw, 76px)', lineHeight: 1.04, letterSpacing: '-0.028em', maxWidth: '15ch', textWrap: 'balance' }}>
                {t('Every course ends in ')}<span style={{ color: '#8FA0FF' }}>{t('an artifact.')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px)', textAlign: 'center' }}>
            <h2 style={{ ...serif, margin: '0 auto', fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1.06, letterSpacing: '-0.022em', maxWidth: '24ch', textWrap: 'balance' }}>
              {t('In 25 minutes you’ll turn a messy incident into a decision a reviewer can inspect.')}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link
                href="/academy/course/career-engineering_judgment_foundation"
                style={{ display: 'inline-flex', color: '#fff', background: ACCENT, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '15px 28px', borderRadius: 26, boxShadow: '0 0 24px rgba(61,90,254,0.35)', whiteSpace: 'nowrap' }}
              >
                {t('Start with Engineering Judgment')}
              </Link>
              <Link
                href="/academy/try"
                style={{ display: 'inline-flex', color: INK, border: `1px solid ${LINE_STRONG}`, textDecoration: 'none', fontSize: 15, padding: '14px 28px', borderRadius: 26, whiteSpace: 'nowrap' }}
              >
                {t('Try a lesson free')}
              </Link>
            </div>
          </div>
        </section>

        <EcosystemBand />
        <AcademyFooter />
      </div>
    </>
  )
}

/* ── Step visuals (design sc-if blocks, one per step) ────────────────────── */

function DashedChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...mono, border: `1px dashed ${LINE_STRONG}`, borderRadius: 6, padding: '7px 12px', fontSize: 10.5, color: MUTED }}>
      {children}
    </span>
  )
}

function FrameCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, opacity: 0.6 }}>
        <DashedChip>{t('3am pager')}</DashedChip>
        <DashedChip>{t('angry ticket')}</DashedChip>
        <DashedChip>{t('red graph')}</DashedChip>
      </div>
      <div style={{ color: FAINT, fontSize: 16, paddingLeft: 4 }}>↓</div>
      <div style={{ border: '1.5px solid rgba(61,90,254,0.55)', background: 'rgba(61,90,254,0.07)', borderRadius: 9, padding: '12px 16px', fontSize: 14, color: INK, fontWeight: 500 }}>
        {t('“Where can a charge be issued twice?”')}
      </div>
    </>
  )
}

function RuledOutRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 34, borderTop: `1.5px dashed ${LINE_STRONG}` }} />
      <span style={{ ...mono, fontSize: 11, color: FAINT, textDecoration: 'line-through' }}>{label}</span>
    </div>
  )
}

function RouteCard({ t }: { t: T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <RuledOutRow label={t('check the client')} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 56, borderTop: `2px solid ${ACCENT}` }} />
        <span style={{ border: '1.5px solid rgba(61,90,254,0.55)', background: 'rgba(61,90,254,0.07)', borderRadius: 7, padding: '8px 13px', fontSize: 13, color: INK }}>
          {t('trace the retry path')}
        </span>
      </div>
      <RuledOutRow label={t('blame the CDN')} />
    </div>
  )
}

function MapCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ border: `1px solid ${LINE_STRONG}`, borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#B6B6C0', background: '#141418' }}>{t('checkout')}</span>
        <span style={{ color: FAINT }}>→</span>
        <span style={{ border: `1.5px solid ${AMBER}`, borderRadius: 7, padding: '8px 12px', fontSize: 12, color: INK, background: 'rgba(224,169,62,0.08)' }}>{t('retry path')}</span>
        <span style={{ color: FAINT }}>→</span>
        <span style={{ border: `1.5px solid ${GREEN}`, borderRadius: 11, padding: '8px 12px', fontSize: 12, color: INK, background: 'rgba(24,182,99,0.08)' }}>{t('ledger')}</span>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: MUTED, borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>{t('every omission carries a written defense')}</div>
    </>
  )
}

function DecideCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ border: `1px solid ${LINE_STRONG}`, borderRadius: 9, padding: 13, fontSize: 12.5, color: MUTED }}>{t('distributed locks')}</div>
        <div style={{ border: '1.5px solid rgba(24,182,99,0.55)', background: 'rgba(24,182,99,0.06)', borderRadius: 9, padding: 13, fontSize: 12.5, color: INK }}>{t('✓ idempotency keys')}</div>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: MUTED }}>{t('the “why” is written down')}</div>
    </>
  )
}

function ProveCard({ t }: { t: T }) {
  return (
    <div style={{ ...mono, background: '#08080A', border: `1px solid ${LINE}`, borderRadius: 10, padding: '14px 16px', fontSize: 11.5, lineHeight: 1.9 }}>
      <div style={{ color: '#B6B6C0' }}>{t('$ npm run check')}</div>
      <div style={{ color: MUTED }}>{t('3 retries issued → 1 charge recorded')}</div>
      <div style={{ color: GREEN }}>{t('✓ PASS — can’t be faked')}</div>
    </div>
  )
}

function ReviewCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: MUTED }}>
        <span>{t('MASTERY · illustrative')}</span>
        <span style={{ color: AMBER }}>78</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#1A1A20' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '78%', borderRadius: 4, background: 'linear-gradient(90deg, #3D5AFE, #6E83FF)' }} />
        <div style={{ position: 'absolute', left: '78%', top: -4, bottom: -4, width: 2, background: AMBER }} />
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: AMBER }}>{t('capped by PROOF — one claim didn’t hold')}</div>
    </>
  )
}

function RepairCard({ t }: { t: T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ ...serif, fontWeight: 600, fontSize: 34, color: CORAL }}>71</span>
      <span style={{ color: FAINT, fontSize: 18 }}>→</span>
      <span style={{ ...serif, fontWeight: 600, fontSize: 34, color: GREEN }}>94</span>
      <span style={{ ...mono, fontSize: 10.5, color: MUTED, marginLeft: 'auto' }}>{t('illustrative — the repair IS the lesson')}</span>
    </div>
  )
}

function SpaceDot({ hollow }: { hollow?: boolean }) {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        flexShrink: 0,
        ...(hollow ? { border: `2px solid ${GREEN}`, background: 'transparent' } : { background: ACCENT }),
      }}
    />
  )
}

function SpaceCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <SpaceDot />
        <span style={{ flex: 1, borderTop: '1.5px solid #26262E' }} />
        <SpaceDot />
        <span style={{ flex: 2, borderTop: '1.5px solid #26262E' }} />
        <SpaceDot />
        <span style={{ flex: 4, borderTop: '1.5px solid #26262E' }} />
        <SpaceDot hollow />
      </div>
      <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED }}>
        <span>{t('1d')}</span>
        <span>{t('3d')}</span>
        <span>{t('7d')}</span>
        <span style={{ color: GREEN }}>{t('30d')}</span>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: MUTED }}>{t('it holds under pressure, not just until the quiz')}</div>
    </>
  )
}

function TransferGlyph() {
  return (
    <div style={{ width: 14, height: 14, background: 'rgba(61,90,254,0.5)', border: `1.5px solid ${ACCENT}`, transform: 'rotate(45deg)', margin: '4px auto 10px' }} />
  )
}

function TransferCard({ t }: { t: T }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'stretch' }}>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: 13, textAlign: 'center' }}>
          <TransferGlyph />
          <div style={{ ...mono, fontSize: 10, color: MUTED }}>{t('payments: retries')}</div>
        </div>
        <div style={{ border: '1.5px solid rgba(61,90,254,0.4)', borderRadius: 9, padding: 13, textAlign: 'center', background: 'rgba(61,90,254,0.04)' }}>
          <TransferGlyph />
          <div style={{ ...mono, fontSize: 10, color: '#B6B6C0' }}>{t('email: duplicate sends')}</div>
        </div>
      </div>
      <div style={{ ...mono, fontSize: 10.5, color: MUTED }}>{t('same shape, new domain')}</div>
    </>
  )
}

function PackageCard({ t }: { t: T }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderBottom: `1px solid ${LINE}` }}>
        <span style={{ fontSize: 13, color: INK, fontWeight: 500, flex: 1 }}>{t('Can bound a change before shipping')}</span>
        <span style={{ ...mono, fontSize: 10, color: '#8FA0FF' }}>decision-memo.md</span>
        <span style={{ ...mono, fontSize: 8.5, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 4, color: GREEN, border: '1px solid rgba(24,182,99,0.4)', background: 'rgba(24,182,99,0.07)' }}>{t('PASSED')}</span>
      </div>
      <div style={{ ...mono, padding: '10px 15px', fontSize: 10, color: MUTED }}>{t('row 14 of your evidence ledger')}</div>
    </div>
  )
}
