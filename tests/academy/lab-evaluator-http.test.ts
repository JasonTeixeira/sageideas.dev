import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { EVALUATOR_LIMITS, EVALUATOR_VERSION, evaluatorPolicyHash, type EvaluationRequest } from '../../lib/academy/lab-evaluator/contract'
import { requestControlledEvaluation } from '../../lib/academy/lab-evaluator/client'
import { signEvaluatorRequest, signEvaluatorResponse, verifyEvaluatorResponse } from '../../lib/academy/lab-evaluator/signing'
import { ConcurrencyGate, createEvaluatorHttpHandler } from '../../services/academy-lab-evaluator/src/handler'

const SECRET = 'test-only-secret-that-is-at-least-thirty-two-bytes'
const NOW = 1_788_194_400_000
const REQUEST_ID = '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20'
const EVALUATION_ID = '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21'

function request(): EvaluationRequest {
  return {
    schemaVersion: 1,
    requestId: REQUEST_ID,
    issuedAt: NOW,
    labKey: 'python-basics/variables',
    code: 'print(42)',
    submissionDigest: 'c2d6e9060cbe8dee44279258cc8677d7a20ec16eeeccfedd09b840283efd3685',
  }
}

function passedResponse(input: EvaluationRequest) {
  return {
    schemaVersion: 2 as const,
    evaluationId: EVALUATION_ID,
    requestId: input.requestId,
    issuedAt: NOW,
    labKey: input.labKey,
    submissionDigest: input.submissionDigest,
    evaluatorVersion: EVALUATOR_VERSION,
    policyHash: evaluatorPolicyHash(),
    specRevision: '2026-08-27.1',
    specDigest: 'b'.repeat(64),
    runtimeImage: `registry.example.com/sage/python@sha256:${'a'.repeat(64)}`,
    verdict: 'passed' as const,
    reason: 'all_private_cases_passed' as const,
    tests: { passed: 2, total: 2 },
    resourceUsage: { durationMs: 75, outputBytes: 6 },
  }
}

describe('academy evaluator authenticated HTTP boundary', () => {
  it('accepts a signed fresh request and returns a signed aggregate response', async () => {
    const handler = createEvaluatorHttpHandler({
      secret: SECRET,
      now: () => NOW,
      evaluate: async (input: EvaluationRequest) => passedResponse(input),
    })
    const response = await handler({
      method: 'POST',
      path: '/v1/evaluate',
      body: JSON.stringify(signEvaluatorRequest(request(), SECRET)),
    })
    assert.equal(response.status, 200)
    const envelope = JSON.parse(response.body)
    assert.equal(verifyEvaluatorResponse(envelope, SECRET, request(), { now: NOW }).verdict, 'passed')
    assert.equal(response.headers['cache-control'], 'no-store')
  })

  it('returns generic errors for tampering and rejects oversized bodies before parsing', async () => {
    const handler = createEvaluatorHttpHandler({
      secret: SECRET,
      now: () => NOW,
      evaluate: async (input: EvaluationRequest) => passedResponse(input),
    })
    const signed = signEvaluatorRequest(request(), SECRET)
    const tampered = await handler({
      method: 'POST', path: '/v1/evaluate',
      body: JSON.stringify({ ...signed, payload: { ...signed.payload, code: 'print(0)' } }),
    })
    assert.equal(tampered.status, 401)
    assert.equal(tampered.body.includes('signature'), false)
    assert.equal(tampered.body.includes('print'), false)

    const oversized = await handler({
      method: 'POST', path: '/v1/evaluate', body: 'x'.repeat(EVALUATOR_LIMITS.requestBytes + 1),
    })
    assert.equal(oversized.status, 413)
  })

  it('rejects excess concurrent evaluations without queueing unbounded work', async () => {
    const gate = new ConcurrencyGate(1)
    let release: (() => void) | undefined
    const wait = new Promise<void>((resolve) => { release = resolve })
    const handler = createEvaluatorHttpHandler({
      secret: SECRET,
      now: () => NOW,
      gate,
      evaluate: async (input: EvaluationRequest) => { await wait; return passedResponse(input) },
    })
    const first = handler({ method: 'POST', path: '/v1/evaluate', body: JSON.stringify(signEvaluatorRequest(request(), SECRET)) })
    await Promise.resolve()
    const secondRequest = { ...request(), requestId: EVALUATION_ID }
    const second = await handler({
      method: 'POST', path: '/v1/evaluate', body: JSON.stringify(signEvaluatorRequest(secondRequest, SECRET)),
    })
    assert.equal(second.status, 429)
    release?.()
    assert.equal((await first).status, 200)
  })

  it('has the Next server send signed code to an HTTPS evaluator and verify its response', async () => {
    let observedUrl = ''
    let observedInit: RequestInit | undefined
    const trusted = await requestControlledEvaluation({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'print(42)',
    }, {
      url: 'https://evaluator.internal.example',
      secret: SECRET,
      now: () => NOW,
      newId: () => REQUEST_ID,
      fetch: async (url: string | URL | Request, init?: RequestInit) => {
        observedUrl = String(url)
        observedInit = init
        const signedRequest = JSON.parse(String(init?.body))
        const response = passedResponse(signedRequest.payload)
        return new Response(JSON.stringify(signEvaluatorResponse(response, SECRET)), { status: 200 })
      },
    })
    assert.equal(trusted?.verdict, 'passed')
    assert.equal(observedUrl, 'https://evaluator.internal.example/v1/evaluate')
    assert.equal(observedInit?.redirect, 'error')
    assert.equal(observedInit?.cache, 'no-store')
    assert.equal(String(observedInit?.body).includes('submittedOutput'), false)
  })

  it('refuses cleartext remote evaluator URLs', async () => {
    await assert.rejects(() => requestControlledEvaluation({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'print(42)',
    }, {
      url: 'http://evaluator.example.com', secret: SECRET,
      fetch: async () => { throw new Error('must not fetch') },
    }), /https/i)
  })
})
