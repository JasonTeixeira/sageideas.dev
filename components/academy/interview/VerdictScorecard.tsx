'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  RUBRIC_DIMENSIONS,
  barForLevel,
  verdictLabel,
  type CommitteeVerdict,
} from '@/lib/academy/interview/rubric'
import styles from './verdict.module.css'

/** One graded dimension from interview_verdicts.dims. */
type VerdictDim = { slug: string; score: number; delta: number; bar_status: string }
/** One evidence item from interview_verdicts.evidence. */
type VerdictEvidenceItem = { ts_seconds: number; mark: string; title: string; note: string }

export type VerdictRow = {
  score: number
  prev_score: number | null
  verdict: CommitteeVerdict
  dims: VerdictDim[]
  evidence: VerdictEvidenceItem[]
  summary_sentence: string | null
  claims_checked: number | null
  words: number | null
  level: string
}

type Props = {
  sessionId: string
  /** The real graded row — or null when the grade is still running / failed. */
  verdict: VerdictRow | null
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 76 // r = 76 → ≈ 477.5
const PROCESSING_LINES = [
  'Marlowe is scoring your session…',
  'Reading the transcript for evidence…',
  'Comparing against the bar…',
]

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * The committee verdict scorecard. When the grade is still running (verdict null) it
 * shows an HONEST "Scoring your interview…" processing state with a re-check — never a
 * fabricated score. When the real row is present it plays a short processing → reveal
 * beat: a count-up ring to the real min-capped score, the committee label, the
 * "capped by your weakest" framing, the six dimension bars in bar_status colors, and
 * the timestamped evidence — all from the real row.
 */
export function VerdictScorecard({ sessionId, verdict }: Props) {
  const router = useRouter()
  const [rechecking, setRechecking] = useState(false)

  // ── Absent grade: honest processing + re-check (no fake score) ──
  if (!verdict) {
    const recheck = () => {
      setRechecking(true)
      router.refresh()
      // The refresh re-renders the server component; clear the flag shortly after.
      window.setTimeout(() => setRechecking(false), 1500)
    }
    return (
      <div className={styles.root}>
        <div className={styles.processing}>
          <span className={styles.procOrb} aria-hidden />
          <div className={styles.procLine}>Scoring your interview…</div>
          <div className={styles.procMeta}>
            The committee is grading your transcript against the bar. This can take a moment.
          </div>
          <p className={styles.procFail}>
            No verdict yet — grading may still be running, or it fell back. Nothing here is scored
            until the real committee grade lands.
          </p>
          <button type="button" className={styles.recheck} onClick={recheck} disabled={rechecking}>
            {rechecking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>
    )
  }

  return <Reveal sessionId={sessionId} verdict={verdict} />
}

/** The reveal phase — split out so hooks run unconditionally once a row exists. */
function Reveal({ sessionId, verdict }: { sessionId: string; verdict: VerdictRow }) {
  const [reduced] = useState(prefersReducedMotion)
  const [phase, setPhase] = useState<'processing' | 'reveal'>(reduced ? 'reveal' : 'processing')
  const [lineIdx, setLineIdx] = useState(0)
  const [count, setCount] = useState(reduced ? verdict.score : 0)
  // The ring starts empty and arms after mount so the CSS transition draws the arc.
  const [armed, setArmed] = useState(reduced)

  const bar = barForLevel(verdict.level)

  // Cycle the processing lines, then flip to reveal after a short beat.
  useEffect(() => {
    if (reduced) return
    const lineTimer = setInterval(() => setLineIdx((i) => (i + 1) % PROCESSING_LINES.length), 1000)
    const revealTimer = setTimeout(() => {
      clearInterval(lineTimer)
      setPhase('reveal')
    }, 2400)
    return () => {
      clearInterval(lineTimer)
      clearTimeout(revealTimer)
    }
  }, [reduced])

  // Arm the ring one frame into the reveal so the stroke-dashoffset transition runs.
  useEffect(() => {
    if (phase !== 'reveal' || reduced) return
    const raf = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(raf)
  }, [phase, reduced])

  // Count the score up to its real value on reveal.
  useEffect(() => {
    if (phase !== 'reveal' || reduced) return
    let raf = 0
    const start = performance.now()
    const duration = 1100
    const target = verdict.score
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, reduced, verdict.score])

  // Weakest dimension = the min-cap driver (label for the "capped by" framing).
  const weakest = useMemo(() => {
    if (verdict.dims.length === 0) return null
    const min = verdict.dims.reduce((a, b) => (b.score < a.score ? b : a))
    const def = RUBRIC_DIMENSIONS.find((d) => d.slug === min.slug)
    return { slug: min.slug, label: def?.label ?? min.slug, score: min.score }
  }, [verdict.dims])

  // Order the six dimensions canonically, pulling the real score/status per slug.
  const orderedDims = useMemo(() => {
    const bySlug = new Map(verdict.dims.map((d) => [d.slug, d]))
    return RUBRIC_DIMENSIONS.map((def) => ({ def, dim: bySlug.get(def.slug) })).filter(
      (x): x is { def: (typeof RUBRIC_DIMENSIONS)[number]; dim: VerdictDim } => Boolean(x.dim),
    )
  }, [verdict.dims])

  if (phase === 'processing') {
    return (
      <div className={styles.root}>
        <div className={styles.processing}>
          <span className={styles.procOrb} aria-hidden />
          <div className={styles.procLine}>{PROCESSING_LINES[lineIdx]}</div>
          <div className={styles.procMeta}>
            {verdict.words != null ? `${verdict.words.toLocaleString()} words · ` : ''}
            {verdict.claims_checked != null
              ? `${verdict.claims_checked} claims checked against the transcript`
              : 'reading the transcript for evidence'}
          </div>
        </div>
      </div>
    )
  }

  const delta = verdict.prev_score != null ? verdict.score - verdict.prev_score : null
  const finalOffset = RING_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, verdict.score)) / 100)
  const ringOffset = armed ? finalOffset : RING_CIRCUMFERENCE

  return (
    <div className={styles.root}>
      <div className={styles.reveal}>
        <div className={styles.ringWrap}>
          <svg viewBox="0 0 172 172" className={styles.ringSvg} aria-hidden>
            <circle cx="86" cy="86" r="76" className={styles.ringTrack} />
            <circle
              cx="86"
              cy="86"
              r="76"
              className={styles.ringArc}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
            />
            <defs>
              <linearGradient id="ivGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F0C36A" />
                <stop offset="100%" stopColor="#D99A2B" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.ringCenter}>
            <div>
              <div className={styles.scoreNum} aria-label={`Readiness ${verdict.score}`}>
                {count}
              </div>
              {delta != null ? (
                <div className={styles.scoreDelta}>
                  was {verdict.prev_score} ·{' '}
                  <span className={delta >= 0 ? styles.deltaUp : styles.deltaDown}>
                    {delta >= 0 ? '▲' : '▼'}
                    {Math.abs(delta)}
                  </span>
                </div>
              ) : (
                <div className={styles.scoreDelta}>your first mock</div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.committeeKicker}>Committee verdict</div>
        <h1 className={styles.verdictLine}>{verdictLabel(verdict.verdict)}</h1>
        {verdict.summary_sentence ? <p className={styles.summary}>{verdict.summary_sentence}</p> : null}
        {weakest ? (
          <div className={styles.capNote}>
            capped by your weakest: {weakest.label} ({weakest.score})
          </div>
        ) : null}

        <div className={styles.dims}>
          {orderedDims.map(({ def, dim }) => {
            const isWeakest = weakest?.slug === dim.slug
            return (
              <div key={dim.slug} className={styles.dim} data-weakest={isWeakest || undefined}>
                <div className={styles.dimHead}>
                  <span className={styles.dimLabel}>{def.label}</span>
                  {isWeakest ? <span className={styles.dimWeakTag}>the cap</span> : null}
                </div>
                <div className={styles.dimScore}>
                  {dim.score}
                  {dim.delta ? (
                    <span
                      className={styles.dimDelta}
                      style={{ color: dim.delta >= 0 ? 'var(--sa-success)' : 'var(--sa-danger)' }}
                    >
                      {dim.delta >= 0 ? '▲' : '▼'}
                      {Math.abs(dim.delta)}
                    </span>
                  ) : null}
                </div>
                <div className={styles.track}>
                  <span
                    className={styles.bar}
                    data-status={dim.bar_status}
                    style={{ width: `${Math.min(100, Math.max(0, dim.score))}%` }}
                  />
                  <span className={styles.barMark} style={{ left: `${bar}%` }} aria-hidden />
                </div>
              </div>
            )
          })}
        </div>

        {verdict.evidence.length > 0 ? (
          <div className={styles.evidence}>
            <div className={styles.evidenceTitle}>Timestamped evidence</div>
            {verdict.evidence.map((ev, i) => (
              <div key={i} className={styles.evItem}>
                <span className={styles.evStamp}>{mmss(ev.ts_seconds)}</span>
                <div className={styles.evBody}>
                  <div className={styles.evTop}>
                    {ev.mark ? (
                      <span className={styles.evMark} data-mark={ev.mark}>
                        {ev.mark}
                      </span>
                    ) : null}
                    {ev.title ? <span className={styles.evName}>{ev.title}</span> : null}
                  </div>
                  {ev.note ? <p className={styles.evNote}>{ev.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className={styles.ctaRow}>
          <Link href={`/academy/interview/debrief/${sessionId}`} className={styles.ctaPrimary}>
            Read the debrief →
          </Link>
          <Link href="/academy/interview" className={styles.ctaGhost}>
            back to cockpit
          </Link>
        </div>
      </div>
    </div>
  )
}
