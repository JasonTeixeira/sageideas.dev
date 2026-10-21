import type { Metadata } from 'next'
import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
import { MethodLoop } from '@/components/academy/method/MethodLoop'
import { getT } from '@/lib/i18n/t'
import { getLocale } from '@/lib/i18n/server'
import { localizedAlternates } from '@/lib/i18n/alternates'

const INK = '#F2EFE9'
const DIM = '#9C9CA6'
const LINE = '#1E1E24'
const ACCENT = '#3D5AFE'
const ACCENT_INK = '#8FA0FF'
const GREEN = '#18B663'
const AMBER = '#E0A93E'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('The Method — how we forge senior engineers — Sage Academy'),
    description: t(
      'Not another tutorial. Sage Academy is a system for building the judgment, mental models, and systems thinking that separate senior engineers from everyone who just knows the syntax.',
    ),
    alternates: localizedAlternates('/academy/method', locale),
    openGraph: {
      title: t('The Method — how Sage forges senior engineers'),
      description: t('Mental models, systems thinking, and a proof-driven loop — the system behind the difference between knowing syntax and being an engineer.'),
      images: ['/og?title=The+Method&subtitle=How+we+forge+senior+engineers'],
    },
    twitter: { card: 'summary_large_image', images: ['/og?title=The+Method&subtitle=How+we+forge+senior+engineers'] },
  }
}

const kicker: React.CSSProperties = { ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: ACCENT_INK }
const h2: React.CSSProperties = { ...serif, fontWeight: 600, fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1.05, letterSpacing: '-0.025em', textWrap: 'balance', margin: '14px 0 0' }
const section: React.CSSProperties = { borderTop: `1px solid ${LINE}` }
const container: React.CSSProperties = { maxWidth: 1160, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }

// The gap: what the industry teaches vs what actually makes a senior.
const GAP = [
  { t: 'Tutorials teach syntax.', s: 'You can follow along and still freeze on a blank file.' },
  { t: 'Bootcamps teach frameworks.', s: 'You ship a todo app; the framework changes; you’re lost again.' },
  { t: 'Certificates teach completion.', s: 'A PDF that proves you watched, not that you can build.' },
]

// The learning science, named — the four forces every lesson is engineered around.
const SCIENCE = [
  { tag: 'Active recall', color: ACCENT_INK, t: 'You retrieve, not re-read.', s: 'Every lesson makes you produce the answer before it shows you one. Retrieval is what builds durable memory — re-reading only builds false confidence.' },
  { tag: 'Spaced repetition', color: GREEN, t: 'Recall at 1 · 3 · 7 · 30 days.', s: 'An FSRS scheduler resurfaces each idea right as you’re about to forget it, so knowledge compounds instead of evaporating after the exam.' },
  { tag: 'Productive failure', color: AMBER, t: 'The lab fails on purpose.', s: 'You hit the wall first, then get the concept. Struggling before the reveal is what makes the “oh!” stick — comfort teaches nothing.' },
  { tag: 'Proof, not vibes', color: '#f472b6', t: 'A skeptic can run your work.', s: 'Every claim ends in a check that passes or fails. No self-graded quizzes, no “I think I get it” — the bar is the same one a reviewer holds.' },
]

// Mental models — the transferable structures a senior carries.
const MODELS = [
  { n: '01', t: 'Draw the smaller map', s: 'Seniors don’t hold more facts — they hold a smaller map with edges they can defend. Every lesson ends in a diagram you built, not one you copied.' },
  { n: '02', t: 'Reason from invariants', s: 'What must stay true no matter what? You learn to find the constraint that survives every change, then design around it.' },
  { n: '03', t: 'Make the failure a location', s: 'Not “it broke” — “it breaks here, because of this.” Debugging becomes navigation, not panic.' },
  { n: '04', t: 'Decide under uncertainty', s: '“I don’t know — but here’s the cheapest way to find out.” The senior move isn’t certainty; it’s a defensible next step.' },
]

export default async function MethodPage() {
  const t = await getT()
  return (
    <>
      <AcademyNav />
      <main id="main-content" tabIndex={-1} style={{ background: '#0B0B0E', color: INK, fontFamily: 'var(--font-sans), sans-serif', overflowX: 'clip' }}>
        {/* ── HERO ── */}
        <header className="sage-rise" style={{ ...container, backgroundImage: 'radial-gradient(90% 55% at 50% -8%, rgba(61,90,254,0.09) 0%, transparent 58%)' }}>
          <div style={kicker}>{t('The method')}</div>
          <h1 style={{ ...serif, margin: '16px 0 0', fontWeight: 600, fontSize: 'clamp(38px, 6vw, 82px)', lineHeight: 0.98, letterSpacing: '-0.03em', maxWidth: '16ch', textWrap: 'balance' }}>
            {t('We don’t teach you to code. We forge how you')} <em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('think.')}</em>
          </h1>
          <p style={{ margin: '26px 0 0', color: DIM, fontSize: 'clamp(17px, 1.5vw, 20px)', lineHeight: 1.6, maxWidth: '58ch', textWrap: 'pretty' }}>
            {t('Anyone can look up syntax. What separates a senior engineer is judgment — the mental models, the systems thinking, and the nerve to defend a decision at 3am. That can be built. This is the system that builds it.')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 34 }}>
            <Link href="/academy/signup" style={{ display: 'inline-flex', background: ACCENT, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '15px 28px', borderRadius: 26, boxShadow: '0 0 22px rgba(61,90,254,0.35)' }}>{t('Start free')}</Link>
            <Link href="/academy/map" style={{ display: 'inline-flex', color: INK, border: `1px solid #2A2A33`, textDecoration: 'none', fontSize: 15, padding: '14px 28px', borderRadius: 26 }}>{t('See the full path →')}</Link>
          </div>
        </header>

        {/* ── THE METHOD, IN 30 SECONDS (video) ── */}
        <section style={section}>
          <div className="sage-rise" style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) clamp(20px, 4vw, 48px)' }}>
            <figure style={{ margin: 0, border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', background: '#0B0B0E', boxShadow: '0 32px 80px -34px rgba(0,0,0,0.85)' }}>
              <video controls preload="none" aria-label={t('The method in 30 seconds — frame, map, decide, prove; narrated')} poster="/video/academy/sa-method.jpg" style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', background: '#0B0B0E' }}>
                <source src="/video/academy/sa-method.mp4" type="video/mp4" />
                <track kind="captions" srcLang="en" label="English" src="/video/academy/sa-method.vtt" default />
              </video>
              <figcaption style={{ ...mono, fontSize: 11, color: DIM, padding: '13px 18px', borderTop: `1px solid ${LINE}` }}>▸ {t('the method in 30 seconds — narrated')}</figcaption>
            </figure>
          </div>
        </section>

        {/* ── THE GAP ── */}
        <section style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ maxWidth: 620 }}>
              <div style={kicker}>{t('The gap nobody closes')}</div>
              <h2 style={h2}>{t('The industry teaches facts. Interviews, reviews, and outages test')} <em style={{ fontStyle: 'italic', color: '#E5484D' }}>{t('judgment.')}</em></h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18, marginTop: 40 }}>
              {GAP.map((g) => (
                <div key={g.t} style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 24 }}>
                  <div style={{ ...serif, fontSize: 20, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>{t(g.t)}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 14.5, color: DIM, lineHeight: 1.6 }}>{t(g.s)}</p>
                </div>
              ))}
            </div>
            <p style={{ ...serif, margin: '36px 0 0', fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 500, color: INK, maxWidth: '30ch', lineHeight: 1.3, letterSpacing: '-0.015em' }}>
              {t('So people accumulate hundreds of hours of watching — and none of the thing that actually gets tested.')}
            </p>
          </div>
        </section>

        {/* ── THE LOOP (signature diagram) ── */}
        <section style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={container}>
            <div style={{ maxWidth: 640 }}>
              <div style={kicker}>{t('The engine')}</div>
              <h2 style={h2}>{t('Every lesson runs the loop the best engineers run on autopilot.')}</h2>
              <p style={{ margin: '18px 0 0', color: DIM, fontSize: 16.5, lineHeight: 1.6, maxWidth: '56ch' }}>
                {t('Ten moves, one arc — repeated until it’s reflex. You don’t memorize it; you build the muscle by doing it every single lesson, on real problems, with a check at the end.')}
              </p>
            </div>
            <div style={{ marginTop: 44 }}>
              <MethodLoop />
            </div>
          </div>
        </section>

        {/* ── LEARNING SCIENCE ── */}
        <section style={section}>
          <div className="sage-rise" style={container}>
            <div style={{ maxWidth: 640 }}>
              <div style={kicker}>{t('Engineered on the science')}</div>
              <h2 style={h2}>{t('Four forces, in every lesson — because this is how humans actually learn.')}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18, marginTop: 40 }}>
              {SCIENCE.map((f) => (
                <div key={f.tag} style={{ border: `1px solid ${LINE}`, borderRadius: 16, background: '#111115', padding: 26 }}>
                  <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: f.color }}>{t(f.tag)}</div>
                  <div style={{ ...serif, margin: '12px 0 0', fontSize: 21, fontWeight: 600, color: INK, letterSpacing: '-0.015em' }}>{t(f.t)}</div>
                  <p style={{ margin: '12px 0 0', fontSize: 14.5, color: DIM, lineHeight: 1.65 }}>{t(f.s)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MENTAL MODELS / LIVING KNOWLEDGE ── */}
        <section style={{ ...section, background: '#0D0D11' }}>
          <div className="sage-rise" style={container}>
            <div style={{ maxWidth: 660 }}>
              <div style={kicker}>{t('What you actually keep')}</div>
              <h2 style={h2}>{t('Not a pile of facts — a living map of models you can defend.')}</h2>
              <p style={{ margin: '18px 0 0', color: DIM, fontSize: 16.5, lineHeight: 1.6, maxWidth: '58ch' }}>
                {t('Every concept you learn connects to the ones around it. Over time it becomes a knowledge graph you own — transferable structures that work on a codebase you’ve never seen, a system you’ve never designed, an outage you’ve never faced.')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 18, marginTop: 40 }}>
              {MODELS.map((m) => (
                <div key={m.n} style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: '#111115', padding: 24 }}>
                  <div style={{ ...mono, fontSize: 12, color: ACCENT_INK }}>{m.n}</div>
                  <div style={{ ...serif, margin: '10px 0 0', fontSize: 19, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>{t(m.t)}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 14, color: DIM, lineHeight: 1.6 }}>{t(m.s)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE OUTCOME ── */}
        <section style={section}>
          <div style={{ ...container, textAlign: 'center' }}>
            <div style={{ ...kicker, textAlign: 'center' }}>{t('The outcome')}</div>
            <h2 style={{ ...serif, margin: '16px auto 0', fontWeight: 600, fontSize: 'clamp(30px, 4.4vw, 56px)', lineHeight: 1.04, letterSpacing: '-0.025em', maxWidth: '20ch', textWrap: 'balance' }}>
              {t('An engineer who can frame, map, decide, and')} <em style={{ fontStyle: 'italic', color: GREEN }}>{t('prove it.')}</em>
            </h2>
            <p style={{ margin: '22px auto 0', color: DIM, fontSize: 17, lineHeight: 1.6, maxWidth: '52ch' }}>
              {t('Not someone who finished a course. Someone who walks into a design review, draws the system, defends the edges, and ships proof a skeptic can run. That’s the bar. That’s what we build.')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 34 }}>
              <Link href="/academy/signup" style={{ display: 'inline-flex', background: ACCENT, color: '#fff', textDecoration: 'none', fontSize: 15.5, fontWeight: 600, padding: '16px 32px', borderRadius: 28, boxShadow: '0 0 28px rgba(61,90,254,0.4)' }}>{t('Start with Engineering Judgment')}</Link>
              <Link href="/academy/concepts" style={{ ...mono, fontSize: 12, color: ACCENT_INK, textDecoration: 'none', alignSelf: 'center' }}>{t('read a lesson free →')}</Link>
            </div>
          </div>
        </section>
      </main>
      <EcosystemBand current="method" />
      <AcademyFooter />
    </>
  )
}
