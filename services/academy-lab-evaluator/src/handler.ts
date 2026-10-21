import {
  EVALUATOR_LIMITS,
  EVALUATOR_VERSION,
  evaluatorPolicyHash,
  type EvaluationRequest,
  type EvaluationResponse,
} from '../../../lib/academy/lab-evaluator/contract'
import {
  InMemoryReplayGuard,
  signEvaluatorResponse,
  verifyEvaluatorRequest,
  type SignedEnvelope,
} from '../../../lib/academy/lab-evaluator/signing'

export type EvaluatorHttpRequest = { method: string; path: string; body: string }
export type EvaluatorHttpResponse = { status: number; headers: Record<string, string>; body: string }

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
})

function json(status: number, body: unknown): EvaluatorHttpResponse {
  return { status, headers: { ...JSON_HEADERS }, body: JSON.stringify(body) }
}

export class ConcurrencyGate {
  private active = 0

  constructor(private readonly limit: number = EVALUATOR_LIMITS.maxConcurrency) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('invalid evaluator concurrency limit')
  }

  tryAcquire(): (() => void) | null {
    if (this.active >= this.limit) return null
    this.active += 1
    let released = false
    return () => {
      if (released) return
      released = true
      this.active -= 1
    }
  }
}

export function createEvaluatorHttpHandler(deps: {
  secret: string
  evaluate: (request: EvaluationRequest) => Promise<EvaluationResponse>
  now?: () => number
  newId?: () => string
  replay?: InMemoryReplayGuard
  gate?: ConcurrencyGate
}) {
  const now = deps.now ?? Date.now
  const newId = deps.newId ?? crypto.randomUUID
  const replay = deps.replay ?? new InMemoryReplayGuard()
  const gate = deps.gate ?? new ConcurrencyGate()

  return async (request: EvaluatorHttpRequest): Promise<EvaluatorHttpResponse> => {
    if (request.path !== '/v1/evaluate') return json(404, { error: 'not_found' })
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
    if (Buffer.byteLength(request.body, 'utf8') > EVALUATOR_LIMITS.requestBytes) {
      return json(413, { error: 'request_too_large' })
    }

    let verifiedRequest: EvaluationRequest
    try {
      const envelope = JSON.parse(request.body) as SignedEnvelope<unknown>
      verifiedRequest = verifyEvaluatorRequest(envelope, deps.secret, { now: now(), replay })
    } catch {
      return json(401, { error: 'unauthorized' })
    }

    const release = gate.tryAcquire()
    if (!release) return json(429, { error: 'busy' })
    try {
      let result: EvaluationResponse
      try {
        result = await deps.evaluate(verifiedRequest)
      } catch {
        result = {
          schemaVersion: 2,
          evaluationId: newId(),
          requestId: verifiedRequest.requestId,
          issuedAt: now(),
          labKey: verifiedRequest.labKey,
          submissionDigest: verifiedRequest.submissionDigest,
          evaluatorVersion: EVALUATOR_VERSION,
          policyHash: evaluatorPolicyHash(),
          specRevision: null,
          specDigest: null,
          runtimeImage: null,
          verdict: 'error',
          reason: 'evaluator_unavailable',
          tests: { passed: 0, total: 0 },
          resourceUsage: { durationMs: 0, outputBytes: 0 },
        }
      }
      return json(200, signEvaluatorResponse(result, deps.secret))
    } finally {
      release()
    }
  }
}
