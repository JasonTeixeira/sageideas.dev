'use server'

import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'
import { deepSeekChat } from '@/lib/rag/deepseek'
import {
  buildDrillPlanMessages,
  parseDrills,
  type AvailableScenario,
  type WeakDimension,
} from '@/lib/academy/interview/drill-logic'
import { DIMENSION_SLUGS } from '@/lib/academy/interview/rubric'

/**
 * Phase-2 write actions for the Interview Mastery loop: drill planning, schedule
 * / taper CRUD, reminders, and the STAR story bank. Kept out of _actions.ts so
 * the core-loop file stays focused.
 *
 * SECURITY / INTEGRITY (Spec §5.5, §7):
 *   - userId is ALWAYS from the authenticated session — never from arguments.
 *   - The drill set is a GRADED ARTIFACT: generateDrills writes interview_drills
 *     via the service role, and the scenarios are validated to REAL published
 *     slugs by drill-logic.parseDrills — a learner can never inflate their plan or
 *     be sent to a scenario that does not exist.
 *   - Schedule / reminders / stories are OWN-ROW user writes through the RLS user
 *     client (user_id = auth.uid()); a learner can only ever write their own rows.
 *   - Every enum is validated against the schema CHECK constraints before write.
 *   - No fabricated data: seedTaperFromProfile is a no-op without a real
 *     target_date, and generateDrills refuses to run before a real verdict exists.
 */

const DRILL_PLANNER_MAX_TOKENS = 700
const MAX_TEXT = 2000

// ── Result types (discriminated) ─────────────────────────────────────────────

export type GenerateDrillsResult =
  | { ok: true; drillIds: string[] }
  | { ok: false; reason: string }

export type MutateResult = { ok: true; id: string } | { ok: false; reason: string }
export type SimpleResult = { ok: true } | { ok: false; reason: string }
export type SeedTaperResult = { ok: true; seeded: number } | { ok: false; reason: string }

// ── Enums (mirror the 0115 migration CHECK constraints) ──────────────────────

const SESSION_TYPES = ['hard_rep', 'dress_rehearsal', 'light', 'taper', 'go_time'] as const
type SessionType = (typeof SESSION_TYPES)[number]

const SCHEDULE_STATUS = ['planned', 'done'] as const
type ScheduleStatus = (typeof SCHEDULE_STATUS)[number]

const TRACKS = ['coding', 'system_design', 'behavioral', 'negotiation'] as const
type Track = (typeof TRACKS)[number]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isSessionType(v: unknown): v is SessionType {
  return typeof v === 'string' && (SESSION_TYPES as readonly string[]).includes(v)
}
function isTrack(v: unknown): v is Track {
  return typeof v === 'string' && (TRACKS as readonly string[]).includes(v)
}
function cleanStr(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}
function cleanInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

// ── generateDrills ───────────────────────────────────────────────────────────

type VerdictRow = {
  id: string
  score: number
  verdict: string
  summary_sentence: string | null
  dims: unknown
}
type ScenarioRow = { id: string; slug: string; title: string; track: string; trains: string[] | null }
type ReadinessRow = { dimension_slug: string; score: number; bar_status: string | null }

/**
 * Plan the next three drills from a graded session's verdict + readiness, and
 * persist them as interview_drills (service role — a graded artifact).
 *
 * Flow: verify ownership → require a real verdict → idempotent (reuse existing
 * drills for this verdict) → compute weakest dims from the six readiness rows →
 * load published scenarios → deepSeekChat + parseDrills (disposes hallucinated
 * slugs, back-fills to exactly three real cap-first scenarios) → insert.
 */
export async function generateDrills(sessionId: string): Promise<GenerateDrillsResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }
    const userId = user.id

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return { ok: false, reason: 'session_required' }
    }

    // Ownership via own-row RLS read.
    const { data: session } = await sb
      .from('interview_sessions')
      .select('id, user_id, level')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session || session.user_id !== userId) return { ok: false, reason: 'forbidden' }

    const admin = supabaseAdmin()

    // The verdict is the plan's input — refuse before a real grade exists.
    const { data: verdict } = await admin
      .from('interview_verdicts')
      .select('id, score, verdict, summary_sentence, dims')
      .eq('session_id', sessionId)
      .maybeSingle<VerdictRow>()
    if (!verdict) return { ok: false, reason: 'not_graded' }

    // Idempotent: never duplicate drills for a verdict already planned.
    const { data: existing } = await admin
      .from('interview_drills')
      .select('id')
      .eq('verdict_id', verdict.id)
    if (Array.isArray(existing) && existing.length > 0) {
      return { ok: true, drillIds: existing.map((r) => r.id as string) }
    }

    // Honest degrade: no key ⇒ no plan (never a fabricated drill set).
    if (!process.env.DEEPSEEK_API_KEY?.trim()) {
      return { ok: false, reason: 'planner_unavailable' }
    }

    // Weakest dims (weakest first) from the six readiness rows; fall back to the
    // verdict dims when readiness has not been written yet.
    const { data: readinessRows } = await sb
      .from('interview_readiness')
      .select('dimension_slug, score, bar_status')
      .eq('user_id', userId)
    const weakestDims = computeWeakestDims(readinessRows as ReadinessRow[] | null, verdict.dims)

    // Real, published scenarios — the ONLY slugs a drill may map to.
    const { data: scenarioRows } = await sb
      .from('interview_scenarios')
      .select('id, slug, title, track, trains')
      .eq('status', 'published')
    const scenarios: ScenarioRow[] = Array.isArray(scenarioRows) ? (scenarioRows as ScenarioRow[]) : []
    if (scenarios.length === 0) return { ok: false, reason: 'no_scenarios' }

    const slugToId = new Map<string, string>()
    const available: AvailableScenario[] = scenarios.map((s) => {
      slugToId.set(s.slug, s.id)
      return { slug: s.slug, title: s.title, track: s.track, trains: Array.isArray(s.trains) ? s.trains : [] }
    })

    // Plan (temp 0, JSON out). parseDrills disposes the model's proposal into
    // exactly three REAL cap-first drills.
    let drills
    try {
      const result = await deepSeekChat({
        messages: buildDrillPlanMessages({
          verdict: { score: verdict.score, verdict: verdict.verdict, summary_sentence: verdict.summary_sentence },
          weakestDims,
          availableScenarios: available,
        }),
        temperature: 0,
        maxTokens: DRILL_PLANNER_MAX_TOKENS,
      })
      drills = parseDrills(result.content, { availableScenarios: available, weakestDims })
    } catch (err) {
      console.error('[academy/interview/_actions-plan] drill plan failed', err)
      return { ok: false, reason: 'plan_failed' }
    }
    if (drills.length === 0) return { ok: false, reason: 'plan_empty' }

    // Insert the drills via the service role (graded artifact, no client path).
    const rows = drills.map((d) => ({
      user_id: userId,
      verdict_id: verdict.id,
      scenario_id: slugToId.get(d.scenario_slug) ?? null,
      tag: d.tag,
      title: d.title,
      meta: d.meta,
      status: 'queued' as const,
    }))
    const { data: inserted, error } = await admin.from('interview_drills').insert(rows).select('id')
    if (error || !inserted) {
      console.error('[academy/interview/_actions-plan] drill insert failed', error)
      return { ok: false, reason: 'insert_failed' }
    }

    return { ok: true, drillIds: inserted.map((r) => r.id as string) }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] generateDrills threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

/** Order the six dimensions weakest-first, from readiness rows or the verdict dims. */
function computeWeakestDims(readiness: ReadinessRow[] | null, verdictDims: unknown): WeakDimension[] {
  const valid = new Set<string>(DIMENSION_SLUGS as readonly string[])
  if (Array.isArray(readiness) && readiness.length > 0) {
    return readiness
      .filter((r) => valid.has(r.dimension_slug))
      .map((r) => ({ slug: r.dimension_slug, score: r.score, bar_status: r.bar_status }))
      .sort((a, b) => a.score - b.score)
  }
  // Fallback: derive from the verdict dims blob.
  if (Array.isArray(verdictDims)) {
    return (verdictDims as Array<Record<string, unknown>>)
      .filter((d) => typeof d?.slug === 'string' && valid.has(d.slug as string))
      .map((d) => ({
        slug: d.slug as string,
        score: cleanInt(d.score) ?? 0,
        bar_status: typeof d.bar_status === 'string' ? d.bar_status : null,
      }))
      .sort((a, b) => a.score - b.score)
  }
  return []
}

// ── Schedule CRUD (own-row) ──────────────────────────────────────────────────

/** Resolve a scenario slug → id for the caller (public-read scenarios). Null on miss. */
async function resolveScenarioId(
  sb: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  scenarioSlug: unknown,
): Promise<string | null> {
  const slug = cleanStr(scenarioSlug, 200)
  if (!slug) return null
  const { data } = await sb
    .from('interview_scenarios')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data?.id ?? null
}

export async function saveScheduleSlot(input: {
  slot_date: string
  slot_time?: string
  track?: string
  session_type: string
  what?: string
  est_minutes?: number
  scenario_slug?: string
}): Promise<MutateResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }

    if (typeof input?.slot_date !== 'string' || !DATE_RE.test(input.slot_date)) {
      return { ok: false, reason: 'invalid_slot_date' }
    }
    if (!isSessionType(input?.session_type)) return { ok: false, reason: 'invalid_session_type' }
    if (input.track != null && !isTrack(input.track)) return { ok: false, reason: 'invalid_track' }

    const scenarioId = input.scenario_slug ? await resolveScenarioId(sb, input.scenario_slug) : null

    const { data: inserted, error } = await sb
      .from('interview_schedule')
      .insert({
        user_id: user.id,
        slot_date: input.slot_date,
        slot_time: cleanStr(input.slot_time, 40),
        track: isTrack(input.track) ? input.track : null,
        session_type: input.session_type,
        what: cleanStr(input.what),
        est_minutes: cleanInt(input.est_minutes),
        scenario_id: scenarioId,
        status: 'planned',
      })
      .select('id')
      .maybeSingle()
    if (error || !inserted) {
      console.error('[academy/interview/_actions-plan] saveScheduleSlot failed', error)
      return { ok: false, reason: 'insert_failed' }
    }
    return { ok: true, id: inserted.id as string }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] saveScheduleSlot threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

export async function updateScheduleSlot(
  id: string,
  patch: {
    slot_date?: string
    slot_time?: string
    track?: string
    session_type?: string
    what?: string
    est_minutes?: number
    status?: string
    scenario_slug?: string
  },
): Promise<SimpleResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }
    if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'id_required' }

    const update: Record<string, unknown> = {}
    if (patch?.slot_date !== undefined) {
      if (!DATE_RE.test(String(patch.slot_date))) return { ok: false, reason: 'invalid_slot_date' }
      update.slot_date = patch.slot_date
    }
    if (patch?.session_type !== undefined) {
      if (!isSessionType(patch.session_type)) return { ok: false, reason: 'invalid_session_type' }
      update.session_type = patch.session_type
    }
    if (patch?.track !== undefined) {
      if (patch.track !== null && !isTrack(patch.track)) return { ok: false, reason: 'invalid_track' }
      update.track = isTrack(patch.track) ? patch.track : null
    }
    if (patch?.status !== undefined) {
      if (!(SCHEDULE_STATUS as readonly string[]).includes(String(patch.status))) {
        return { ok: false, reason: 'invalid_status' }
      }
      update.status = patch.status as ScheduleStatus
    }
    if (patch?.slot_time !== undefined) update.slot_time = cleanStr(patch.slot_time, 40)
    if (patch?.what !== undefined) update.what = cleanStr(patch.what)
    if (patch?.est_minutes !== undefined) update.est_minutes = cleanInt(patch.est_minutes)
    if (patch?.scenario_slug !== undefined) update.scenario_id = await resolveScenarioId(sb, patch.scenario_slug)

    if (Object.keys(update).length === 0) return { ok: false, reason: 'nothing_to_update' }

    // Own-row update: RLS + the explicit user_id filter both scope to the caller.
    const { error } = await sb
      .from('interview_schedule')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[academy/interview/_actions-plan] updateScheduleSlot failed', error)
      return { ok: false, reason: 'update_failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] updateScheduleSlot threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

export async function deleteScheduleSlot(id: string): Promise<SimpleResult> {
  return deleteOwnRow('interview_schedule', id)
}

// ── Reminders (own-row upsert) ───────────────────────────────────────────────

/**
 * Enable/disable a reminder by label — a manual upsert keyed on (user_id, label)
 * since the table has no unique constraint there. Same label ⇒ update in place.
 */
export async function toggleReminder(input: {
  label: string
  kind?: string
  enabled: boolean
  fire_at?: string
}): Promise<MutateResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }

    const label = cleanStr(input?.label, 200)
    if (!label) return { ok: false, reason: 'label_required' }
    if (typeof input?.enabled !== 'boolean') return { ok: false, reason: 'enabled_required' }
    const fireAt = cleanStr(input?.fire_at, 60)
    const kind = cleanStr(input?.kind, 60)

    const { data: existing } = await sb
      .from('interview_reminders')
      .select('id')
      .eq('user_id', user.id)
      .eq('label', label)
      .maybeSingle()

    if (existing?.id) {
      const upd: Record<string, unknown> = { enabled: input.enabled }
      if (kind !== null) upd.kind = kind
      if (fireAt !== null) upd.fire_at = fireAt
      const { error } = await sb
        .from('interview_reminders')
        .update(upd)
        .eq('id', existing.id)
        .eq('user_id', user.id)
      if (error) return { ok: false, reason: 'update_failed' }
      return { ok: true, id: existing.id as string }
    }

    const { data: inserted, error } = await sb
      .from('interview_reminders')
      .insert({ user_id: user.id, label, kind, enabled: input.enabled, fire_at: fireAt })
      .select('id')
      .maybeSingle()
    if (error || !inserted) {
      console.error('[academy/interview/_actions-plan] toggleReminder failed', error)
      return { ok: false, reason: 'insert_failed' }
    }
    return { ok: true, id: inserted.id as string }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] toggleReminder threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

export async function setReminderEnabled(id: string, enabled: boolean): Promise<SimpleResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }
    if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'id_required' }
    if (typeof enabled !== 'boolean') return { ok: false, reason: 'enabled_required' }

    const { error } = await sb
      .from('interview_reminders')
      .update({ enabled })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { ok: false, reason: 'update_failed' }
    return { ok: true }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] setReminderEnabled threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

// ── Stories (own-row upsert) ─────────────────────────────────────────────────

type StarInput = { situation?: unknown; task?: unknown; action?: unknown; result?: unknown }

/** Coerce the STAR blob into four capped strings (no injection risk — never feeds AI in Phase 2). */
function cleanStar(star: unknown): { situation: string; task: string; action: string; result: string } {
  const s = (star && typeof star === 'object' ? star : {}) as StarInput
  return {
    situation: cleanStr(s.situation) ?? '',
    task: cleanStr(s.task) ?? '',
    action: cleanStr(s.action) ?? '',
    result: cleanStr(s.result) ?? '',
  }
}

/**
 * Upsert one STAR story for a signal (manual upsert on (user_id, signal) — one
 * story per coverage signal). New stories default to grade 'gap' until assessed;
 * updates preserve the prior grade (never auto-promote to a fabricated 'lands').
 */
export async function saveStory(input: {
  signal: string
  title?: string
  star: StarInput
}): Promise<MutateResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }

    const signal = cleanStr(input?.signal, 60)
    if (!signal) return { ok: false, reason: 'signal_required' }
    const title = cleanStr(input?.title, 200)
    const star = cleanStar(input?.star)
    const nowIso = new Date().toISOString()

    const { data: existing } = await sb
      .from('interview_stories')
      .select('id')
      .eq('user_id', user.id)
      .eq('signal', signal)
      .maybeSingle()

    if (existing?.id) {
      // Preserve the existing grade — grading is a separate, honest concern.
      const { error } = await sb
        .from('interview_stories')
        .update({ title, star, updated_at: nowIso })
        .eq('id', existing.id)
        .eq('user_id', user.id)
      if (error) return { ok: false, reason: 'update_failed' }
      return { ok: true, id: existing.id as string }
    }

    const { data: inserted, error } = await sb
      .from('interview_stories')
      .insert({ user_id: user.id, signal, title, star, grade: 'gap', updated_at: nowIso })
      .select('id')
      .maybeSingle()
    if (error || !inserted) {
      console.error('[academy/interview/_actions-plan] saveStory failed', error)
      return { ok: false, reason: 'insert_failed' }
    }
    return { ok: true, id: inserted.id as string }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] saveStory threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

export async function deleteStory(id: string): Promise<SimpleResult> {
  return deleteOwnRow('interview_stories', id)
}

// ── seedTaperFromProfile (pure date math, no AI) ─────────────────────────────

/** The taper toward the interview day, as day-offsets from the target date. */
const TAPER_PLAN: ReadonlyArray<{ offsetDays: number; session_type: SessionType; what: string; est_minutes: number }> = [
  { offsetDays: -7, session_type: 'hard_rep', what: 'Hard rep — full mock at your weakest track', est_minutes: 45 },
  { offsetDays: -3, session_type: 'light', what: 'Light rep — one focused drill on the cap', est_minutes: 25 },
  { offsetDays: -1, session_type: 'taper', what: 'Taper — reread debriefs, no new material', est_minutes: 15 },
  { offsetDays: 0, session_type: 'go_time', what: 'Go time — interview day', est_minutes: 0 },
]

/** Add `days` to an ISO date (YYYY-MM-DD), returning an ISO date. UTC-noon safe. */
function isoDateAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Deterministically seed a taper plan from the profile's target_date. Honest:
 * no target_date ⇒ no-op; existing schedule rows ⇒ no-op (never clobber). Only
 * future/today slots are written (never schedules a rep in the past).
 */
export async function seedTaperFromProfile(): Promise<SeedTaperResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }

    const { data: profile } = await sb
      .from('interview_profiles')
      .select('target_date')
      .eq('user_id', user.id)
      .maybeSingle()
    const targetDate = profile?.target_date
    if (typeof targetDate !== 'string' || !DATE_RE.test(targetDate)) {
      return { ok: true, seeded: 0 } // honest no-op: nothing to taper toward
    }

    // Do not clobber an existing plan.
    const { data: existing } = await sb
      .from('interview_schedule')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (Array.isArray(existing) && existing.length > 0) return { ok: true, seeded: 0 }

    const today = todayIso()
    const rows = TAPER_PLAN.map((p) => ({
      user_id: user.id,
      slot_date: isoDateAddDays(targetDate, p.offsetDays),
      session_type: p.session_type,
      what: p.what,
      est_minutes: p.est_minutes,
      status: 'planned' as const,
    })).filter((r) => r.slot_date >= today) // never schedule in the past

    if (rows.length === 0) return { ok: true, seeded: 0 }

    const { data: inserted, error } = await sb.from('interview_schedule').insert(rows).select('id')
    if (error) {
      console.error('[academy/interview/_actions-plan] seedTaperFromProfile failed', error)
      return { ok: false, reason: 'insert_failed' }
    }
    return { ok: true, seeded: Array.isArray(inserted) ? inserted.length : 0 }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] seedTaperFromProfile threw', err)
    return { ok: false, reason: 'server_error' }
  }
}

// ── shared own-row delete ────────────────────────────────────────────────────

async function deleteOwnRow(
  table: 'interview_schedule' | 'interview_stories',
  id: string,
): Promise<SimpleResult> {
  try {
    const sb = await createSupabaseServerClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return { ok: false, reason: 'unauthorized' }
    if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'id_required' }

    const { error } = await sb.from(table).delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      console.error(`[academy/interview/_actions-plan] delete ${table} failed`, error)
      return { ok: false, reason: 'delete_failed' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[academy/interview/_actions-plan] deleteOwnRow threw', err)
    return { ok: false, reason: 'server_error' }
  }
}
