'use client'

import { ArchIcon, ARCH_ICON_KINDS, ARCH_ICON_GROUPS, type ArchIconKind } from '@/components/academy/visuals/arch-icons'
import { SageDiagram, type SageDiagramNode, type SageDiagramEdge, type SageDiagramLegendItem } from '@/components/academy/visuals/SageDiagram'
import { NarratedDiagram, type DiagramStoryboard } from '@/components/academy/visuals/NarratedDiagram'
import { SageCodeWalkthrough, type CodeWalkthroughStep } from '@/components/academy/visuals/SageCodeWalkthrough'
import { SageCompare, type SageComparePanel } from '@/components/academy/visuals/SageCompare'
import { SageViz, type SageVizPoint } from '@/components/academy/visuals/SageViz'
import samples from '../diagram-preview/samples.json'

// Sage Academy — DESIGN SYSTEM. A chrome-free /proto page documenting the whole
// visual engine: the exact palette + type ramp, the four signature visuals shown
// live with real-shape example data, then the schematic part form + full icon
// bank. Illustrative example data only — no product stats are claimed.

// ── exact palette ────────────────────────────────────────────────────────────
const BG = '#0B0B0E'
const SURFACE = '#111115'
const SURFACE_3 = '#2A2A33'
const INK = '#F2EFE9'
const MUTE = '#9598A2'
const LINE = '#1E1E24'
const BLUE = '#83AFFF' // blueprint annotation ink

const MONO = 'var(--font-mono), monospace'
const SERIF = 'var(--font-serif), Georgia, serif'
const SANS = 'var(--font-sans), system-ui, sans-serif'

// ── shared inline style helpers ──────────────────────────────────────────────
const sectionKicker: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: '0.14em',
  color: BLUE,
  textTransform: 'uppercase',
  margin: 0,
}
const h2Style: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 'clamp(1.5rem,1.1rem+1.4vw,2.2rem)',
  fontWeight: 500,
  letterSpacing: '-0.02em',
  margin: '10px 0 6px',
}
const sectionNote: React.CSSProperties = {
  fontFamily: SANS,
  color: MUTE,
  fontSize: 14,
  lineHeight: 1.6,
  maxWidth: 620,
  margin: 0,
}
const cardStyle: React.CSSProperties = {
  background: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  padding: 22,
}
const colGroupTitle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: '0.14em',
  color: MUTE,
  textTransform: 'uppercase',
  margin: '0 0 16px',
}

// ── Color ────────────────────────────────────────────────────────────────────
type Swatch = { name: string; hex: string; sub?: string; ring?: boolean }
const SURFACE_RAMP: Swatch[] = [
  { name: 'bg', hex: '#0B0B0E' },
  { name: 'surface-1', hex: '#111115' },
  { name: 'surface-2', hex: '#141418' },
  { name: 'surface-3', hex: '#2A2A33' },
]
const INK_RAMP: Swatch[] = [
  { name: 'ink', hex: '#F2EFE9' },
  { name: 'ink-muted', hex: '#9598A2' },
  { name: 'ink-faint', hex: '#5A5C66' },
  { name: 'rule / rule-strong', hex: '#1E1E24', ring: true },
]
const SEMANTIC: Swatch[] = [
  { name: 'accent', hex: '#3D5AFE', sub: 'focus · suspect · primary action' },
  { name: 'success', hex: '#18B663', sub: 'truth · mastery · passed proof' },
  { name: 'warning', hex: '#E0A93E', sub: 'risk · blast radius · pending' },
  { name: 'danger', hex: '#E5484D', sub: 'error · failed proof' },
  { name: 'muted', hex: '#9598A2', sub: 'out of scope' },
]

function SwatchRow({ s }: { s: Swatch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          flex: '0 0 auto',
          borderRadius: 8,
          background: s.hex,
          border: s.ring ? `1px solid ${SURFACE_3}` : `1px solid ${LINE}`,
          boxShadow: s.ring ? 'none' : 'inset 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: SANS, fontSize: 14, color: INK, fontWeight: 500 }}>{s.name}</div>
        {s.sub ? <div style={{ fontFamily: SANS, fontSize: 12, color: MUTE, marginTop: 2 }}>{s.sub}</div> : null}
      </div>
      <span style={{ fontFamily: MONO, fontSize: 12, color: MUTE, letterSpacing: '0.02em' }}>{s.hex}</span>
    </div>
  )
}

// ── SageDiagram sample: a small realistic system, mixed kinds + tones ─────────
const DIAGRAM_NODES: SageDiagramNode[] = [
  { id: 'client', label: 'Browser', description: 'checkout form', kind: 'client', tone: 'default' },
  { id: 'gateway', label: 'API Gateway', description: 'auth + rate limit', kind: 'service', tone: 'accent' },
  { id: 'orders', label: 'Orders API', description: 'writes the charge', kind: 'service', tone: 'default' },
  { id: 'db', label: 'Orders DB', description: 'source of truth', kind: 'store', tone: 'success' },
  { id: 'queue', label: 'Fulfilment Queue', description: 'async jobs', kind: 'queue', tone: 'default' },
  { id: 'stripe', label: 'Stripe', description: 'external effect', kind: 'external', tone: 'warning' },
]
const DIAGRAM_EDGES: SageDiagramEdge[] = [
  { from: 'client', to: 'gateway', kind: 'sync', tone: 'accent', label: 'POST /checkout' },
  { from: 'gateway', to: 'orders', kind: 'sync' },
  { from: 'orders', to: 'db', kind: 'data', tone: 'success', label: 'commit' },
  { from: 'orders', to: 'stripe', kind: 'sync', tone: 'warning', label: 'charge once' },
  { from: 'orders', to: 'queue', kind: 'async', label: 'enqueue' },
]
const DIAGRAM_LEGEND: SageDiagramLegendItem[] = [
  { tone: 'accent', label: 'primary path' },
  { tone: 'success', label: 'source of truth' },
  { tone: 'warning', label: 'external effect' },
]

// ── NarratedDiagram: reuse the idempotent-charge spec + storyboard ────────────
const narratedSpec = (samples as unknown as Array<{
  title: string
  subtitle?: string
  rankdir?: 'LR' | 'TB' | 'RL' | 'BT'
  nodes: SageDiagramNode[]
  edges: SageDiagramEdge[]
  legend?: SageDiagramLegendItem[]
}>)[1]

const NARRATED_STORYBOARD: DiagramStoryboard = [
  { say: 'A charge begins — the client POSTs the request with an Idempotency-Key.', nodes: ['client', 'handler'], edges: [['client', 'handler']], ms: 3800 },
  { say: 'The handler reserves that key in the SAME transaction as the charge — one atomic write.', nodes: ['handler', 'keys', 'charges'], edges: [['handler', 'keys'], ['handler', 'charges']], ms: 4400 },
  { say: 'It hits the payment gateway exactly once — the external effect that must never repeat.', nodes: ['handler', 'gateway'], edges: [['handler', 'gateway']], ms: 4000 },
  { say: 'Now a replay arrives — the same key, a second time.', nodes: ['replay', 'keys'], edges: [['replay', 'keys']], ms: 3400 },
  { say: 'The key already exists, so the stored result returns straight to the client — no second charge.', nodes: ['keys', 'client'], edges: [['keys', 'client']], ms: 4400 },
  { say: 'That is idempotency: the key store is the single source of truth, and the gateway is only ever charged once.', nodes: ['keys', 'gateway'], edges: [], ms: 4800 },
]

// ── SageCodeWalkthrough: a real idempotency check (TypeScript) ────────────────
const WALKTHROUGH_CODE = `export async function chargeOnce(req: ChargeRequest) {
  const key = req.headers['idempotency-key']
  if (!key) throw new HttpError(400, 'Idempotency-Key required')

  return db.transaction(async (tx) => {
    const existing = await tx.keys.find(key)
    if (existing) return existing.result

    const charge = await gateway.charge(req.amount)
    const result = { id: charge.id, status: 'ok' }
    await tx.keys.insert({ key, result })
    return result
  })
}`

const WALKTHROUGH_STEPS: CodeWalkthroughStep[] = [
  { lines: [2, 3], label: 'Read the key', note: 'Every charge must carry an Idempotency-Key. No key, no charge — fail fast at the boundary.' },
  { lines: [6, 7], label: 'Short-circuit replays', note: 'If the key is already reserved, return the stored result. The gateway is never touched a second time.' },
  { lines: [9, 10, 11], label: 'Charge, then reserve — atomically', note: 'The external charge and the key insert commit in one transaction, so a crash cannot leave a charge without its key.' },
]

// ── SageCompare: the certificate vs the proof (anti-cert positioning) ─────────
const COMPARE_LEFT: SageComparePanel = {
  label: 'The certificate',
  tone: 'muted',
  lines: [
    'A PDF that says you attended',
    'Multiple-choice, forgotten by Friday',
    'Proves you paid, not that you can',
    'Nobody re-checks it',
  ],
  verdict: 'A receipt, not a signal.',
}
const COMPARE_RIGHT: SageComparePanel = {
  label: 'The proof',
  tone: 'success',
  lines: [
    'A working system you built',
    'Reviewed line-by-line against a rubric',
    'Proves you can ship it under load',
    'Re-runs on every push',
  ],
  verdict: 'Evidence that survives scrutiny.',
}

// ── SageViz: recall vs cramming (illustrative example shape) ──────────────────
const VIZ_DATA: SageVizPoint[] = [
  { label: 'Day 1', value: 100 },
  { label: 'Day 3', value: 58 },
  { label: 'Day 7', value: 41 },
  { label: 'Day 14', value: 33 },
  { label: 'Day 30', value: 21 },
  { label: 'Day 60', value: 14 },
]

// ── the schematic "part" form (existing gallery, kept) ────────────────────────
const PART_TONES = {
  default: { line: '#9598A2', ann: BLUE },
  accent: { line: '#3D5AFE', ann: '#83AFFF' },
  warning: { line: '#E5484D', ann: '#E5484D' },
  success: { line: '#18B663', ann: '#18B663' },
} as const
type ToneKey = keyof typeof PART_TONES

function SchematicPart({
  kind,
  label,
  part,
  tone = 'default',
}: {
  kind: ArchIconKind
  label: string
  part: string
  tone?: ToneKey
}) {
  const t = PART_TONES[tone]
  return (
    <svg viewBox="0 0 244 100" width={244} height={100} style={{ overflow: 'visible' }}>
      <g stroke={t.ann} strokeWidth={1} opacity={0.7}>
        <path d="M2 10V2h8M234 2h8v8M2 90v8h8M242 90v8h-8" fill="none" />
      </g>
      <path
        d="M8 6H222L238 22V94H8Z"
        fill="var(--ac-surface, #111115)"
        stroke={t.line}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <line x1="8" y1="30" x2="238" y2="30" stroke={t.line} strokeWidth={1} opacity={0.6} />
      <text x="18" y="22" fill={t.ann} fontFamily="var(--ac-font-mono, monospace)" fontSize="9.5" letterSpacing="1.4">
        {kind.toUpperCase()}
      </text>
      <text x="230" y="22" textAnchor="end" fill={MUTE} fontFamily="var(--ac-font-mono, monospace)" fontSize="9.5">
        {part}
      </text>
      <g transform="translate(20 44)" style={{ color: t.line }}>
        <ArchIcon kind={kind} size={34} strokeWidth={1.4} />
      </g>
      <text x="66" y="62" fill={INK} fontFamily="var(--ac-font-display, Georgia, serif)" fontSize="18" fontWeight={500}>
        {label}
      </text>
      <g stroke={t.ann} strokeWidth={0.9} opacity={0.6}>
        <path d="M20 78h198" fill="none" />
        <path d="M20 75v6M218 75v6" fill="none" />
      </g>
      <text x="119" y="76" textAnchor="middle" fill={t.ann} fontFamily="var(--ac-font-mono, monospace)" fontSize="8" opacity={0.8}>
        trust boundary
      </text>
    </svg>
  )
}

const SAMPLE_PARTS: { kind: ArchIconKind; label: string; part: string; tone: ToneKey }[] = [
  { kind: 'client', label: 'Browser', part: 'C-01', tone: 'default' },
  { kind: 'gateway', label: 'API Gateway', part: 'G-01', tone: 'accent' },
  { kind: 'auth', label: 'Auth service', part: 'A-01', tone: 'default' },
  { kind: 'service', label: 'Orders API', part: 'S-04', tone: 'default' },
  { kind: 'store', label: 'Orders DB', part: 'D-02', tone: 'success' },
  { kind: 'external', label: '3rd-party', part: 'X-01', tone: 'warning' },
  { kind: 'llm', label: 'Model', part: 'M-01', tone: 'accent' },
  { kind: 'queue', label: 'Job queue', part: 'Q-01', tone: 'default' },
]

// ── a labelled section wrapper for the live signature visuals ─────────────────
function VisualSection({
  name,
  title,
  note,
  children,
}: {
  name: string
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: 64 }}>
      <p style={sectionKicker}>{name}</p>
      <h2 style={h2Style}>{title}</h2>
      <p style={{ ...sectionNote, marginBottom: 24 }}>{note}</p>
      <div style={{ maxWidth: 1000 }}>{children}</div>
    </section>
  )
}

export default function DesignSystemGallery() {
  return (
    <main style={{ background: BG, minHeight: '100vh', color: INK, padding: '56px clamp(16px,4vw,64px)' }}>
      {/* ── Header ── */}
      <header style={{ maxWidth: 760 }}>
        <p style={sectionKicker}>Sage Academy · Design System</p>
        <h1
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(2.4rem,1.6rem+3.4vw,4.4rem)',
            fontWeight: 500,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            margin: '14px 0 12px',
          }}
        >
          The system every screen is built from.
        </h1>
        <p style={{ ...sectionNote, maxWidth: 640, fontSize: 16 }}>
          The tokens, the type ramp, and the four signature visuals — the one drawing
          language that renders every lesson, concept, and project across the app. Every
          number below is illustrative example content, not a product claim.
        </p>
      </header>

      {/* ── Color ── */}
      <section style={{ marginTop: 72 }}>
        <p style={sectionKicker}>Color</p>
        <h2 style={h2Style}>Color carries meaning, not decoration.</h2>
        <p style={{ ...sectionNote, marginBottom: 26 }}>
          A near-black surface ramp, a warm ivory ink ramp, one hairline, and five
          semantic tones that mean the same thing in every visual.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            maxWidth: 1120,
          }}
        >
          <div style={cardStyle}>
            <p style={colGroupTitle}>Surface ramp</p>
            {SURFACE_RAMP.map((s) => (
              <SwatchRow key={s.name} s={s} />
            ))}
          </div>
          <div style={cardStyle}>
            <p style={colGroupTitle}>Ink &amp; hairlines</p>
            {INK_RAMP.map((s) => (
              <SwatchRow key={s.name} s={s} />
            ))}
          </div>
          <div style={cardStyle}>
            <p style={colGroupTitle}>Semantic tones</p>
            {SEMANTIC.map((s) => (
              <SwatchRow key={s.name} s={s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Type ── */}
      <section style={{ marginTop: 72 }}>
        <p style={sectionKicker}>Type</p>
        <h2 style={h2Style}>Three families, one voice.</h2>
        <p style={{ ...sectionNote, marginBottom: 26 }}>
          Fraunces sets the ideas, Hanken Grotesk carries the prose, JetBrains Mono
          labels the machinery.
        </p>
        <div style={{ ...cardStyle, maxWidth: 1120, padding: 'clamp(24px,3vw,40px)' }}>
          {/* display specimen */}
          <p style={{ ...colGroupTitle, marginBottom: 12 }}>Fraunces · display · --font-serif</p>
          <p
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(1.8rem,1.2rem+2.4vw,3rem)',
              fontWeight: 500,
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: INK,
              margin: '0 0 32px',
            }}
          >
            Learn to think like a senior engineer — and prove it.
          </p>

          {/* body specimen */}
          <div style={{ height: 1, background: LINE, margin: '0 0 28px' }} />
          <p style={{ ...colGroupTitle, marginBottom: 12 }}>Hanken Grotesk · body · --font-sans</p>
          <p
            style={{
              fontFamily: SANS,
              fontSize: 17,
              lineHeight: 1.7,
              color: MUTE,
              maxWidth: 640,
              margin: '0 0 32px',
            }}
          >
            Tutorials teach syntax. Nobody teaches judgement — framing an ambiguous
            problem, routing a diagnosis, deciding under tradeoffs, and proving it under a
            skeptic&rsquo;s eye. That is what the body copy exists to carry, at a measure
            that stays comfortable across the whole app.
          </p>

          {/* mono specimen */}
          <div style={{ height: 1, background: LINE, margin: '0 0 28px' }} />
          <p style={{ ...colGroupTitle, marginBottom: 12 }}>JetBrains Mono · label / code · --font-mono</p>
          <pre
            style={{
              fontFamily: MONO,
              fontSize: 14,
              lineHeight: 1.7,
              color: INK,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            <span style={{ color: BLUE }}>MASTERY-78</span> · compiled by proof{'\n'}
            recall: 0.41 · retention 92%{'\n'}
            evidence-events: 14
          </pre>
        </div>
      </section>

      {/* ── Signature visuals ── */}
      <div style={{ marginTop: 80, marginBottom: 8 }}>
        <p style={{ ...sectionKicker, color: MUTE }}>The four signature visuals — live</p>
      </div>

      <VisualSection
        name="SageDiagram"
        title="The system map, laid out for you."
        note="A layout-free spec — nodes carry only meaning, edges only flow — auto-arranged by the layout engine. Colorful semantic nodes, per-tone dataflow pulses, an auto-derived legend."
      >
        <SageDiagram
          title="Where a charge flows through the system"
          subtitle="checkout → gateway → orders → source of truth, with one external effect"
          nodes={DIAGRAM_NODES}
          edges={DIAGRAM_EDGES}
          legend={DIAGRAM_LEGEND}
          rankdir="LR"
          caption="Example system. Node tone is the teaching: blue is the primary path, green the source of truth, gold the external effect that must fire once."
        />
      </VisualSection>

      <VisualSection
        name="NarratedDiagram"
        title="The diagram explains itself."
        note="Wrap any diagram spec with a storyboard and it narrates beat-by-beat — spotlighting the nodes each line is about, firing their dataflow, auto-advancing on a timeline. Voice-sync-ready."
      >
        <NarratedDiagram
          title={narratedSpec.title}
          subtitle={narratedSpec.subtitle}
          rankdir={narratedSpec.rankdir ?? 'LR'}
          nodes={narratedSpec.nodes}
          edges={narratedSpec.edges}
          legend={narratedSpec.legend}
          storyboard={NARRATED_STORYBOARD}
        />
      </VisualSection>

      <VisualSection
        name="SageCodeWalkthrough"
        title="Code that steps through itself."
        note="A terminal-look surface renders a real snippet in JetBrains Mono. Authored steps each highlight a set of lines; the rest recede. Auto-advances, and is fully operable by hand and keyboard."
      >
        <SageCodeWalkthrough
          title="Charging exactly once"
          subtitle="idempotency by key reservation"
          filename="charge.ts"
          language="ts"
          code={WALKTHROUGH_CODE}
          steps={WALKTHROUGH_STEPS}
          caption="Example snippet. The key store is the single source of truth; the gateway is charged at most once per key."
        />
      </VisualSection>

      <VisualSection
        name="SageCompare"
        title="The contrast is the signal."
        note="Two toned panels sit side-by-side; the semantic tone does the teaching. Here: the thing the industry sells versus the thing the academy issues."
      >
        <SageCompare
          title="What we replace"
          subtitle="the certificate vs the proof"
          left={COMPARE_LEFT}
          right={COMPARE_RIGHT}
          caption="Illustrative positioning, not a comparison of specific programs."
        />
      </VisualSection>

      <VisualSection
        name="SageViz"
        title="Data as part of the system."
        note="Charts share the same frame, tokens, and motion as every other visual. Axes, ticks, and the latest-value readout are handled by the engine."
      >
        <SageViz
          title="Recall decays without spacing"
          subtitle="illustrative forgetting curve — example values, not measured data"
          chart="area"
          data={VIZ_DATA}
          unit="%"
        />
      </VisualSection>

      {/* ── the schematic part form (existing gallery) ── */}
      <section style={{ marginTop: 80 }}>
        <p style={sectionKicker}>Components · the signature part form</p>
        <h2 style={h2Style}>One drawing language for every part.</h2>
        <p style={{ ...sectionNote, marginBottom: 20 }}>
          Proprietary schematic glyphs + the Sage part form — thin engineering linework,
          cut corners, blueprint annotations, part numbers, and semantic tone.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 28, maxWidth: 1120 }}>
          {SAMPLE_PARTS.map((p) => (
            <SchematicPart key={p.part} {...p} />
          ))}
        </div>
      </section>

      {/* ── the full glyph bank, grouped by category ── */}
      <section style={{ marginTop: 64 }}>
        <p style={sectionKicker}>The component bank ({ARCH_ICON_KINDS.length})</p>
        <h2 style={h2Style}>Every component of a system, one glyph each.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 20, maxWidth: 1120 }}>
          {ARCH_ICON_GROUPS.map((grp) => (
            <div key={grp.group}>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: BLUE, textTransform: 'uppercase', marginBottom: 10 }}>
                {grp.group} · {grp.kinds.length}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))', gap: 2, background: LINE, border: `1px solid ${LINE}` }}>
                {grp.kinds.map((k) => (
                  <div key={k} style={{ background: SURFACE, padding: '20px 10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
                    <span style={{ color: INK }}>
                      <ArchIcon kind={k} size={28} />
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: MUTE, letterSpacing: '0.04em' }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
