import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'

import {
  EVALUATOR_LIMITS,
  EVALUATOR_VERSION,
  buildLabKey,
  evaluatorPolicyHash,
  gradePrivateCases,
  parseEvaluationRequest,
  validatePrivateSpec,
} from '../../lib/academy/lab-evaluator/contract'
import {
  InMemoryReplayGuard,
  signEvaluatorRequest,
  signEvaluatorResponse,
  verifyEvaluatorRequest,
  verifyEvaluatorResponse,
} from '../../lib/academy/lab-evaluator/signing'
import {
  authorizeMasteryEvidence,
  type TrustedLabEvaluation,
} from '../../lib/academy/lab-evaluator/trust'
import {
  BoundedOutput,
  buildDockerRunArgs,
  validatePinnedImage,
} from '../../services/academy-lab-evaluator/src/docker-policy'

const SECRET = 'test-only-secret-that-is-at-least-thirty-two-bytes'
const NOW = 1_788_194_400_000
const REQUEST_ID = '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20'
const EVALUATION_ID = '018f47a2-4b8d-7f31-8c5a-1ccf64d58b21'
const IMAGE = `registry.example.com/sage/python@sha256:${'a'.repeat(64)}`
const SUBMISSION_DIGEST = createHash('sha256').update('print(42)', 'utf8').digest('hex')

function requestPayload() {
  return {
    schemaVersion: 1 as const,
    requestId: REQUEST_ID,
    issuedAt: NOW,
    labKey: 'python-basics/variables',
    code: 'print(42)',
    submissionDigest: SUBMISSION_DIGEST,
  }
}

function responsePayload() {
  return {
    schemaVersion: 2 as const,
    evaluationId: EVALUATION_ID,
    requestId: REQUEST_ID,
    issuedAt: NOW,
    labKey: 'python-basics/variables',
    submissionDigest: SUBMISSION_DIGEST,
    evaluatorVersion: EVALUATOR_VERSION,
    policyHash: evaluatorPolicyHash(),
    specRevision: '2026-08-27.1',
    specDigest: 'b'.repeat(64),
    runtimeImage: IMAGE,
    verdict: 'passed' as const,
    reason: 'all_private_cases_passed' as const,
    tests: { passed: 2, total: 2 },
    resourceUsage: { durationMs: 120, outputBytes: 6 },
  }
}

describe('academy controlled evaluator contract', () => {
  it('builds only canonical, traversal-safe lab keys', () => {
    assert.equal(buildLabKey('python-basics', 'variables'), 'python-basics/variables')
    assert.throws(() => buildLabKey('../python-basics', 'variables'), /invalid course slug/i)
    assert.throws(() => buildLabKey('python-basics', '../../secrets'), /invalid lesson slug/i)
    assert.throws(() => buildLabKey('Python Basics', 'variables'), /invalid course slug/i)
  })

  it('rejects malformed, oversized, and digest-mismatched submissions', () => {
    assert.equal(parseEvaluationRequest(requestPayload()).labKey, 'python-basics/variables')
    assert.throws(
      () => parseEvaluationRequest({ ...requestPayload(), code: 'x'.repeat(EVALUATOR_LIMITS.codeBytes + 1) }),
      /code.*limit/i,
    )
    assert.throws(
      () => parseEvaluationRequest({ ...requestPayload(), submissionDigest: '0'.repeat(64) }),
      /digest/i,
    )
    assert.throws(
      () => parseEvaluationRequest({ ...requestPayload(), extra: 'not allowed' }),
      /unknown field/i,
    )
    assert.throws(() => parseEvaluationRequest(null), /object/i)
    assert.throws(() => parseEvaluationRequest({ ...requestPayload(), requestId: 'not-a-uuid' }), /request id/i)
    assert.throws(() => parseEvaluationRequest({ ...requestPayload(), issuedAt: 0 }), /issuedAt/i)
    assert.throws(() => parseEvaluationRequest({ ...requestPayload(), labKey: '../escape/value' }), /lab key/i)
    assert.throws(() => parseEvaluationRequest({ ...requestPayload(), code: '   ' }), /code is required/i)
  })

  it('requires private reference solutions and diverse hidden cases', () => {
    const valid = validatePrivateSpec({
      schemaVersion: 1,
      labKey: 'python-basics/variables',
      language: 'python',
      specRevision: '2026-08-27.1',
      referenceSolution: 'value = int(input())\nprint(value * 2)',
      cases: [
        { id: 'happy', kind: 'happy', stdin: '21\n', expectedStdout: '42\n' },
        { id: 'negative', kind: 'negative', stdin: '-2\n', expectedStdout: '-4\n' },
      ],
    })
    assert.equal(valid.cases.length, 2)
    assert.throws(() => validatePrivateSpec({ ...valid, referenceSolution: '' }), /reference solution/i)
    assert.throws(() => validatePrivateSpec({ ...valid, cases: valid.cases.slice(0, 1) }), /at least two/i)
    assert.throws(
      () => validatePrivateSpec({ ...valid, cases: valid.cases.map((testCase: Record<string, unknown>) => ({ ...testCase, kind: 'happy' })) }),
      /negative/i,
    )
    assert.throws(() => validatePrivateSpec({ ...valid, language: 'bash' }), /language/i)
    assert.throws(() => validatePrivateSpec({ ...valid, specRevision: '../secret' }), /revision/i)
    assert.throws(() => validatePrivateSpec({
      ...valid,
      cases: [valid.cases[0], { ...valid.cases[0], kind: 'negative' }],
    }), /duplicate/i)
    assert.throws(() => validatePrivateSpec({
      ...valid,
      cases: [
        { ...valid.cases[0], stdin: 'x'.repeat(EVALUATOR_LIMITS.stdinBytes + 1) },
        valid.cases[1],
      ],
    }), /stdin/i)
  })

  it('grades exact private-case results and never accepts substring output', () => {
    assert.deepEqual(
      gradePrivateCases([
        { caseId: 'happy', status: 'passed', stdout: '42\n', expectedStdout: '42\n', outputBytes: 3 },
        { caseId: 'negative', status: 'passed', stdout: '-4\n', expectedStdout: '-4\n', outputBytes: 3 },
      ]),
      { verdict: 'passed', reason: 'all_private_cases_passed', passed: 2, total: 2, outputBytes: 6 },
    )
    assert.equal(
      gradePrivateCases([
        { caseId: 'happy', status: 'passed', stdout: 'the answer is 42\n', expectedStdout: '42\n', outputBytes: 17 },
      ]).verdict,
      'failed',
    )
    assert.equal(
      gradePrivateCases([
        { caseId: 'happy', status: 'timed_out', stdout: '', expectedStdout: '42\n', outputBytes: 0 },
      ]).reason,
      'resource_limit_exceeded',
    )
    assert.equal(
      gradePrivateCases([
        { caseId: 'happy', status: 'runtime_error', stdout: '', expectedStdout: '42\n', outputBytes: 0 },
      ]).reason,
      'runtime_error',
    )
    assert.equal(gradePrivateCases([]).reason, 'private_case_failed')
  })

  it('signs requests, rejects tampering and expiry, and consumes nonces once', () => {
    const signed = signEvaluatorRequest(requestPayload(), SECRET)
    const replay = new InMemoryReplayGuard()
    assert.equal(verifyEvaluatorRequest(signed, SECRET, { now: NOW, replay }).requestId, REQUEST_ID)
    assert.throws(() => verifyEvaluatorRequest(signed, SECRET, { now: NOW, replay }), /replay/i)

    const fresh = signEvaluatorRequest({ ...requestPayload(), requestId: EVALUATION_ID }, SECRET)
    assert.throws(
      () => verifyEvaluatorRequest({ ...fresh, payload: { ...fresh.payload, code: 'print(0)' } }, SECRET, { now: NOW }),
      /signature/i,
    )
    assert.throws(
      () => verifyEvaluatorRequest(fresh, SECRET, { now: NOW + EVALUATOR_LIMITS.signatureTtlMs + 1 }),
      /expired/i,
    )
  })

  it('binds trusted responses to the exact request, digest, and evaluator signature', () => {
    const request = requestPayload()
    const signed = signEvaluatorResponse(responsePayload(), SECRET)
    const trusted = verifyEvaluatorResponse(signed, SECRET, request, { now: NOW })
    assert.equal(trusted.verdict, 'passed')
    assert.throws(() => {
      ;(trusted as { verdict: string }).verdict = 'failed'
    }, /read only|readonly|assign/i)
    assert.throws(() => {
      ;(trusted.tests as { passed: number }).passed = 0
    }, /read only|readonly|assign/i)

    assert.throws(
      () => verifyEvaluatorResponse(
        signEvaluatorResponse({ ...responsePayload(), submissionDigest: 'd'.repeat(64) }, SECRET),
        SECRET,
        request,
        { now: NOW },
      ),
      /submission digest/i,
    )
    assert.throws(
      () => verifyEvaluatorResponse({ ...signed, signature: '0'.repeat(64) }, SECRET, request, { now: NOW }),
      /signature/i,
    )
    assert.throws(
      () => verifyEvaluatorResponse({ ...signed, signature: 'not-a-signature' }, SECRET, request, { now: NOW }),
      /signature/i,
    )
    assert.throws(
      () => verifyEvaluatorResponse(
        signEvaluatorResponse({ ...responsePayload(), requestId: EVALUATION_ID }, SECRET),
        SECRET,
        request,
        { now: NOW },
      ),
      /request id/i,
    )
    assert.throws(
      () => verifyEvaluatorResponse(
        signEvaluatorResponse({ ...responsePayload(), labKey: 'python-basics/loops' }, SECRET),
        SECRET,
        request,
        { now: NOW },
      ),
      /lab key/i,
    )
  })

  it('allows only a trusted passing receipt to plan mastery evidence', () => {
    const trusted = verifyEvaluatorResponse(
      signEvaluatorResponse(responsePayload(), SECRET),
      SECRET,
      requestPayload(),
      { now: NOW },
    )
    assert.deepEqual(authorizeMasteryEvidence(trusted), {
      allowed: true,
      eventTypes: ['lab_verified', 'sprint_artifact_created'],
    })

    const failed = verifyEvaluatorResponse(
      signEvaluatorResponse({
        ...responsePayload(),
        verdict: 'failed',
        reason: 'private_case_failed',
        tests: { passed: 1, total: 2 },
      }, SECRET),
      SECRET,
      requestPayload(),
      { now: NOW },
    )
    assert.deepEqual(authorizeMasteryEvidence(failed), { allowed: false, eventTypes: [] })
    assert.deepEqual(authorizeMasteryEvidence(null), { allowed: false, eventTypes: [] })
    assert.deepEqual(
      authorizeMasteryEvidence(responsePayload() as unknown as TrustedLabEvaluation),
      { allowed: false, eventTypes: [] },
    )

    const staleVersion = verifyEvaluatorResponse(
      signEvaluatorResponse({ ...responsePayload(), evaluatorVersion: 'academy-evaluator-v0' }, SECRET),
      SECRET,
      requestPayload(),
      { now: NOW },
    )
    assert.deepEqual(authorizeMasteryEvidence(staleVersion), { allowed: false, eventTypes: [] })

    const unknownPolicy = verifyEvaluatorResponse(
      signEvaluatorResponse({ ...responsePayload(), policyHash: 'd'.repeat(64) }, SECRET),
      SECRET,
      requestPayload(),
      { now: NOW },
    )
    assert.deepEqual(authorizeMasteryEvidence(unknownPolicy), { allowed: false, eventTypes: [] })
  })

  it('requires digest-pinned runtime images', () => {
    assert.equal(validatePinnedImage(IMAGE), IMAGE)
    assert.throws(() => validatePinnedImage('python:3.12-alpine'), /digest-pinned/i)
    assert.throws(() => validatePinnedImage(`${IMAGE}; touch /tmp/pwned`), /invalid image/i)
  })

  it('constructs a no-network, read-only, resource-bounded, non-root container', () => {
    const args = buildDockerRunArgs({
      containerName: 'academy-eval-018f47a24b8d7f318c5a1ccf64d58b20',
      image: IMAGE,
      language: 'python',
      sourcePath: '/var/lib/academy-evaluator/jobs/018f47a2/submission.py',
    })
    const joined = args.join(' ')
    for (const required of [
      '--pull=never',
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges=true',
      '--pids-limit=32',
      '--memory=128m',
      '--memory-swap=128m',
      '--cpus=0.5',
      '--user=65532:65532',
      '--ulimit=cpu=3:3',
      '--ulimit=fsize=1048576:1048576',
      '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m',
      'readonly',
    ]) assert.match(joined, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal(joined.includes('--privileged'), false)
    assert.equal(joined.includes('--network=host'), false)
    assert.throws(() => buildDockerRunArgs({
      containerName: 'invalid', image: IMAGE, language: 'python',
      sourcePath: '/var/lib/academy-evaluator/jobs/job-1/submission.py',
    }), /container name/i)
    assert.throws(() => buildDockerRunArgs({
      containerName: 'academy-eval-018f47a24b8d7f318c5a1ccf64d58b20', image: IMAGE, language: 'python',
      sourcePath: '/var/lib/academy-evaluator/jobs/../secrets/submission.py',
    }), /source path/i)
    assert.match(buildDockerRunArgs({
      containerName: 'academy-eval-018f47a24b8d7f318c5a1ccf64d58b20', image: IMAGE, language: 'javascript',
      sourcePath: '/var/lib/academy-evaluator/jobs/job-1/submission.js',
    }).join(' '), /submission\.js/)
    assert.match(buildDockerRunArgs({
      containerName: 'academy-eval-018f47a24b8d7f318c5a1ccf64d58b20', image: IMAGE, language: 'sql',
      sourcePath: '/var/lib/academy-evaluator/jobs/job-1/submission.sql',
    }).join(' '), /run_sql\.py/)
  })

  it('stops collecting output at the hard byte limit', () => {
    assert.throws(() => new BoundedOutput(0), /invalid output limit/i)
    const output = new BoundedOutput(8)
    output.append(Buffer.from('1234'))
    output.append(Buffer.from('5678'))
    assert.equal(output.text(), '12345678')
    assert.throws(() => output.append(Buffer.from('9')), /output limit/i)
  })
})
