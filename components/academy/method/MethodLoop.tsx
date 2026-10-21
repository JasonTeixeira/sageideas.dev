/**
 * The signature learning-loop diagram for /academy/method — the ten moves every
 * lesson runs, as a connected band that reads as a loop (it closes back to the
 * start). Static + CSS only (no canvas/images) so it's fast and responsive.
 */

const INK = '#F2EFE9'
const DIM = '#9598A2'
const LINE = '#2A2A32'
const ACCENT = '#3D5AFE'
const ACCENT_INK = '#8FA0FF'
const GREEN = '#18B663'
const AMBER = '#E0A93E'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

type Step = { n: string; name: string; desc: string; color: string }

const STEPS: Step[] = [
  { n: '01', name: 'Frame', desc: 'turn a messy stake into a real question', color: ACCENT },
  { n: '02', name: 'Route', desc: 'pick the diagnosis path', color: ACCENT },
  { n: '03', name: 'Map', desc: 'draw the system you can defend', color: ACCENT },
  { n: '04', name: 'Decide', desc: 'commit under tradeoffs', color: ACCENT },
  { n: '05', name: 'Prove', desc: 'no vibes — a check that passes', color: GREEN },
  { n: '06', name: 'Review', desc: 'a skeptic reads your work', color: GREEN },
  { n: '07', name: 'Repair', desc: 'fix the real failure', color: AMBER },
  { n: '08', name: 'Space', desc: 'recall at 1 / 3 / 7 / 30 days', color: ACCENT },
  { n: '09', name: 'Transfer', desc: 'apply it somewhere new', color: ACCENT },
  { n: '10', name: 'Package', desc: 'ship the evidence', color: GREEN },
]

export function MethodLoop() {
  return (
    <div>
      {/* A highlight travels through the ten steps, so the loop visibly *runs*.
          Each step's top-rail glows in sequence; reduced-motion shows them static. */}
      <style>{`
@keyframes sgLoopRail { 0%, 100% { opacity: 0.35; box-shadow: none } 8% { opacity: 1; box-shadow: 0 0 16px 1px currentColor } 22% { opacity: 0.35; box-shadow: none } }
.sgLoopStep .sgLoopRail { animation: sgLoopRail 6s linear infinite; }
@media (prefers-reduced-motion: reduce) { .sgLoopStep .sgLoopRail { animation: none; opacity: 0.7 } }
`}</style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 188px), 1fr))',
          gap: 14,
        }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className="sgLoopStep"
            style={{
              position: 'relative',
              border: `1px solid ${LINE}`,
              borderRadius: 13,
              background: '#111115',
              padding: '16px 16px 18px',
              overflow: 'hidden',
            }}
          >
            <span aria-hidden="true" className="sgLoopRail" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, color: s.color, opacity: 0.7, animationDelay: `${i * 0.55}s` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...mono, fontSize: 11, color: s.color === ACCENT ? ACCENT_INK : s.color }}>{s.n}</span>
              <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>{s.name}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: DIM, lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 18,
          ...mono,
          fontSize: 11.5,
          color: DIM,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', border: `1px solid ${ACCENT}`, color: '#8FA0FF', fontSize: 14 }}>↻</span>
        Then again — on a new problem, at a higher altitude. The loop is the muscle; the reps make the engineer.
      </div>
    </div>
  )
}
