import Link from 'next/link'
import { getAcademyStats } from './stats'
import { AcademyNav, AcademyFooter } from './AcademyChrome'
import { HeroTicker } from './HeroTicker'
import { HeroLabLauncher } from './HeroLabLauncher'
import { ProofWall } from './ProofWall'
import { DeferredVideoSection } from './DeferredVideoSection'
import { LabsHomeSection } from './LabsHomeSection'
import { LABS } from '@/data/academy/labs'
import { CompareTable } from './CompareTable'
import { FaqSection } from './FaqSection'
import { StickyCta } from './StickyCta'
import { AtlasLauncher } from '../atlas/AtlasLauncher'
import { getT } from '@/lib/i18n/t'
import { SkipToContent } from '@/components/skip-to-content'

/**
 * The front page, implemented 1:1 from
 * "Sage Academy Download/Sage Home.dc.html" — section order, markup, inline
 * styles, copy, diagram geometry, and artwork (localized to /art/academy) all
 * match the design file.
 *
 * Honesty deltas (the only intentional departures, per the no-fake-green
 * rule): the mock's invented counters (12,480 learners / 38,914 proofs /
 * 2,847-a-week) are replaced with real catalog counts; the fictional
 * testimonial section ("Priya Nair" etc.) is not shipped; the sample evidence
 * ledger is labeled as a sample. Everything else is the design, verbatim.
 */

const ACCENT = '#3D5AFE'
const GREEN = '#18B663'
const AMBER = '#E0A93E'
const INK = '#F2EFE9'
const LINE = '#1E1E24'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

const kicker: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: '#8FA0FF',
}
const h2: React.CSSProperties = {
  ...serif,
  margin: '14px 0 0',
  fontWeight: 560,
  fontSize: 'clamp(28px, 3.2vw, 42px)',
  lineHeight: 1.08,
  letterSpacing: '-0.02em',
  textWrap: 'balance',
}
const section: React.CSSProperties = { borderTop: `1px solid ${LINE}` }
const container: React.CSSProperties = {
  maxWidth: 1240,
  margin: '0 auto',
  padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)',
}

const LOOP: [string, string][] = [
  ['Frame', 'turn a messy stake into a question'],
  ['Route', 'pick the diagnosis path'],
  ['Map', 'draw the system you can defend'],
  ['Decide', 'commit under tradeoffs'],
  ['Prove', 'no vibes — a passing check'],
  ['Review', 'a skeptic reads your work'],
  ['Repair', 'fix the real failure'],
  ['Space', 'recall at 1 / 3 / 7 / 30 days'],
  ['Transfer', 'apply it somewhere real'],
  ['Package', 'ship the evidence'],
]
const LOOP_DOTS = [ACCENT, ACCENT, ACCENT, ACCENT, GREEN, GREEN, AMBER, ACCENT, ACCENT, GREEN]

const ARC = [
  { num: '01', name: 'Sprint contract', desc: 'the outcome, the proof, what NOT to claim', numColor: '#9598A2', weight: 500, ink: '#B6B6C0' },
  { num: '04', name: 'Pretest', desc: 'a productive failure → the "oh!" reveal', numColor: '#9598A2', weight: 500, ink: '#B6B6C0' },
  { num: '05', name: 'Concept', desc: 'ONE mental model, ≤40 words, paired visual', numColor: '#9598A2', weight: 500, ink: '#B6B6C0' },
  { num: '06', name: 'Diagram', desc: 'the system, suspect edge lit', numColor: '#8FA0FF', weight: 700, ink: INK },
  { num: '07', name: 'Code walkthrough', desc: 'real code, stepped and annotated', numColor: '#8FA0FF', weight: 700, ink: INK },
  { num: '08', name: 'Compare', desc: 'weak vs gold, side by side', numColor: '#8FA0FF', weight: 700, ink: INK },
  { num: '11', name: 'Verification', desc: '"prove it — no vibes": confirmable items', numColor: GREEN, weight: 700, ink: INK },
  { num: '12', name: 'Teachback', desc: 'say it back in your own words', numColor: '#9598A2', weight: 500, ink: '#B6B6C0' },
  { num: '14', name: 'Spaced review', desc: 'seeds the 1 / 3 / 7 / 30-day recall', numColor: '#9598A2', weight: 500, ink: '#B6B6C0' },
]

const COURSES = [
  { track: 'Foundations', tint: '#6E83FF', emblem: '/art/academy/emblem-foundations.webp', name: 'Engineering Judgment & the Sage Learning OS', outcome: 'Turn a messy incident into a decision a reviewer can inspect. The loop every other course runs on.', meta: '16 lessons · 4 modules', artifact: 'decision memo', href: '/academy/course/career-engineering_judgment_foundation' },
  { track: 'Foundations', tint: '#6E83FF', emblem: '/art/academy/emblem-foundations.webp', name: 'Think Like a Senior Engineer: Concept Maps', outcome: 'Build maps you can defend the edges of — for systems, codebases, and outages.', meta: '30 lessons · 6 modules', artifact: 'concept atlas', href: '/academy/catalog' },
  { track: 'Engineering', tint: '#8FA0FF', emblem: '/art/academy/emblem-engineering.webp', name: 'Programming Fundamentals', outcome: 'The mechanics under the syntax: memory, state, control flow, and honest debugging.', meta: '18 lessons · 2 modules', artifact: 'debug log', href: '/academy/course/programming-fundamentals' },
  { track: 'Engineering', tint: '#8FA0FF', emblem: '/art/academy/emblem-engineering.webp', name: 'Backend Engineering', outcome: 'APIs, queues, idempotency, and failure repair under real load.', meta: '20 lessons · 5 modules', artifact: 'production API', href: '/academy/catalog' },
  { track: 'Engineering', tint: '#8FA0FF', emblem: '/art/academy/emblem-engineering.webp', name: 'Frontend & Fullstack Product Engineering', outcome: 'Product surfaces with real data flow, accessibility, and request-path judgment.', meta: '20 lessons · 5 modules', artifact: 'fullstack app', href: '/academy/catalog' },
  { track: 'Data', tint: GREEN, emblem: '/art/academy/emblem-data.webp', name: 'Databases & Data Modeling', outcome: 'Schemas that survive review — modeling, constraints, and migration judgment.', meta: '20 lessons · 5 modules', artifact: 'schema review', href: '/academy/catalog' },
]

const EVIDENCE = [
  { claim: 'Can repair a duplicate-charge bug', artifact: 'decision-memo-07.md', verdict: 'PASSED', c: GREEN, b: 'rgba(24,182,99,0.4)', bg: 'rgba(24,182,99,0.07)' },
  { claim: 'Can design an idempotent API', artifact: 'api-proof.test.ts', verdict: 'PASSED', c: GREEN, b: 'rgba(24,182,99,0.4)', bg: 'rgba(24,182,99,0.07)' },
  { claim: 'Can defend a schema under review', artifact: 'schema-review.pdf', verdict: 'IN REVIEW', c: AMBER, b: 'rgba(224,169,62,0.4)', bg: 'rgba(224,169,62,0.07)' },
  { claim: 'Can map an unfamiliar codebase', artifact: 'concept-atlas.svg', verdict: 'PASSED', c: GREEN, b: 'rgba(24,182,99,0.4)', bg: 'rgba(24,182,99,0.07)' },
]

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  color: '#fff',
  background: ACCENT,
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 600,
  padding: '15px 26px',
  borderRadius: 26,
  boxShadow: '0 0 22px rgba(61,90,254,0.35)',
  whiteSpace: 'nowrap',
}
const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  color: INK,
  border: '1px solid #2A2A33',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 500,
  padding: '14px 26px',
  borderRadius: 26,
  whiteSpace: 'nowrap',
}

export async function SageHome() {
  const { coursesCount, lessonsCount } = await getAcademyStats()
  const t = await getT()

  return (
    <>
      <SkipToContent />
      <AtlasLauncher />
      <AcademyNav />
      <StickyCta />
      <div
        style={{
          minHeight: '100vh',
          background: '#0B0B0E',
          backgroundImage:
            'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.035) 0%, transparent 55%), radial-gradient(60% 50% at 88% 8%, rgba(61,90,254,0.06) 0%, transparent 60%)',
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
@keyframes edgeDash { to { stroke-dashoffset: -14; } }
@keyframes edgeIn { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sgEdge { animation: none !important; opacity: 1 !important; } }`,
          }}
        />

        <main id="main-content" tabIndex={-1}>

        {/* ============ A. HERO ============ */}
        <header style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 104px) clamp(20px, 4vw, 48px) clamp(48px, 6vw, 80px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'clamp(36px, 5vw, 72px)', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div data-reveal style={{ ...mono, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF', ['--reveal-i' as string]: 0 } as React.CSSProperties}>
                {t('Engineering judgment · proven, not claimed')}
              </div>
              <h1 data-reveal style={{ ...serif, margin: '20px 0 0', fontWeight: 600, fontSize: 'clamp(42px, 5.6vw, 78px)', lineHeight: 0.99, letterSpacing: '-0.028em', textWrap: 'balance', ['--reveal-i' as string]: 1 } as React.CSSProperties}>
                {t('Learn to think like a senior engineer — and')} <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#8FA0FF' }}>{t('prove it.')}</em>
              </h1>
              <p data-reveal style={{ margin: '22px 0 0', color: '#9C9CA6', fontSize: 'clamp(16px, 1.3vw, 18px)', maxWidth: '50ch', textWrap: 'pretty', ['--reveal-i' as string]: 2 } as React.CSSProperties}>
                {coursesCount} {t('courses that end in evidence a reviewer trusts — not a certificate of completion.')}
              </p>
              <div data-reveal style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30, ['--reveal-i' as string]: 3 } as React.CSSProperties}>
                <a href="#offer" style={btnPrimary}>{t('Start with Engineering Judgment')}</a>
                <Link href="/academy/try" style={btnGhost}>{t('Try a real lesson — no signup')}</Link>
              </div>
              <p data-reveal style={{ ...mono, margin: '16px 0 0', fontSize: 11, color: '#9598A2', letterSpacing: '0.02em', ['--reveal-i' as string]: 4 } as React.CSSProperties}>
                {t('No paid-for testimonials. Instead,')}{' '}
                <Link href="/academy/how-we-audit" style={{ color: '#8FA0FF', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('see how we audit our own courses →')}</Link>
              </p>
              <div data-reveal style={{ display: 'flex', gap: 28, marginTop: 36, borderTop: `1px solid ${LINE}`, paddingTop: 22, flexWrap: 'wrap', ['--reveal-i' as string]: 5 } as React.CSSProperties}>
                <div><span style={{ ...serif, fontWeight: 600, fontSize: 24 }}>{coursesCount}</span> <span style={{ fontSize: 13, color: '#9598A2' }}>{t('courses')}</span></div>
                <div><span style={{ ...serif, fontWeight: 600, fontSize: 24 }}>{lessonsCount}</span> <span style={{ fontSize: 13, color: '#9598A2' }}>{t('lessons')}</span></div>
                <div><span style={{ ...serif, fontWeight: 600, fontSize: 24, color: '#8FA0FF' }}>{LABS.length}</span> <span style={{ fontSize: 13, color: '#9598A2' }}>{t('builds to ship')}</span></div>
                <div><span style={{ ...serif, fontWeight: 600, fontSize: 24, color: GREEN }}>100%</span> <span style={{ fontSize: 13, color: '#9598A2' }}>{t('proofs verifiable')}</span></div>
              </div>
            </div>

            {/* hero visual: interactive in-browser lab */}
            <div data-reveal style={{ minWidth: 0, ['--reveal-i' as string]: 4 } as React.CSSProperties}>
              <HeroLabLauncher />
            </div>
          </div>
        </header>

        {/* ============ LIVE TICKER ============ */}
        <div style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '13px clamp(20px, 4vw, 48px)', display: 'flex', alignItems: 'center', gap: 18, overflow: 'hidden' }}>
            <span style={{ ...mono, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: GREEN, flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />{t('live')}
            </span>
            <HeroTicker />
            <span style={{ ...mono, marginLeft: 'auto', fontSize: 11, color: '#9598A2', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ color: INK }}>{lessonsCount}</span> {t('lessons live')}
            </span>
          </div>
        </div>

        {/* ============ B. THE WEDGE ============ */}
        <section style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={container}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px, 5vw, 72px)', alignItems: 'center' }}>
              <div>
                <h2 style={{ ...h2, margin: 0 }}>{t('Tutorials teach syntax. Nobody teaches judgment.')}</h2>
                <p style={{ margin: '18px 0 0', color: '#9C9CA6', maxWidth: '46ch', textWrap: 'pretty' }}>
                  {t('We do — and we make you prove it. The difference between a pile of tutorials and a senior engineer is a map you can defend the edges of.')}
                </p>
              </div>
              <figure style={{ margin: 0, position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#2A2A33', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: '#111115', padding: 22 }}>
                  <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: AMBER, marginBottom: 14 }}>▲ {t('Weak · a bag of boxes')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {['API', 'DB', 'Queue?', '…stuff'].map((s) => (
                      <span key={s} style={{ border: '1px solid #2A2A33', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#9598A2' }}>{t(s)}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: '#9C9CA6' }}>{t('Confident guesses in a war room. Edges nobody can defend.')}</div>
                </div>
                <div style={{ background: '#111115', padding: 22 }}>
                  <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: GREEN, marginBottom: 14 }}>✓ {t('Gold · a decision map')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span style={{ border: '1.5px solid #8FA0FF', borderRadius: 6, padding: '6px 10px', fontSize: 12, background: 'rgba(61,90,254,0.08)' }}>{t('checkout')}</span>
                    <span style={{ color: '#4A4A54' }}>→</span>
                    <span style={{ border: `1.5px solid ${AMBER}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, background: 'rgba(224,169,62,0.08)' }}>{t('retry path')}</span>
                    <span style={{ color: '#4A4A54' }}>→</span>
                    <span style={{ border: `1.5px solid ${GREEN}`, borderRadius: 10, padding: '6px 10px', fontSize: 12, background: 'rgba(24,182,99,0.08)' }}>{t('ledger')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#B6B6C0' }}>{t('The failure is a location. The omissions are defended.')}</div>
                </div>
                <div style={{ ...serif, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 36, height: 36, borderRadius: '50%', background: '#0B0B0E', border: '1px solid #2A2A33', display: 'grid', placeItems: 'center', fontStyle: 'italic', fontSize: 13, color: '#9598A2', zIndex: 2 }}>{t('vs')}</div>
              </figure>
            </div>
          </div>
        </section>

        {/* ============ C. THE LOOP ============ */}
        <section id="loop" style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 660, flex: '1 1 380px' }}>
                <div style={kicker}>{t('The Sage Learning OS')}</div>
                <h2 style={h2}>{t('Every course is an instance of the loop senior engineers run on autopilot.')}</h2>
              </div>
              { }
              <img
                src="/art/academy/loop-brush.webp"
                alt="The Sage loop: frame, route, map, decide, prove"
                width={1200}
                height={670}
                style={{ width: 'min(340px, 100%)', flex: '0 1 auto', margin: '-20px 0', WebkitMaskImage: 'radial-gradient(72% 82% at 50% 50%, #000 42%, transparent 96%)', maskImage: 'radial-gradient(72% 82% at 50% 50%, #000 42%, transparent 96%)' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1, marginTop: 44, background: LINE, border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
              {LOOP.map(([name, desc], i) => (
                <div key={name} style={{ background: '#111115', padding: 20, minHeight: 118, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ ...mono, fontSize: 10, color: '#9598A2' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: LOOP_DOTS[i] }} />
                  </div>
                  <div style={{ ...serif, fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em' }}>{name}</div>
                  <div style={{ fontSize: 12.5, color: '#9598A2', lineHeight: 1.45 }}>{t(desc)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ D. HOW A LESSON WORKS ============ */}
        <section id="lesson" style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={container}>
            <div style={{ maxWidth: 660, marginBottom: 44 }}>
              <div style={kicker}>{t('Anatomy of a lesson')}</div>
              <h2 style={{ ...h2, margin: '14px 0 16px' }}>{t('Visual-first. Real labs. Proof, not vibes.')}</h2>
              <p style={{ margin: 0, color: '#9C9CA6', maxWidth: '60ch', textWrap: 'pretty' }}>
                {t("Every lesson is a deliberate 14-block arc: a contract, a stake, one mental model, three hero visuals, a lab that starts failing, and a verification you can't hand-wave.")}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 26 }}>
                <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2', marginBottom: 18 }}>{t('The 14-block arc')}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {ARC.map((a) => (
                    <div key={a.num} style={{ display: 'grid', gridTemplateColumns: '18px 110px 1fr', gap: 12, alignItems: 'baseline', padding: '7px 0' }}>
                      <span style={{ ...mono, fontSize: 10, color: a.numColor }}>{a.num}</span>
                      <span style={{ fontSize: 14, fontWeight: a.weight, color: a.ink }}>{t(a.name)}</span>
                      <span style={{ fontSize: 12.5, color: '#9598A2' }}>{t(a.desc)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2' }}>{t('In-browser lab · Python')}</span>
                  <span style={{ ...mono, fontSize: 10, color: AMBER }}>{t('starter fails — on purpose')}</span>
                </div>
                <div style={{ ...mono, padding: '16px 20px', fontSize: 12, lineHeight: 1.85, background: '#0B0B0E', flex: 1 }}>
                  <div style={{ whiteSpace: 'pre', color: '#B6B6C0' }}>def retry_charge(order, attempts=3):</div>
                  <div style={{ whiteSpace: 'pre', color: '#B6B6C0' }}>    for i in range(attempts):</div>
                  <div style={{ whiteSpace: 'pre', background: 'rgba(229,72,77,0.10)', borderLeft: '2px solid #E5484D', color: INK }}>        charge(order)  # ✗ no idempotency key</div>
                  <div style={{ whiteSpace: 'pre', color: '#9598A2' }}># FAIL: 3 charges issued for 1 order</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderTop: `1px solid ${LINE}` }}>
                  <span style={{ ...mono, fontSize: 11, color: '#E5484D' }}>✗ {t('check failed · 1 expected, 3 found')}</span>
                  <Link href="/academy/engine" style={{ display: 'inline-flex', background: ACCENT, color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '8px 16px', borderRadius: 18, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('Run again')}</Link>
                </div>
                <div style={{ padding: '14px 18px', borderTop: `1px solid ${LINE}`, fontSize: 13, color: '#9C9CA6', fontStyle: 'italic' }}>
                  {t('Fix it for real and the check passes — a guaranteed win in every lesson.')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <Link href="/academy/concepts" style={{ ...btnGhost, fontSize: 14 }}>{t('Read a full lesson free — no signup →')}</Link>
              <span style={{ ...mono, fontSize: 11, color: '#9598A2' }}>{t('34 lessons open to read, right now, no account.')}</span>
            </div>
          </div>
        </section>

        {/* ============ D2. THE IDEAS IN MOTION (explainer videos) ============ */}
        <DeferredVideoSection />

        {/* ============ E. CATALOG PREVIEW ============ */}
        <section id="catalog" style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 40 }}>
              <div style={{ maxWidth: 620 }}>
                <div style={kicker}>{t('The catalog')}</div>
                <h2 style={h2}>{t('Six courses live. Seventeen more on the same engine.')}</h2>
              </div>
              <Link href="/academy/catalog" style={{ ...mono, fontSize: 12, color: '#8FA0FF', textDecoration: 'none', padding: '12px 0', whiteSpace: 'nowrap' }}>
                {t('Full catalog →')} {coursesCount} {t('courses ·')} {lessonsCount} {t('lessons')}
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 18 }}>
              {COURSES.map((c) => (
                <Link key={c.name} href={c.href} style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.tint }}>{t(c.track)}</span>
                    <span style={{ ...mono, fontSize: 9.5, color: GREEN }}>✓ {t('live')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ flexShrink: 0, width: 46, height: 46, borderRadius: '50%', border: `1px solid ${c.tint}4D`, backgroundColor: '#0B0B0E', backgroundImage: `url('${c.emblem}')`, backgroundSize: '170%', backgroundPosition: 'center' }} />
                    <span style={{ ...serif, fontWeight: 600, fontSize: 21, letterSpacing: '-0.015em', lineHeight: 1.15 }}>{t(c.name)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#9C9CA6', textWrap: 'pretty', flex: 1 }}>{t(c.outcome)}</div>
                  <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${LINE}`, paddingTop: 13, fontSize: 10.5, color: '#9598A2' }}>
                    <span>{t(c.meta)}</span>
                    <span style={{ color: c.tint }}>{t('artifact:')} {t(c.artifact)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 18, border: '1px dashed #2A2A33', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, color: '#9C9CA6' }}>
                <span style={{ color: INK, fontWeight: 600 }}>{t('+17 in production')}</span> — {t('AI Engineering & RAG, Security, Cloud & Ops, Observability, System Design, Leadership…')}
              </span>
              <Link href="/academy/signup" style={{ ...mono, fontSize: 11.5, color: '#8FA0FF', textDecoration: 'none' }}>{t('Notify me →')}</Link>
            </div>
          </div>
        </section>

        {/* ============ E2. THE LABS — build real things ============ */}
        <LabsHomeSection />

        {/* ============ F. THE PROOF ============ */}
        <section id="proof" style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={container}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px, 5vw, 72px)', alignItems: 'center' }}>
              <div>
                <div style={kicker}>{t('The evidence ledger')}</div>
                <h2 style={{ ...h2, margin: '14px 0 16px' }}>{t('You leave with a portfolio, not a receipt.')}</h2>
                <p style={{ margin: 0, color: '#9C9CA6', maxWidth: '46ch', textWrap: 'pretty' }}>
                  {t('Decision memos and passing proofs — pick any claim, follow the artifact, see for yourself. Certificates are auto-issued on genuine completion, verifiable by code.')}
                </p>
                { }
                <img
                  src="/art/academy/proof-brush.webp"
                  alt=""
                  width={1200}
                  height={670}
                  style={{ display: 'block', width: 'min(400px, 90%)', margin: '4px 0 -24px -12px', pointerEvents: 'none', WebkitMaskImage: 'radial-gradient(75% 78% at 50% 50%, #000 38%, transparent 95%)', maskImage: 'radial-gradient(75% 78% at 50% 50%, #000 38%, transparent 95%)' }}
                />
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', overflow: 'hidden' }}>
                <div style={{ ...mono, display: 'grid', gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(120px, 1.2fr) auto', gap: 14, padding: '12px 22px', borderBottom: `1px solid ${LINE}`, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9598A2' }}>
                  <span>{t('Claim')}</span><span>{t('Artifact')}</span><span>{t('Verdict')}</span>
                </div>
                {EVIDENCE.map((e) => (
                  <div key={e.claim} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(120px, 1.2fr) auto', gap: 14, alignItems: 'center', padding: '15px 22px', borderBottom: `1px solid ${LINE}` }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t(e.claim)}</span>
                    <span style={{ ...mono, fontSize: 11, color: '#8FA0FF' }}>{e.artifact}</span>
                    <span style={{ ...mono, fontSize: 9.5, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 5, color: e.c, border: `1px solid ${e.b}`, background: e.bg, whiteSpace: 'nowrap' }}>{t(e.verdict)}</span>
                  </div>
                ))}
                <div style={{ ...mono, padding: '13px 22px', fontSize: 10.5, color: '#9598A2', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span>{t('sample ledger · certificates verifiable at /verify')}</span>
                  <Link href="/academy/evidence" style={{ color: '#8FA0FF', textDecoration: 'none' }}>{t('share portfolio →')}</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ G. RETENTION + HONEST SCORING ============ */}
        <section style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 20 }}>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2' }}>{t('Honest scoring')}</div>
                <h3 style={{ ...serif, margin: 0, fontWeight: 560, fontSize: 24, letterSpacing: '-0.015em' }}>{t('Your score is capped by your weakest proof.')}</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#9C9CA6', textWrap: 'pretty' }}>
                  {t("Because that's how a reviewer reads it. We show you the one repair that lifts it.")}
                </p>
                <div style={{ marginTop: 8 }}>
                  <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#9598A2', marginBottom: 8 }}>
                    <span>{t('MASTERY')}</span>
                    <span><span style={{ color: AMBER }}>78</span> {t('· capped by PROOF')}</span>
                  </div>
                  <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#1A1A20' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '78%', borderRadius: 4, background: 'linear-gradient(90deg, #3D5AFE, #6E83FF)' }} />
                    <div style={{ position: 'absolute', left: '78%', top: -4, bottom: -4, width: 2, background: AMBER }} />
                    <div style={{ position: 'absolute', left: '78%', right: '9%', top: 0, bottom: 0, background: 'repeating-linear-gradient(45deg, rgba(224,169,62,0.18) 0 4px, transparent 4px 8px)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12.5 }}>
                    <span style={{ color: '#9598A2' }}>{t('ceiling until the proof passes')}</span>
                    <span style={{ color: GREEN, fontWeight: 600 }}>{t('repair lesson 10 → lifts to 91')}</span>
                  </div>
                </div>
              </div>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2' }}>{t('Spaced recall · 1 / 3 / 7 / 30 days')}</div>
                <h3 style={{ ...serif, margin: 0, fontWeight: 560, fontSize: 24, letterSpacing: '-0.015em' }}>{t('It holds under pressure — not just until the quiz.')}</h3>
                <svg viewBox="0 0 440 130" style={{ width: '100%', height: 'auto', display: 'block', marginTop: 8 }}>
                  <line x1="30" y1="8" x2="30" y2="110" stroke="#2A2A33" strokeWidth="1" />
                  <line x1="30" y1="110" x2="430" y2="110" stroke="#2A2A33" strokeWidth="1" />
                  <polyline points="30,22 90,62 150,84 230,96 320,103 430,107" fill="none" stroke="#4A4A54" strokeWidth="2" strokeDasharray="4 4" />
                  <polyline points="30,22 74,44 90,28 134,48 154,31 214,50 244,34 334,52 430,38" fill="none" stroke="#3D5AFE" strokeWidth="2.5" />
                  <circle cx="90" cy="28" r="3.5" fill="#0B0B0E" stroke="#3D5AFE" strokeWidth="2" />
                  <circle cx="154" cy="31" r="3.5" fill="#0B0B0E" stroke="#3D5AFE" strokeWidth="2" />
                  <circle cx="244" cy="34" r="3.5" fill="#0B0B0E" stroke="#3D5AFE" strokeWidth="2" />
                  <circle cx="430" cy="38" r="3.5" fill="#0B0B0E" stroke="#3D5AFE" strokeWidth="2" />
                </svg>
                <div style={{ ...mono, display: 'flex', gap: 20, fontSize: 10.5, color: '#9C9CA6' }}>
                  <span><span style={{ color: '#8FA0FF' }}>—</span> {t('with recall')}</span>
                  <span><span style={{ color: '#4A4A54' }}>--</span> {t('cram once')}</span>
                  <span style={{ marginLeft: 'auto', color: GREEN }}>{t('the whole point')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ STATEMENT BAND ============ */}
        <section style={{ ...section, background: '#0D0D11', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(72px, 10vw, 140px) clamp(20px, 4vw, 48px)', position: 'relative' }}>
            <div style={{ ...serif, position: 'absolute', right: -40, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: 'clamp(180px, 26vw, 360px)', lineHeight: 1, color: 'rgba(255,255,255,0.025)', userSelect: 'none', pointerEvents: 'none' }}>94</div>
            { }
            <img
              src="/art/academy/band-brush.webp"
              alt=""
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 'min(46%, 560px)', opacity: 0.55, pointerEvents: 'none', WebkitMaskImage: 'radial-gradient(80% 80% at 60% 50%, #000 30%, transparent 96%)', maskImage: 'radial-gradient(80% 80% at 60% 50%, #000 30%, transparent 96%)' }}
            />
            <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9598A2' }}>{t('The house rule')}</div>
            <div style={{ ...serif, marginTop: 20, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(40px, 6.4vw, 92px)', lineHeight: 1.02, letterSpacing: '-0.03em', maxWidth: '14ch', textWrap: 'balance' }}>
              {t('Prove it —')} <span style={{ color: GREEN }}>{t('no vibes.')}</span>
            </div>
            <div style={{ marginTop: 24, fontSize: 15, color: '#9598A2', maxWidth: '44ch' }}>
              {t('Every claim on this page follows its own rule.')}{' '}
              <Link href="/academy/proof-not-paper" style={{ color: '#8FA0FF', textDecoration: 'underline', textUnderlineOffset: 3 }}>{t('Read the manifesto →')}</Link>
            </div>
            {/* The anti-cert film — narrated, poster-first. Left-aligned to clear the right-side art. */}
            <figure style={{ position: 'relative', zIndex: 1, margin: 'clamp(32px, 5vw, 52px) 0 0', maxWidth: 620, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: '#0B0B0E', boxShadow: '0 28px 70px -32px rgba(0,0,0,0.85)' }}>
              <video controls preload="none" aria-label={t('Forget the certificate, ship the proof — the anti-cert film, narrated')} poster="/video/academy/sa-proof.jpg" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', background: '#0B0B0E' }}>
                <source src="/video/academy/sa-proof.mp4" type="video/mp4" />
                <track kind="captions" srcLang="en" label="English" src="/video/academy/sa-proof.vtt" default />
              </video>
              <figcaption style={{ ...mono, fontSize: 11, color: '#9598A2', padding: '12px 16px', borderTop: `1px solid ${LINE}` }}>▸ {t('forget the certificate, ship the proof — 40s, narrated')}</figcaption>
            </figure>
          </div>
        </section>

        {/* ============ G1a. HONEST COMPARISON ============ */}
        <CompareTable />

        {/* ============ G1b. OBJECTION-CRUSHING FAQ ============ */}
        <FaqSection />

        {/* ============ G2. RECEIPTS, NOT TESTIMONIALS ============ */}
        <ProofWall coursesCount={coursesCount} lessonsCount={lessonsCount} />

        {/* ============ H. THE OFFER ============ */}
        <section id="offer" style={{ ...section, background: '#0D0D11' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(64px, 9vw, 120px) clamp(20px, 4vw, 48px)', textAlign: 'center' }}>
            <div style={kicker}>{t('All-access membership')}</div>
            <h2 style={{ ...serif, margin: '18px auto 0', fontWeight: 600, fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.025em', maxWidth: '20ch', textWrap: 'balance' }}>
              {t('One membership. Every course. A portfolio at the end.')}
            </h2>
            <p style={{ margin: '20px auto 0', color: '#9C9CA6', maxWidth: '52ch', fontSize: 16.5, textWrap: 'pretty' }}>
              {t('All')} {coursesCount} {t('courses as they ship, every lab and proof, spaced recall, leagues, and verifiable certificates. Value framed as outcome — judgment plus evidence — not hours of video.')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap', whiteSpace: 'nowrap' }}>
              <Link href="/academy/signup" style={{ ...btnPrimary, fontSize: 15.5, padding: '16px 32px', borderRadius: 28, boxShadow: '0 0 28px rgba(61,90,254,0.4)' }}>{t('Start with Engineering Judgment')}</Link>
              <a href="#lesson" style={{ ...btnGhost, fontSize: 15.5, padding: '15px 32px', borderRadius: 28 }}>{t('See a real lesson')}</a>
            </div>
            <div style={{ ...mono, marginTop: 22, fontSize: 11, color: '#9598A2', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/academy/guarantee" style={{ color: '#8FA0FF', textDecoration: 'none' }}>{t('billing & cancellation →')}</Link>
              <span>{t('cancel anytime')}</span>
              <Link href="/academy/about" style={{ color: '#8FA0FF', textDecoration: 'none' }}>{t("who's behind this →")}</Link>
            </div>
          </div>
        </section>

        {/* ============ INTERVIEW MASTERY — gold add-on band ============ */}
        <section style={{ borderTop: `1px solid ${LINE}`, background: 'radial-gradient(110% 90% at 50% -20%, rgba(224,169,62,0.07) 0%, transparent 55%)' }}>
          <div style={{ ...container, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px, 5vw, 72px)', alignItems: 'center' }}>
            <div>
              <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: AMBER }}>{t('The add-on · Interview Mastery')}</div>
              <h2 style={{ ...h2, margin: '14px 0 16px' }}>
                {t('40 interviews of practice. Before the')} <em style={{ fontStyle: 'italic', fontWeight: 500, color: '#F0C36A' }}>{t('4 that count.')}</em>
              </h2>
              <p style={{ margin: 0, color: '#9C9CA6', maxWidth: '50ch', textWrap: 'pretty' }}>
                {t('Voice-first mocks that adapt, interrupt, and pressure-test — scored against a consistent bar, every session ending in a debrief and a drill. Added to your membership, cancel anytime.')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26, alignItems: 'center' }}>
                <Link href="/interview" style={{ display: 'inline-flex', alignItems: 'center', color: '#0B0B0E', background: 'linear-gradient(135deg, #F0C36A, #D99A2B)', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '15px 26px', borderRadius: 26, boxShadow: '0 0 22px rgba(224,169,62,0.3)', whiteSpace: 'nowrap' }}>
                  {t('Explore Interview Mastery →')}
                </Link>
                <Link href="/academy/interview/guarantee" style={{ ...mono, fontSize: 11, color: '#9598A2', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  {t('how it works')}
                </Link>
              </div>
            </div>
            <div style={{ border: '1px solid rgba(224,169,62,0.35)', borderRadius: 14, background: '#111115', padding: 26 }}>
              <div style={{ ...mono, display: 'flex', justifyContent: 'space-between', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9598A2', marginBottom: 16 }}>
                <span style={{ color: AMBER }}>● {t('Live mock · System design · L5 bar')}</span>
                <span>32:14</span>
              </div>
              <div style={{ fontSize: 14.5, color: '#B6B6C0', lineHeight: 1.6 }}>
                &ldquo;{t('Your fan-out doubles at 10× traffic. What breaks first — and how do you know before it does?')}&rdquo;
              </div>
              <div style={{ ...mono, display: 'flex', gap: 18, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${LINE}`, fontSize: 10.5, color: '#9598A2', flexWrap: 'wrap' }}>
                <span>{t('coding · system design · behavioral · negotiation')}</span>
                <span style={{ marginLeft: 'auto', color: AMBER }}>{t('+$39/mo · $24 annual')}</span>
              </div>
            </div>
          </div>
        </section>

        </main>
        <AcademyFooter />
      </div>
    </>
  )
}
