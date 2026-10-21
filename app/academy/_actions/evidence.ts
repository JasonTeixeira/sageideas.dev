'use server'

import { headers } from 'next/headers'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'
import {
  recordEvidenceEvent,
  recordNonLabArtifactEvidence,
} from '@/lib/academy/evidence-events'
import type { EvidenceEventType } from '@/lib/academy/evidence-events-logic'
import type { LessonBlock } from '@/data/academy/sample-course'
import { deriveRequirements, gradeArtifact } from '@/lib/academy/artifact-logic'
import { checkRateLimitFromHeaders } from '@/lib/rate-limit'
import { decideLabSubmissionOutcome } from '@/lib/academy/lab-evaluator/application'
import { evaluateLabOnControlledService } from '@/lib/academy/lab-evaluator/client-server'
import { persistTrustedLabEvaluation } from '@/lib/academy/lab-evaluator/persistence-server'
import {
  FLAGSHIP_ACTIVATION_RELEASE_ID,
  activationAttestationAllowsMastery,
  flagshipLabSpecDigest,
  flagshipLabSpecRevision,
  isFlagshipLabCandidate,
  masteryPersistenceEnabled,
} from '@/lib/academy/lab-evaluator/activation'

/**
 * Learner-triggered evidence events from the sprint sections (Tier-2 Slice 2).
 *
 * @security Only the events a learner genuinely performs by interacting with a
 * sprint section may be emitted from the client:
 *   - diagnostic_completed / retrieval_attempted → the pretest reveal (recall-first)
 *   - transfer_attempted → engaging the transfer section
 * `lab_verified` and the lab's `sprint_artifact_created` come only from the
 * controlled evaluator persistence path, and grader/admin events (explainBackGraded,
 * externalOutcome, …) must NEVER be client-triggered — they would forge mastery.
 * userId is taken from the authenticated session (never from the client) and the
 * payload is built server-side (empty), per the recordEvidenceEvent caller contract.
 */
const LEARNER_ALLOWED: readonly EvidenceEventType[] = [
  'diagnostic_completed',
  'retrieval_attempted',
  'transfer_attempted',
]

export async function recordSprintEvidence(
  courseSlug: string,
  lessonSlug: string,
  eventType: string,
): Promise<{ ok: boolean }> {
  const sb = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { ok: false }

  // Allowlist: reject anything that isn't a genuine learner-performed action.
  if (!LEARNER_ALLOWED.includes(eventType as EvidenceEventType)) return { ok: false }

  // Best-effort, never throw to the client. userId is server-derived; payload
  // is server-built (empty); unitId = lessonSlug (one lesson = one unit).
  try {
    await recordEvidenceEvent({
      userId: user.id,
      courseSlug,
      lessonSlug,
      unitId: lessonSlug,
      type: eventType as EvidenceEventType,
      payload: {},
    })
    return { ok: true }
  } catch (err) {
    console.error('[academy/evidence] recordSprintEvidence failed', err)
    return { ok: false }
  }
}

/**
 * Submit learner code to the separately controlled evaluator. Browser stdout is
 * never accepted as proof. Only a fresh HMAC-authenticated response bound to this
 * exact code digest can reach the atomic mastery persistence function.
 */
export async function verifyLab(
  courseSlug: string,
  lessonSlug: string,
  code: string,
): Promise<{
  ok: boolean
  verified: boolean
  trustStatus: 'controlled_evaluator' | 'practice_only'
  reason: string
}> {
  const sb = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { ok: false, verified: false, trustStatus: 'practice_only', reason: 'authentication_required' }

  try {
    const rateLimit = await checkRateLimitFromHeaders(await headers(), {
      limit: 10,
      windowMs: 60_000,
      prefix: 'academy-lab-evaluator',
    })
    if (!rateLimit.ok) {
      return { ok: false, verified: false, trustStatus: 'practice_only', reason: 'rate_limited' }
    }

    if (!isFlagshipLabCandidate(courseSlug, lessonSlug)) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: 'lab_not_activated' }
    }

    // Confirm the submitted slugs resolve to a published lab. The evaluator's
    // private spec—not this public lesson block—owns expected outputs and cases.
    const admin = supabaseAdmin()
    const { data: lesson } = await admin
      .from('academy_lessons')
      .select('blocks')
      .eq('course_slug', courseSlug)
      .eq('slug', lessonSlug)
      .eq('status', 'published')
      .maybeSingle()

    const blocks = (lesson?.blocks ?? []) as LessonBlock[]
    const labBlock = blocks.find((b): b is Extract<LessonBlock, { type: 'lab' }> => b.type === 'lab')
    if (!labBlock) {
      return { ok: false, verified: false, trustStatus: 'practice_only', reason: 'lab_not_found' }
    }

    const evaluation = await evaluateLabOnControlledService({ courseSlug, lessonSlug, code })
    const outcome = decideLabSubmissionOutcome(evaluation)
    if (!evaluation || !outcome.persistMastery) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: outcome.reason }
    }
    if (evaluation.specRevision !== flagshipLabSpecRevision(courseSlug, lessonSlug)) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: 'activation_spec_mismatch' }
    }
    if (evaluation.specDigest !== flagshipLabSpecDigest(courseSlug, lessonSlug)) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: 'activation_spec_mismatch' }
    }
    if (!evaluation.runtimeImage || !activationAttestationAllowsMastery(
      process.env,
      courseSlug,
      lessonSlug,
      evaluation.runtimeImage,
    )) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: 'activation_not_attested' }
    }
    if (!masteryPersistenceEnabled(process.env, FLAGSHIP_ACTIVATION_RELEASE_ID)) {
      return { ok: true, verified: false, trustStatus: 'practice_only', reason: 'mastery_writes_disabled' }
    }
    const persisted = await persistTrustedLabEvaluation({
      userId: user.id,
      courseSlug,
      lessonSlug,
      releaseId: FLAGSHIP_ACTIVATION_RELEASE_ID,
      evaluation,
    })
    if (!persisted) {
      return { ok: false, verified: false, trustStatus: 'practice_only', reason: 'evidence_persist_failed' }
    }
    return { ok: true, verified: true, trustStatus: 'controlled_evaluator', reason: outcome.reason }
  } catch (err) {
    console.error('[academy/evidence] verifyLab failed', err)
    return { ok: false, verified: false, trustStatus: 'practice_only', reason: 'evaluator_unavailable' }
  }
}

/**
 * Server-side ARTIFACT verification — the anti-cheat write of record for a produced
 * sprint-contract deliverable (the non-code analog of verifyLab, for judgment/design/
 * leadership lessons that have no runnable lab).
 *
 * @security The requirements are re-derived HERE from the lesson's own `sprint-contract.proof`
 * spec (server-held content) and the submitted draft is graded server-side — the client cannot
 * forge `sprint_artifact_created` by passing a flag. userId is server-derived; payload is empty.
 * The draft text itself is never stored (privacy); only the earned evidence fact is recorded.
 */
export async function verifyArtifact(
  courseSlug: string,
  lessonSlug: string,
  draft: string,
): Promise<{ ok: boolean; verified: boolean; results: { label: string; met: boolean }[] }> {
  const sb = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return { ok: false, verified: false, results: [] }

  try {
    const admin = supabaseAdmin()
    const { data: lesson } = await admin
      .from('academy_lessons')
      .select('blocks')
      .eq('course_slug', courseSlug)
      .eq('slug', lessonSlug)
      .eq('status', 'published')
      .maybeSingle()

    const blocks = (lesson?.blocks ?? []) as LessonBlock[]
    const contract = blocks.find(
      (b): b is Extract<LessonBlock, { type: 'sprint-contract' }> => b.type === 'sprint-contract',
    )
    if (!contract?.proof) return { ok: true, verified: false, results: [] }

    const requirements = deriveRequirements(contract.proof)
    const grade = gradeArtifact(typeof draft === 'string' ? draft : '', requirements)

    if (grade.ok) {
      // A produced artifact that covers the contract's required elements = a real sprint
      // artifact. unitId = lessonSlug (one lesson = one unit). Never stores the draft text.
      await recordNonLabArtifactEvidence({
        userId: user.id,
        courseSlug,
        lessonSlug,
        unitId: lessonSlug,
        payload: {},
      })
    }

    return { ok: true, verified: grade.ok, results: grade.results }
  } catch (err) {
    console.error('[academy/evidence] verifyArtifact failed', err)
    return { ok: false, verified: false, results: [] }
  }
}
