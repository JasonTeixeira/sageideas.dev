import {
  buildLabKey,
  parseEvaluationRequest,
  sha256,
  type EvaluationRequest,
} from './contract'

export function buildEvaluationRequest(input: {
  courseSlug: string
  lessonSlug: string
  code: string
  requestId?: string
  issuedAt?: number
}): EvaluationRequest {
  return parseEvaluationRequest({
    schemaVersion: 1,
    requestId: input.requestId ?? crypto.randomUUID(),
    issuedAt: input.issuedAt ?? Date.now(),
    labKey: buildLabKey(input.courseSlug, input.lessonSlug),
    code: input.code,
    submissionDigest: sha256(input.code),
  })
}
