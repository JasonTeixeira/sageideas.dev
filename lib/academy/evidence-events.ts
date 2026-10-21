import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/server'
import {
  deriveUnitState,
  deriveSignals,
  EVIDENCE_EVENT_TYPES,
  type EvidenceEvent,
  type EvidenceEventType,
  type EvidencePayload,
  type UnitState,
} from '@/lib/academy/evidence-events-logic'
import {
  resolveScore,
  type ContractSignals,
  type ScoreResolution,
} from '@/lib/academy/caps-logic'

/**
 * The DB layer for the enforcement spine. Writes go through the service role
 * AFTER a server-side check (the caller is responsible for verifying the event
 * really happened — the lab verified, the guide graded the explain-back). A
 * learner has no insert path (RLS), so they cannot fake an event, a state, or a
 * score. Reads + derivation reuse the pure logic in *-logic.ts.
 */

export type RecordEvidenceInput = {
  userId: string
  courseSlug: string
  lessonSlug: string
  unitId: string
  type: EvidenceEventType
  payload?: EvidencePayload
}

export type RecordNonLabArtifactEvidenceInput = Omit<RecordEvidenceInput, 'type'>

/**
 * Append one verified evidence event. Service-role only; append-only.
 *
 * @security CALLER CONTRACT — the anti-cheat guarantee lives here, not in the DB:
 *  1. `userId` MUST be sourced from the authenticated session (`auth.getUser()`),
 *     NEVER from request/route/form input. The service role bypasses RLS, so a
 *     spoofed `userId` would write to another learner's ledger (IDOR).
 *  2. `payload` MUST be constructed server-side from VERIFIED facts (the lab
 *     actually verified output; the AI guide actually graded the explain-back).
 *     NEVER forward a client-supplied payload. In particular `externalOutcome`
 *     is admin/grader-only — it lifts the final 98-cap and must never be settable
 *     by a learner-triggered flow.
 *  3. Emit the event only AFTER the underlying check passed — this is the write
 *     of record, not a request to check.
 *
 * Defense-in-depth (independent of the caller contract above):
 *  - `type` is validated against the known event-type allowlist before insert.
 *  - Grader/admin-only payload keys (externalOutcome, boardAsset, …) are STRIPPED
 *    unless `opts.trusted` is set — so even a buggy caller forwarding a client
 *    payload can't lift a cap. No flow today sets `trusted` (no real grader yet),
 *    so these keys are always stripped — which is correct.
 */

/** Payload keys that lift score caps and may only be set by a trusted grader/admin flow. */
const GRADER_ONLY_PAYLOAD_KEYS: readonly (keyof EvidencePayload)[] = [
  'externalOutcome',
  'boardAsset',
  'explainBackGraded',
  'brokenCaseHandled',
  'reviewed',
]

export async function recordEvidenceEvent(
  input: RecordEvidenceInput,
  opts?: { trusted?: boolean },
): Promise<void> {
  // `lab_verified` has a stronger authority boundary than ordinary server-built
  // events. It may only be inserted atomically with a signed evaluator receipt
  // through record_trusted_academy_lab_result (persistence-server.ts).
  if (input.type === 'lab_verified') {
    throw new Error('lab_verified requires trusted evaluator persistence')
  }
  // Lab artifacts are created by the same atomic evaluator transaction as the
  // lab_verified event. Generic callers must not be able to lift a lab unit's
  // state by writing only its artifact signal.
  if (input.type === 'sprint_artifact_created') {
    throw new Error('sprint_artifact_created requires a specialized persistence path')
  }

  await insertEvidenceEvent(input, opts)
}

/**
 * Record a server-graded text/design artifact only when the published lesson is
 * explicitly non-runnable. Lab lessons must use the evaluator's atomic receipt
 * transaction, which writes both mastery signals together.
 */
export async function recordNonLabArtifactEvidence(
  input: RecordNonLabArtifactEvidenceInput,
): Promise<void> {
  const admin = supabaseAdmin()
  const { data: lesson, error } = await admin
    .from('academy_lessons')
    .select('blocks')
    .eq('course_slug', input.courseSlug)
    .eq('slug', input.lessonSlug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw new Error(`artifact lesson validation failed: ${error.message}`)

  const blocks = Array.isArray(lesson?.blocks) ? lesson.blocks : []
  const blockTypes = new Set(
    blocks.flatMap((block) => (
      typeof block === 'object' && block !== null && typeof block.type === 'string'
        ? [block.type]
        : []
    )),
  )
  if (!blockTypes.has('sprint-contract') || blockTypes.has('lab')) {
    throw new Error('artifact evidence is restricted to published non-lab sprint contracts')
  }

  await insertEvidenceEvent({
    ...input,
    type: 'sprint_artifact_created',
  })
}

async function insertEvidenceEvent(
  input: RecordEvidenceInput,
  opts?: { trusted?: boolean },
): Promise<void> {
  // Allowlist the event type — never insert an unknown/forged type.
  if (!EVIDENCE_EVENT_TYPES.includes(input.type)) {
    throw new Error(`evidence insert rejected: unknown event type "${input.type}"`)
  }

  // Strip grader-only payload keys unless an explicit trusted flag is set. Keeps
  // legitimately server-set keys (e.g. spacingScheduled) intact.
  let payload: EvidencePayload = input.payload ?? {}
  if (!opts?.trusted) {
    const sanitized: EvidencePayload = { ...payload }
    for (const key of GRADER_ONLY_PAYLOAD_KEYS) delete sanitized[key]
    payload = sanitized
  }

  const admin = supabaseAdmin()
  const { error } = await admin.from('academy_evidence_events').insert({
    user_id: input.userId,
    course_slug: input.courseSlug,
    lesson_slug: input.lessonSlug,
    unit_id: input.unitId,
    event_type: input.type,
    payload,
  })
  if (error) throw new Error(`evidence insert failed: ${error.message}`)
}

/** Raw events for one unit, oldest first (the order state derivation expects). */
export async function getUnitEvents(
  userId: string,
  courseSlug: string,
  lessonSlug: string,
  unitId: string,
): Promise<EvidenceEvent[]> {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('academy_evidence_events')
    .select('event_type, payload, created_at')
    .eq('user_id', userId)
    .eq('course_slug', courseSlug)
    .eq('lesson_slug', lessonSlug)
    .eq('unit_id', unitId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`evidence read failed: ${error.message}`)
  return (data ?? []).map((r) => ({
    type: r.event_type as EvidenceEventType,
    payload: (r.payload ?? {}) as EvidencePayload,
    at: r.created_at as string,
  }))
}

/** The unit's current state — always a pure function of its evidence. */
export async function getUnitState(
  userId: string,
  courseSlug: string,
  lessonSlug: string,
  unitId: string,
  prerequisitesMet: boolean,
): Promise<UnitState> {
  const events = await getUnitEvents(userId, courseSlug, lessonSlug, unitId)
  return deriveUnitState({ prerequisitesMet, events })
}

/** The unit's resolved score (min of all binding caps) for the score-cap UI. */
export async function getUnitScore(
  userId: string,
  courseSlug: string,
  lessonSlug: string,
  unitId: string,
  contract: ContractSignals,
): Promise<ScoreResolution> {
  const events = await getUnitEvents(userId, courseSlug, lessonSlug, unitId)
  return resolveScore(deriveSignals(events), contract)
}
