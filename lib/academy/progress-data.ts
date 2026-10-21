import 'server-only'

import { fsrs, generatorParameters } from 'ts-fsrs'
import { supabaseAdmin, createSupabaseServerClient } from '@/lib/supabase/server'
import { getMasteryMap } from '@/lib/academy/mastery'
import {
  deriveSignals,
  hasOpenRepair,
  type EvidenceEvent,
  type EvidenceEventType,
  type EvidencePayload,
} from '@/lib/academy/evidence-events-logic'
import { resolveScore, type ContractSignals } from '@/lib/academy/caps-logic'

/**
 * Read-only assembler for the honest Progress analytics surface
 * (/academy/progress). Every panel here is a pure function of evidence the
 * learner has ACTUALLY produced — nothing is fabricated. A panel with no real
 * data is returned as null/empty so the view can omit it gracefully rather than
 * paint a fake bar.
 *
 * Panels:
 *  - masteryTimeline  — the learner's resolved-score curve reconstructed from
 *                       real evidence-event timestamps (per the most-worked
 *                       course), plus real failed-proof markers (open repairs).
 *  - courses          — per-course resolved score + binding cap + real action.
 *  - velocity         — artifacts-per-week, bucketed from real event timestamps.
 *  - recall           — FSRS recall strength per concept, from academy_reviews.
 *
 * Course-by-dimension is intentionally ABSENT: the platform has no per-dimension
 * (Frame/Map/Decide/Prove/Transfer) score decomposition — the caps ladder is a
 * set of binary evidence signals, not five 0–100 dimension scores. Inventing
 * them would be theatre, so that design panel is omitted.
 *
 * @security userId MUST be the server-derived authenticated id — supabaseAdmin
 * bypasses RLS.
 */

/** Same honest contract the mastery map uses (everything but real-learner outcome present). */
const CONTRACT: ContractSignals = {
  scenarioFirst: true,
  habitTriggers: true,
  socialSurface: true,
  aiGuideGrounding: true,
  masteryMapEntry: true,
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const TIMELINE_WEEKS = 12
const VELOCITY_WEEKS = 7

/** One point on the mastery curve. */
export type MasteryPoint = {
  /** 0..(TIMELINE_WEEKS-1) bucket index, oldest→newest. */
  week: number
  /** Resolved score at that point, 0–100. */
  score: number
}

/** A real failed-proof marker (an open repair created at this point). */
export type FailedProofMarker = {
  week: number
  score: number
  label: string
}

export type MasteryTimeline = {
  courseTitle: string
  points: MasteryPoint[]
  /** The current binding cap ceiling (null when fully evidenced). */
  cap: number | null
  capLabel: string | null
  markers: FailedProofMarker[]
}

export type CourseRow = {
  slug: string
  title: string
  /** Resolved score for the course (avg of its unit scores), 0–100. */
  score: number
  /** True when a binding cap is holding the score below 90 (capped). */
  capped: boolean
  /** Whole-course completion. */
  lessonsDone: number
  lessonsTotal: number
  state: 'capped' | 'complete' | 'certified' | 'learning'
  /** Real destination for the row's action (repair / recheck / cert / resume). */
  href: string
  actionLabel: string
  /** Cert code when certified (for the view-cert link). */
  certCode: string | null
}

export type VelocityBar = {
  label: string
  count: number
}

export type Velocity = {
  bars: VelocityBar[]
  total: number
  thisWeek: number
}

export type RecallState = 'solid' | 'decaying' | 'fading'

export type RecallConcept = {
  key: string
  label: string
  /** Recall strength 0–100 = FSRS retrievability × 100. */
  strength: number
  state: RecallState
  /** Days until next scheduled recall (negative = overdue). */
  dueInDays: number
  courseSlug: string | null
  lessonSlug: string | null
}

export type ProgressData = {
  signedIn: boolean
  masteryTimeline: MasteryTimeline | null
  courses: CourseRow[]
  velocity: Velocity | null
  recall: RecallConcept[]
  isEmpty: boolean
}

const emptyData: ProgressData = {
  signedIn: false,
  masteryTimeline: null,
  courses: [],
  velocity: null,
  recall: [],
  isEmpty: true,
}

type EvidenceRow = {
  course_slug: string
  lesson_slug: string
  event_type: string
  payload: EvidencePayload | null
  created_at: string
}

/** Bucket a timestamp into weeks-ago (0 = this week, up to `weeks-1`). */
function weekBucket(now: number, at: number, weeks: number): number {
  const ago = Math.floor((now - at) / WEEK_MS)
  return Math.max(0, Math.min(weeks - 1, weeks - 1 - ago))
}

/**
 * Reconstruct the mastery curve for one course by replaying resolved scores at
 * each of its evidence-event timestamps. Real: the score at any point IS the
 * resolveScore of the events accumulated up to that point. Failed-proof markers
 * are real `repair_created` events. Returns null when there is too little real
 * data to draw an honest line (< 2 points).
 */
function buildTimeline(
  courseTitle: string,
  events: readonly EvidenceRow[],
  now: number,
): MasteryTimeline | null {
  if (events.length < 2) return null

  const ordered = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  // Group the course's events by lesson so a per-lesson resolved score is honest,
  // then take the running MEAN of resolved lesson scores as the course curve.
  const lessonEvents = new Map<string, EvidenceEvent[]>()
  const points: MasteryPoint[] = []
  const markers: FailedProofMarker[] = []
  const seenMarkerWeeks = new Set<number>()

  for (const r of ordered) {
    const at = new Date(r.created_at).getTime()
    const key = r.lesson_slug
    const list = lessonEvents.get(key) ?? []
    list.push({
      type: r.event_type as EvidenceEventType,
      payload: (r.payload ?? {}) as EvidencePayload,
      at: r.created_at,
    })
    lessonEvents.set(key, list)

    // Mean resolved score across every lesson touched so far — the honest
    // "where the course stands" at this timestamp.
    let sum = 0
    for (const evs of lessonEvents.values()) {
      sum += resolveScore(deriveSignals(evs), CONTRACT).score
    }
    const score = Math.round(sum / lessonEvents.size)
    const week = weekBucket(now, at, TIMELINE_WEEKS)
    points.push({ week, score })

    // Real failed-proof marker: a repair that is currently open for this lesson.
    if (r.event_type === 'repair_created' && hasOpenRepair(lessonEvents.get(key)!)) {
      if (!seenMarkerWeeks.has(week)) {
        seenMarkerWeeks.add(week)
        markers.push({ week, score, label: 'repair open' })
      }
    }
  }

  // Collapse to one point per week (latest score wins) for a clean 12-week line.
  const byWeek = new Map<number, number>()
  for (const p of points) byWeek.set(p.week, p.score)
  const weekly: MasteryPoint[] = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, score]) => ({ week, score }))
  if (weekly.length < 2) return null

  // Current binding cap ceiling = min cap across the latest state of every lesson.
  let cap: number | null = null
  let capLabel: string | null = null
  for (const evs of lessonEvents.values()) {
    const res = resolveScore(deriveSignals(evs), CONTRACT)
    if (res.binding && (cap === null || res.binding.cap < cap)) {
      cap = res.binding.cap
      capLabel = res.binding.reason
    }
  }

  return { courseTitle, points: weekly, cap, capLabel, markers }
}

/** Recall strength state from FSRS retrievability. */
function recallState(strength: number): RecallState {
  if (strength >= 80) return 'solid'
  if (strength >= 60) return 'decaying'
  return 'fading'
}

/** Humanize a concept key (lesson slug) into a short label. */
function conceptLabel(key: string): string {
  const cleaned = key.replace(/^[a-z]+-/, '').replace(/[-_]+/g, ' ').trim()
  if (!cleaned) return key
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export async function getProgressData(): Promise<ProgressData> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return emptyData

    const admin = supabaseAdmin()
    const now = Date.now()
    const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }))

    // Independent reads in parallel — no waterfall.
    const [masteryMap, evRes, reviewsRes, courseMetaRes, certsRes, progressRes] =
      await Promise.all([
        getMasteryMap(user.id),
        admin
          .from('academy_evidence_events')
          .select('course_slug, lesson_slug, event_type, payload, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        admin
          .from('academy_reviews')
          .select(
            'concept_key, course_slug, lesson_slug, fsrs_stability, fsrs_due_at, last_reviewed_at, reps',
          )
          .eq('user_id', user.id)
          .gt('reps', 0),
        admin.from('academy_courses').select('slug, title, lessons'),
        admin.from('academy_certificates').select('cert_code, course_slug').eq('user_id', user.id),
        admin
          .from('academy_progress')
          .select('course_slug, lesson_slug, status')
          .eq('user_id', user.id),
      ])

    const evRows = (evRes.data ?? []) as EvidenceRow[]
    const titleBySlug = new Map(
      (courseMetaRes.data ?? []).map((c) => [c.slug as string, c.title as string]),
    )
    const totalLessonsBySlug = new Map(
      (courseMetaRes.data ?? []).map((c) => [c.slug as string, Number(c.lessons ?? 0)]),
    )
    const certBySlug = new Map(
      (certsRes.data ?? []).map((c) => [c.course_slug as string, c.cert_code as string]),
    )

    // Completed-lesson counts per course (real).
    const doneBySlug = new Map<string, number>()
    for (const r of (progressRes.data ?? []) as { course_slug: string; status: string }[]) {
      if (r.status === 'completed') {
        doneBySlug.set(r.course_slug, (doneBySlug.get(r.course_slug) ?? 0) + 1)
      }
    }

    // ── PER-COURSE rows (real: from the mastery map's per-unit resolved scores) ──
    const scoresBySlug = new Map<string, number[]>()
    for (const u of masteryMap.topics.flatMap((t) => t.units)) {
      const list = scoresBySlug.get(u.courseSlug) ?? []
      list.push(u.score)
      scoresBySlug.set(u.courseSlug, list)
    }
    const courses: CourseRow[] = [...scoresBySlug.entries()].map(([slug, scores]) => {
      const score = Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      const lessonsTotal = totalLessonsBySlug.get(slug) ?? scores.length
      const lessonsDone = doneBySlug.get(slug) ?? 0
      const certCode = certBySlug.get(slug) ?? null
      const complete = lessonsTotal > 0 && lessonsDone >= lessonsTotal
      let state: CourseRow['state']
      let href: string
      let actionLabel: string
      if (certCode) {
        state = 'certified'
        href = `/academy/certificate/${certCode}`
        actionLabel = 'view cert'
      } else if (score < 90) {
        state = 'capped'
        href = `/academy/course/${slug}`
        actionLabel = 'open repair →'
      } else if (complete) {
        state = 'complete'
        href = `/academy/review`
        actionLabel = 'recheck'
      } else {
        state = 'learning'
        href = `/academy/course/${slug}`
        actionLabel = 'resume'
      }
      return {
        slug,
        title: titleBySlug.get(slug) ?? slug,
        score,
        capped: score < 90,
        lessonsDone,
        lessonsTotal,
        state,
        href,
        actionLabel,
        certCode,
      }
    })
    courses.sort((a, b) => a.score - b.score)

    // ── MASTERY TIMELINE (real: reconstructed for the most-worked course) ──
    let masteryTimeline: MasteryTimeline | null = null
    if (evRows.length > 0) {
      const countBySlug = new Map<string, number>()
      for (const r of evRows) countBySlug.set(r.course_slug, (countBySlug.get(r.course_slug) ?? 0) + 1)
      const topSlug = [...countBySlug.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topSlug) {
        masteryTimeline = buildTimeline(
          titleBySlug.get(topSlug) ?? topSlug,
          evRows.filter((r) => r.course_slug === topSlug),
          now,
        )
      }
    }

    // ── EVIDENCE VELOCITY (real: artifacts bucketed per week) ──
    let velocity: Velocity | null = null
    if (evRows.length > 0) {
      const artifactTypes = new Set<string>([
        'sprint_artifact_created',
        'portfolio_item_created',
        'capstone_submitted',
      ])
      const counts = new Array(VELOCITY_WEEKS).fill(0)
      let total = 0
      for (const r of evRows) {
        if (!artifactTypes.has(r.event_type)) continue
        total += 1
        const at = new Date(r.created_at).getTime()
        const ago = Math.floor((now - at) / WEEK_MS)
        if (ago < VELOCITY_WEEKS) counts[VELOCITY_WEEKS - 1 - ago] += 1
      }
      if (total > 0) {
        const bars: VelocityBar[] = counts.map((count, i) => ({
          // Weeks-ago label: rightmost bar is the current week ("now").
          label: i === VELOCITY_WEEKS - 1 ? 'now' : `-${VELOCITY_WEEKS - 1 - i}w`,
          count,
        }))
        velocity = { bars, total, thisWeek: counts[VELOCITY_WEEKS - 1] }
      }
    }

    // ── SKILL GRAPH · RECALL (real: FSRS retrievability per reviewed concept) ──
    const recall: RecallConcept[] = (reviewsRes.data ?? [])
      .map((r) => {
        const stability = Number(r.fsrs_stability ?? 0)
        const last = r.last_reviewed_at ? new Date(r.last_reviewed_at).getTime() : now
        const elapsedDays = Math.max(0, (now - last) / (24 * 60 * 60 * 1000))
        let strength = 0
        if (stability > 0) {
          strength = Math.round(scheduler.forgetting_curve(elapsedDays, stability) * 100)
        }
        const dueAt = r.fsrs_due_at ? new Date(r.fsrs_due_at).getTime() : now
        const dueInDays = Math.round((dueAt - now) / (24 * 60 * 60 * 1000))
        return {
          key: r.concept_key as string,
          label: conceptLabel(r.concept_key as string),
          strength: Math.max(0, Math.min(100, strength)),
          state: recallState(strength),
          dueInDays,
          courseSlug: (r.course_slug as string) ?? null,
          lessonSlug: (r.lesson_slug as string) ?? null,
        }
      })
      // Weakest first — recall targets the fading concepts.
      .sort((a, b) => a.strength - b.strength)
      .slice(0, 6)

    const isEmpty =
      !masteryTimeline && courses.length === 0 && !velocity && recall.length === 0

    return { signedIn: true, masteryTimeline, courses, velocity, recall, isEmpty }
  } catch (err) {
    console.error('[academy/progress-data] getProgressData failed', err)
    return { ...emptyData, signedIn: true }
  }
}
