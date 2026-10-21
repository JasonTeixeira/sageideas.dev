import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  EVALUATOR_LIMITS,
  parseEvaluationRequest,
  parseEvaluationResponse,
  type EvaluationRequest,
  type EvaluationResponse,
} from './contract'

export type SignedEnvelope<T> = { payload: T; signature: string }

const trustedResponses = new WeakSet<object>()
const attestationSignatures = new WeakMap<object, string>()

export type TrustedLabEvaluation = EvaluationResponse & {
  readonly __trustedLabEvaluationBrand?: never
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const object = value as Record<string, unknown>
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`
}

function validateSecret(secret: string): void {
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('evaluator signing secret must be at least 32 bytes')
}

function signatureFor(context: 'request' | 'response', payload: unknown, secret: string): string {
  validateSecret(secret)
  return createHmac('sha256', secret).update(`academy-lab-evaluator:${context}:v1\n`).update(stableStringify(payload)).digest('hex')
}

function assertSignature(expected: string, received: unknown): void {
  if (typeof received !== 'string' || !/^[a-f0-9]{64}$/.test(received)) throw new Error('invalid evaluator signature')
  const expectedBytes = Buffer.from(expected, 'hex')
  const receivedBytes = Buffer.from(received, 'hex')
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
    throw new Error('invalid evaluator signature')
  }
}

function assertFresh(issuedAt: number, now: number): void {
  if (Math.abs(now - issuedAt) > EVALUATOR_LIMITS.signatureTtlMs) throw new Error('evaluator envelope expired')
}

export class InMemoryReplayGuard {
  private readonly seen = new Map<string, number>()

  consume(requestId: string, issuedAt: number, now: number): void {
    for (const [id, expiry] of this.seen) if (expiry < now) this.seen.delete(id)
    if (this.seen.has(requestId)) throw new Error('evaluator request replay rejected')
    this.seen.set(requestId, issuedAt + EVALUATOR_LIMITS.signatureTtlMs)
  }
}

export function signEvaluatorRequest(payload: EvaluationRequest, secret: string): SignedEnvelope<EvaluationRequest> {
  const parsed = parseEvaluationRequest(payload)
  return { payload: parsed, signature: signatureFor('request', parsed, secret) }
}

export function verifyEvaluatorRequest(
  envelope: SignedEnvelope<unknown>,
  secret: string,
  options: { now?: number; replay?: InMemoryReplayGuard } = {},
): EvaluationRequest {
  if (!envelope || typeof envelope !== 'object') throw new Error('invalid evaluator envelope')
  assertSignature(signatureFor('request', envelope.payload, secret), envelope.signature)
  const payload = parseEvaluationRequest(envelope.payload)
  const now = options.now ?? Date.now()
  assertFresh(payload.issuedAt, now)
  options.replay?.consume(payload.requestId, payload.issuedAt, now)
  return payload
}

export function signEvaluatorResponse(payload: EvaluationResponse, secret: string): SignedEnvelope<EvaluationResponse> {
  const parsed = parseEvaluationResponse(payload)
  return { payload: parsed, signature: signatureFor('response', parsed, secret) }
}

export function verifyEvaluatorResponse(
  envelope: SignedEnvelope<unknown>,
  secret: string,
  request: EvaluationRequest,
  options: { now?: number } = {},
): TrustedLabEvaluation {
  if (!envelope || typeof envelope !== 'object') throw new Error('invalid evaluator envelope')
  assertSignature(signatureFor('response', envelope.payload, secret), envelope.signature)
  const parsed = parseEvaluationResponse(envelope.payload)
  assertFresh(parsed.issuedAt, options.now ?? Date.now())
  if (parsed.requestId !== request.requestId) throw new Error('evaluator request id mismatch')
  if (parsed.labKey !== request.labKey) throw new Error('evaluator lab key mismatch')
  if (parsed.submissionDigest !== request.submissionDigest) throw new Error('evaluator submission digest mismatch')
  // Copy and freeze the authenticated values. Branding a mutable response would
  // let later in-process code change a failed verdict into a passing one while
  // retaining the WeakSet trust marker.
  const trusted = Object.freeze({
    ...parsed,
    tests: Object.freeze({ ...parsed.tests }),
    resourceUsage: Object.freeze({ ...parsed.resourceUsage }),
  }) as TrustedLabEvaluation
  trustedResponses.add(trusted)
  attestationSignatures.set(trusted, envelope.signature)
  return trusted
}

export function isTrustedLabEvaluation(value: unknown): value is TrustedLabEvaluation {
  return typeof value === 'object' && value !== null && trustedResponses.has(value)
}

export function getTrustedEvaluationAttestation(value: TrustedLabEvaluation): string | null {
  return isTrustedLabEvaluation(value) ? (attestationSignatures.get(value) ?? null) : null
}
