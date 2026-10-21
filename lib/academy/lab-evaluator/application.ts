import { authorizeMasteryEvidence } from './trust'
import type { EvaluationReason } from './contract'
import type { TrustedLabEvaluation } from './signing'

export type LabSubmissionOutcome = {
  verified: boolean
  trustStatus: 'controlled_evaluator' | 'practice_only'
  persistMastery: boolean
  reason: EvaluationReason
}

export function decideLabSubmissionOutcome(
  evaluation: TrustedLabEvaluation | null,
): LabSubmissionOutcome {
  if (!evaluation) {
    return {
      verified: false,
      trustStatus: 'practice_only',
      persistMastery: false,
      reason: 'evaluator_unavailable',
    }
  }
  const authorization = authorizeMasteryEvidence(evaluation)
  return {
    verified: authorization.allowed,
    trustStatus: authorization.allowed ? 'controlled_evaluator' : 'practice_only',
    persistMastery: authorization.allowed,
    reason: evaluation.reason,
  }
}
