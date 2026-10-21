import { buildLabKey } from './contract'
import {
  getTrustedEvaluationAttestation,
  type TrustedLabEvaluation,
} from './signing'
import { authorizeMasteryEvidence } from './trust'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RELEASE_ID_RE = /^[a-z0-9][a-z0-9._-]{2,95}$/

export type TrustedLabPersistenceCommand = {
  rpc: 'record_trusted_academy_lab_result'
  args: {
    p_user_id: string
    p_release_id: string
    p_course_slug: string
    p_lesson_slug: string
    p_lab_key: string
    p_evaluation_id: string
    p_submission_digest: string
    p_evaluator_version: string
    p_policy_hash: string
    p_spec_revision: string
    p_spec_digest: string
    p_runtime_image: string
    p_attestation_signature: string
    p_verdict: 'passed'
    p_reason: 'all_private_cases_passed'
    p_tests_passed: number
    p_tests_total: number
    p_duration_ms: number
    p_output_bytes: number
  }
}

export function buildTrustedLabPersistence(input: {
  userId: string
  courseSlug: string
  lessonSlug: string
  releaseId: string
  evaluation: TrustedLabEvaluation
}): TrustedLabPersistenceCommand | null {
  if (!UUID_RE.test(input.userId)) throw new Error('invalid authenticated user id')
  if (!RELEASE_ID_RE.test(input.releaseId)) throw new Error('invalid activation release id')
  const labKey = buildLabKey(input.courseSlug, input.lessonSlug)
  if (input.evaluation.labKey !== labKey) throw new Error('trusted evaluation lab key mismatch')
  const authorization = authorizeMasteryEvidence(input.evaluation)
  const signature = getTrustedEvaluationAttestation(input.evaluation)
  if (
    !authorization.allowed ||
    !signature ||
    !input.evaluation.specRevision ||
    !input.evaluation.specDigest ||
    !input.evaluation.runtimeImage
  ) return null
  return {
    rpc: 'record_trusted_academy_lab_result',
    args: {
      p_user_id: input.userId,
      p_release_id: input.releaseId,
      p_course_slug: input.courseSlug,
      p_lesson_slug: input.lessonSlug,
      p_lab_key: labKey,
      p_evaluation_id: input.evaluation.evaluationId,
      p_submission_digest: input.evaluation.submissionDigest,
      p_evaluator_version: input.evaluation.evaluatorVersion,
      p_policy_hash: input.evaluation.policyHash,
      p_spec_revision: input.evaluation.specRevision,
      p_spec_digest: input.evaluation.specDigest,
      p_runtime_image: input.evaluation.runtimeImage,
      p_attestation_signature: signature,
      p_verdict: 'passed',
      p_reason: 'all_private_cases_passed',
      p_tests_passed: input.evaluation.tests.passed,
      p_tests_total: input.evaluation.tests.total,
      p_duration_ms: input.evaluation.resourceUsage.durationMs,
      p_output_bytes: input.evaluation.resourceUsage.outputBytes,
    },
  }
}
