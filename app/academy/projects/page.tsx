import type { Metadata } from 'next'
import Link from 'next/link'
import { AcademyNav, AcademyFooter } from '@/components/academy/landing/AcademyChrome'
import { EcosystemBand } from '@/components/academy/landing/EcosystemBand'
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
const RED = '#E5484D'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  return {
    title: t('What you’ll ship — the artifacts, not a certificate — Sage Academy'),
    description: t(
      "You don’t finish Sage Academy with a PDF. You finish with real, code-verified artifacts: decision memos, idempotent APIs, schema reviews, RAG features with eval harnesses — proof a reviewer can run."
    ),
    alternates: localizedAlternates('/academy/projects', locale),
    openGraph: {
      title: t('What you’ll ship at Sage Academy'),
      description: t(
        'Real, code-verified artifacts — not a certificate. Decision memos, production APIs, RAG features, system designs.'
      ),
      images: ['/og?title=What+you%27ll+ship&subtitle=Real+artifacts%2C+not+a+certificate'],
    },
    twitter: { card: 'summary_large_image', images: ['/og?title=What+you%27ll+ship&subtitle=Real+artifacts%2C+not+a+certificate'] },
  }
}

type Line = { t: string; c?: string }
type Artifact = {
  track: string
  color: string
  name: string
  proves: string
  file: string
  preview: Line[]
}

const ARTIFACTS: Artifact[] = [
  {
    track: 'Foundations · Engineering Judgment',
    color: '#5bc8e8',
    name: 'A decision memo',
    proves: 'You can turn a 3am incident into a decision a reviewer can inspect — options, tradeoffs, the call, and why.',
    file: 'decision-memo-07.md',
    preview: [
      { t: '# Duplicate charge — retry storm', c: INK },
      { t: '## Decision: idempotency key on charge', c: ACCENT_INK },
      { t: '- Option A: dedupe in the worker  ✗ races', c: DIM },
      { t: '- Option B: idempotency key       ✓ chosen', c: GREEN },
      { t: 'Invariant: one order → at most one charge', c: DIM },
    ],
  },
  {
    track: 'Engineering · Backend',
    color: '#34d399',
    name: 'An idempotent API',
    proves: 'You can build a service that survives retries, partial failures, and real load — verified by a check, not a claim.',
    file: 'charge.test.ts',
    preview: [
      { t: 'POST /charge  (retried 3×)', c: DIM },
      { t: 'expect(charges).toHaveLength(1)', c: INK },
      { t: '✓ 1 charge for 1 order', c: GREEN },
      { t: '✓ safe to retry (idempotency-key)', c: GREEN },
      { t: 'PASS  12/12 checks', c: GREEN },
    ],
  },
  {
    track: 'Data · Databases',
    color: '#9db4d0',
    name: 'A schema under review',
    proves: 'You can model data that stays correct at scale — and defend every constraint when a senior pushes back.',
    file: 'schema-review.sql',
    preview: [
      { t: 'orders ─┐', c: INK },
      { t: '        ├─< order_items >─ products', c: DIM },
      { t: 'payments ┘  (FK, ON DELETE RESTRICT)', c: DIM },
      { t: 'UNIQUE(order_id, idempotency_key)', c: ACCENT_INK },
      { t: '✓ survives review · no orphan rows', c: GREEN },
    ],
  },
  {
    track: 'AI Engineering · RAG & Eval',
    color: '#6e8bff',
    name: 'A RAG feature + eval harness',
    proves: 'You can ship an AI feature that answers from real sources — and prove it works with a rubric and a golden set.',
    file: 'rag-eval.json',
    preview: [
      { t: 'query → retrieve(k=5) → generate', c: DIM },
      { t: 'eval: faithfulness  0.92  ✓', c: GREEN },
      { t: 'eval: answer-relevance 0.88 ✓', c: GREEN },
      { t: 'eval: no-hallucination  PASS', c: GREEN },
      { t: 'golden set: 24/24 above bar', c: GREEN },
    ],
  },
  {
    track: 'Architecture · System Design',
    color: '#a78bfa',
    name: 'A system design you can defend',
    proves: 'You can draw the system, name the bottleneck, and defend the tradeoffs — the exact thing a design round tests.',
    file: 'design-doc.md',
    preview: [
      { t: 'client → LB → api ×N → queue → workers', c: DIM },
      { t: '            └→ cache (read-through)', c: DIM },
      { t: 'bottleneck: write amplification on fanout', c: AMBER },
      { t: 'tradeoff: consistency ↔ latency (chose SWR)', c: ACCENT_INK },
      { t: '✓ defends under load + failure', c: GREEN },
    ],
  },
  {
    track: 'Reliability · Observability',
    color: '#34d399',
    name: 'An incident postmortem',
    proves: 'You can make a failure a location — root-cause it, prevent the class, and write it up so it never recurs.',
    file: 'postmortem-2029-03.md',
    preview: [
      { t: 'Impact: 4m 12s p99 > 2s on /checkout', c: RED },
      { t: 'Root cause: unbounded N+1 on cart load', c: INK },
      { t: 'Fix: batch + index (verified in staging)', c: GREEN },
      { t: 'Prevent: perf budget in CI (fails > 200ms)', c: ACCENT_INK },
      { t: '✓ class of bug closed, not just this one', c: GREEN },
    ],
  },
]

const kicker: React.CSSProperties = { ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: ACCENT_INK }

export default async function ProjectsPage() {
  const t = await getT()
  return (
    <>
      <AcademyNav />
      <div style={{ background: '#0B0B0E', color: INK, fontFamily: 'var(--font-sans), sans-serif', overflowX: 'clip', minHeight: '100vh' }}>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px, 7vw, 92px) clamp(20px, 4vw, 48px) 96px' }}>
          <div className="sage-rise" style={{ maxWidth: 720, backgroundImage: 'radial-gradient(90% 60% at 0% -20%, rgba(61,90,254,0.08) 0%, transparent 60%)' }}>
            <div style={kicker}>{t('What you’ll ship')}</div>
            <h1 style={{ ...serif, margin: '16px 0 0', fontWeight: 600, fontSize: 'clamp(34px, 5.4vw, 68px)', lineHeight: 1.0, letterSpacing: '-0.03em', maxWidth: '18ch', textWrap: 'balance' }}>
              {t('You don’t finish with a certificate. You finish with')}{' '}<em style={{ fontStyle: 'italic', color: ACCENT_INK }}>{t('these.')}</em>
            </h1>
            <p style={{ margin: '24px 0 0', color: DIM, fontSize: 'clamp(16px, 1.4vw, 19px)', lineHeight: 1.6, maxWidth: '56ch' }}>
              {t("Every course ends in a real, code-verified artifact — the kind of thing you put in front of a hiring manager and say “run it yourself.” Here's what stacks up in your portfolio.")}
            </p>
          </div>

          <div className="sage-rise" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 20, marginTop: 52 }}>
            {ARTIFACTS.map((a) => (
              <div key={a.name} style={{ border: `1px solid ${LINE}`, borderRadius: 18, background: '#111115', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* artifact preview */}
                <div style={{ background: '#0B0B0E', borderBottom: `1px solid ${LINE}`, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color }} />
                    <span style={{ ...mono, fontSize: 11, color: DIM }}>{a.file}</span>
                  </div>
                  <div style={{ ...mono, fontSize: 12, lineHeight: 1.75 }}>
                    {a.preview.map((l, i) => (
                      <div key={i} style={{ color: l.c ?? DIM, whiteSpace: 'pre-wrap' }}>{l.t}</div>
                    ))}
                  </div>
                </div>
                {/* meta */}
                <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: a.color }}>{t(a.track)}</div>
                  <div style={{ ...serif, margin: '10px 0 0', fontSize: 22, fontWeight: 600, color: INK, letterSpacing: '-0.015em' }}>{t(a.name)}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 14.5, color: DIM, lineHeight: 1.6 }}>{t(a.proves)}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 18, background: 'linear-gradient(165deg, #0E1020, #111115)', padding: 'clamp(28px, 4vw, 44px)', marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: '46ch' }}>
              <div style={{ ...serif, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                {t('Every artifact lands in one verifiable portfolio.')}
              </div>
              <p style={{ margin: '10px 0 0', color: DIM, fontSize: 15, lineHeight: 1.6 }}>
                {t('Each passing proof stacks into an evidence ledger with a public link — the certificate is a')}{' '}<span style={{ ...mono, color: ACCENT_INK }}>curl</span>{' '}{t('command anyone can run, not a PDF they take on faith.')}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Link href="/academy/signup" style={{ display: 'inline-flex', background: ACCENT, color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '15px 28px', borderRadius: 26, boxShadow: '0 0 22px rgba(61,90,254,0.35)' }}>{t('Start building yours')}</Link>
              <Link href="/academy/method" style={{ display: 'inline-flex', color: INK, border: `1px solid #2A2A33`, textDecoration: 'none', fontSize: 15, padding: '14px 26px', borderRadius: 26 }}>{t('See the method')} →</Link>
            </div>
          </div>
        </main>
      </div>
      <EcosystemBand current="projects" />
      <AcademyFooter />
    </>
  )
}
