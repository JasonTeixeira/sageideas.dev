import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'

import { buildEvaluationRequest } from '../../lib/academy/lab-evaluator/client-core'
import { EVALUATOR_VERSION, evaluatorPolicyHash, privateSpecDigest } from '../../lib/academy/lab-evaluator/contract'
import { decideLabSubmissionOutcome } from '../../lib/academy/lab-evaluator/application'
import { signEvaluatorResponse, verifyEvaluatorResponse } from '../../lib/academy/lab-evaluator/signing'
import { executePrivateCase, runBoundedProcess } from '../../services/academy-lab-evaluator/src/executor'
import { evaluateSubmission } from '../../services/academy-lab-evaluator/src/evaluate'
import { loadPrivateSpec } from '../../services/academy-lab-evaluator/src/spec-store'

const NOW = 1_788_194_400_000
const SECRET = 'test-only-secret-that-is-at-least-thirty-two-bytes'
const IMAGE = `registry.example.com/sage/python@sha256:${'a'.repeat(64)}`

function validSpec() {
  return {
    schemaVersion: 1 as const,
    labKey: 'python-basics/variables',
    language: 'python' as const,
    specRevision: '2026-08-27.1',
    referenceSolution: 'value = int(input())\nprint(value * 2)',
    cases: [
      { id: 'happy', kind: 'happy' as const, stdin: '21\n', expectedStdout: '42\n' },
      { id: 'negative', kind: 'negative' as const, stdin: '-2\n', expectedStdout: '-4\n' },
    ],
  }
}

describe('academy evaluator service and application boundary', () => {
  it('builds the server request from submitted code rather than browser output', () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics',
      lessonSlug: 'variables',
      code: 'print(42)',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20',
      issuedAt: NOW,
    })
    assert.equal(request.labKey, 'python-basics/variables')
    assert.equal(request.code, 'print(42)')
    assert.equal(request.submissionDigest, createHash('sha256').update('print(42)').digest('hex'))
    assert.equal(Object.hasOwn(request, 'submittedOutput'), false)
  })

  it('loads only a canonical private spec below the configured root', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'academy-private-specs-'))
    try {
      await writeFile(path.join(root, 'python-basics--variables.json'), JSON.stringify(validSpec()))
      assert.equal((await loadPrivateSpec(root, 'python-basics/variables'))?.specRevision, '2026-08-27.1')
      await assert.rejects(() => loadPrivateSpec(root, '../secrets/value'), /invalid lab key/i)
      assert.equal(await loadPrivateSpec(root, 'python-basics/missing'), null)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('executes a case with the hard policy and never passes private expectations to the container', async () => {
    let observed: { stdin?: string; args?: string[]; wallTimeMs?: number; outputLimitBytes?: number } = {}
    const result = await executePrivateCase({
      language: 'python',
      code: 'print(input())',
      testCase: { id: 'hidden', kind: 'negative', stdin: 'secret-input\n', expectedStdout: 'secret-input\n' },
      image: IMAGE,
      jobRoot: '/var/lib/academy-evaluator/jobs',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20',
    }, {
      prepareSource: async () => '/var/lib/academy-evaluator/jobs/job-1/submission.py',
      cleanupSource: async () => undefined,
      runDocker: async (args: string[], options: { stdin: string; wallTimeMs: number; outputLimitBytes: number }) => {
        observed = { stdin: options.stdin, args, wallTimeMs: options.wallTimeMs, outputLimitBytes: options.outputLimitBytes }
        return { status: 'exited', exitCode: 0, stdout: 'secret-input\n', stderr: '', outputBytes: 13 }
      },
      forceRemove: async () => undefined,
    })
    assert.equal(result.status, 'passed')
    assert.equal(observed.stdin, 'secret-input\n')
    assert.equal(observed.args?.join(' ').includes('secret-input'), false)
    assert.equal(observed.args?.join(' ').includes('expectedStdout'), false)
    assert.equal(observed.wallTimeMs, 5_000)
    assert.equal(observed.outputLimitBytes, 65_536)
  })

  it('kills subprocesses on output and wall-clock limits', async () => {
    const outputBomb = await runBoundedProcess(
      process.execPath,
      ['-e', 'process.stdout.write("x".repeat(1024))'],
      { stdin: '', wallTimeMs: 1_000, outputLimitBytes: 8 },
    )
    assert.equal(outputBomb.status, 'output_limited')

    const timeout = await runBoundedProcess(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { stdin: '', wallTimeMs: 25, outputLimitBytes: 1_024 },
    )
    assert.equal(timeout.status, 'timed_out')
  })

  it('generates an evaluation id without an injected test id factory', async () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'solution',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20', issuedAt: NOW,
    })
    const response = await evaluateSubmission(request, {
      now: () => NOW,
      loadSpec: async () => validSpec(),
      runtimeImageFor: () => IMAGE,
      executeCase: async (_code, testCase) => ({
        caseId: testCase.id,
        status: 'passed',
        stdout: testCase.expectedStdout,
        expectedStdout: testCase.expectedStdout,
        outputBytes: Buffer.byteLength(testCase.expectedStdout),
      }),
    })

    assert.match(response.evaluationId, /^[0-9a-f-]{36}$/)
  })

  it('returns only aggregate results after all hidden cases pass', async () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'solution',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20', issuedAt: NOW,
    })
    const response = await evaluateSubmission(request, {
      now: () => NOW,
      newId: () => '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      loadSpec: async () => validSpec(),
      runtimeImageFor: () => IMAGE,
      executeCase: async (_code: string, testCase: { id: string; expectedStdout: string }) => ({
        caseId: testCase.id,
        status: 'passed',
        stdout: testCase.expectedStdout,
        expectedStdout: testCase.expectedStdout,
        outputBytes: Buffer.byteLength(testCase.expectedStdout),
      }),
    })
    assert.equal(response.verdict, 'passed')
    assert.deepEqual(response.tests, { passed: 2, total: 2 })
    assert.equal(response.specDigest, privateSpecDigest(validSpec()))
    assert.equal(response.runtimeImage, IMAGE)
    assert.equal(JSON.stringify(response).includes('secret-input'), false)
    assert.equal(JSON.stringify(response).includes('expectedStdout'), false)
    assert.equal(JSON.stringify(response).includes('referenceSolution'), false)
  })

  it('fails closed as practice-only when the private spec or evaluator is unavailable', async () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'solution',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20', issuedAt: NOW,
    })
    const noSpec = await evaluateSubmission(request, {
      now: () => NOW,
      newId: () => '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      loadSpec: async () => null,
      executeCase: async () => { throw new Error('must not execute') },
    })
    assert.equal(noSpec.verdict, 'untrusted')
    assert.equal(noSpec.reason, 'private_spec_missing')
    assert.deepEqual(decideLabSubmissionOutcome(null), {
      verified: false,
      trustStatus: 'practice_only',
      persistMastery: false,
      reason: 'evaluator_unavailable',
    })

    const invalidSpec = await evaluateSubmission(request, {
      now: () => NOW,
      newId: () => '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      loadSpec: async () => { throw new Error('corrupt private pack') },
      executeCase: async () => { throw new Error('must not execute') },
    })
    assert.equal(invalidSpec.reason, 'private_spec_invalid')

    const failedProof = await evaluateSubmission(request, {
      now: () => NOW,
      newId: () => '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      loadSpec: async () => validSpec(),
      proveSpec: async () => false,
      executeCase: async () => { throw new Error('must not execute') },
    })
    assert.equal(failedProof.reason, 'private_spec_invalid')

    const runtimeFailure = await evaluateSubmission(request, {
      now: () => NOW,
      newId: () => '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      loadSpec: async () => validSpec(),
      executeCase: async () => { throw new Error('runtime failed') },
    })
    assert.equal(runtimeFailure.reason, 'runtime_error')
  })

  it('persists mastery only for the exact signed, all-cases-passing response', () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics', lessonSlug: 'variables', code: 'solution',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20', issuedAt: NOW,
    })
    const payload = {
      schemaVersion: 2 as const,
      evaluationId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21',
      requestId: request.requestId,
      issuedAt: NOW,
      labKey: request.labKey,
      submissionDigest: request.submissionDigest,
      evaluatorVersion: EVALUATOR_VERSION,
      policyHash: evaluatorPolicyHash(),
      specRevision: '2026-08-27.1',
      specDigest: privateSpecDigest(validSpec()),
      runtimeImage: IMAGE,
      verdict: 'passed' as const,
      reason: 'all_private_cases_passed' as const,
      tests: { passed: 2, total: 2 },
      resourceUsage: { durationMs: 80, outputBytes: 6 },
    }
    const trusted = verifyEvaluatorResponse(signEvaluatorResponse(payload, SECRET), SECRET, request, { now: NOW })
    assert.deepEqual(decideLabSubmissionOutcome(trusted), {
      verified: true,
      trustStatus: 'controlled_evaluator',
      persistMastery: true,
      reason: 'all_private_cases_passed',
    })

    const failed = verifyEvaluatorResponse(signEvaluatorResponse({
      ...payload,
      verdict: 'failed',
      reason: 'private_case_failed',
      tests: { passed: 1, total: 2 },
    }, SECRET), SECRET, request, { now: NOW })
    assert.equal(decideLabSubmissionOutcome(failed).persistMastery, false)
  })
})
