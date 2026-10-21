import { EVALUATOR_LIMITS, type EvaluationResponse } from './contract'
import { buildEvaluationRequest } from './client-core'
import {
  signEvaluatorRequest,
  verifyEvaluatorResponse,
  type SignedEnvelope,
  type TrustedLabEvaluation,
} from './signing'

export type EvaluatorClientConfig = {
  url: string
  secret: string
  fetch?: typeof fetch
  now?: () => number
  newId?: () => string
  timeoutMs?: number
}

function evaluatorEndpoint(rawUrl: string): URL {
  const url = new URL(rawUrl)
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('remote academy evaluator URL must use HTTPS')
  }
  if (url.username || url.password) throw new Error('academy evaluator URL must not contain credentials')
  url.pathname = '/v1/evaluate'
  url.search = ''
  url.hash = ''
  return url
}

export async function requestControlledEvaluation(
  input: { courseSlug: string; lessonSlug: string; code: string },
  config: EvaluatorClientConfig,
): Promise<TrustedLabEvaluation | null> {
  const endpoint = evaluatorEndpoint(config.url)
  const now = config.now ?? Date.now
  const request = buildEvaluationRequest({
    ...input,
    requestId: (config.newId ?? crypto.randomUUID)(),
    issuedAt: now(),
  })
  const envelope = signEvaluatorRequest(request, config.secret)
  const body = JSON.stringify(envelope)
  if (Buffer.byteLength(body, 'utf8') > EVALUATOR_LIMITS.requestBytes) throw new Error('signed evaluator request exceeds byte limit')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? EVALUATOR_LIMITS.wallTimeMs + 2_000)
  timeout.unref()
  try {
    const response = await (config.fetch ?? fetch)(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const raw = Buffer.from(await response.arrayBuffer())
    if (raw.byteLength > EVALUATOR_LIMITS.requestBytes) return null
    const signedResponse = JSON.parse(raw.toString('utf8')) as SignedEnvelope<EvaluationResponse>
    return verifyEvaluatorResponse(signedResponse, config.secret, request, { now: now() })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
