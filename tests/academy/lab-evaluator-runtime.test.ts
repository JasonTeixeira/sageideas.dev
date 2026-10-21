import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import type { PrivateLabCase } from '../../lib/academy/lab-evaluator/contract'
import { loadEvaluatorConfig } from '../../services/academy-lab-evaluator/src/config'
import { createReferenceProofCache } from '../../services/academy-lab-evaluator/src/reference-proof'

const PINNED = `registry.example.com/sage/runtime@sha256:${'a'.repeat(64)}`
const VALID_ENV = {
  ACADEMY_LAB_EVALUATOR_SECRET: 'test-only-secret-that-is-at-least-thirty-two-bytes',
  ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT: '/srv/academy-evaluator/private-specs',
  ACADEMY_EVALUATOR_JOB_ROOT: '/var/lib/academy-evaluator/jobs',
  ACADEMY_EVALUATOR_IMAGE_PYTHON: PINNED,
  ACADEMY_EVALUATOR_IMAGE_JAVASCRIPT: PINNED,
  ACADEMY_EVALUATOR_IMAGE_SQL: PINNED,
  ACADEMY_EVALUATOR_PORT: '8787',
}

function spec() {
  return {
    schemaVersion: 1 as const,
    labKey: 'python-basics/variables',
    language: 'python' as const,
    specRevision: '2026-08-27.1',
    referenceSolution: 'print(42)',
    cases: [
      { id: 'happy', kind: 'happy' as const, stdin: '', expectedStdout: '42\n' },
      { id: 'negative', kind: 'negative' as const, stdin: '-1\n', expectedStdout: '42\n' },
    ],
  }
}

describe('academy evaluator standalone runtime', () => {
  it('fails startup closed unless secrets, absolute roots, and pinned images are configured', () => {
    const config = loadEvaluatorConfig(VALID_ENV)
    assert.equal(config.port, 8787)
    assert.equal(config.host, '127.0.0.1')
    assert.equal(config.images.python, PINNED)
    assert.equal(path.isAbsolute(config.privateSpecRoot), true)
    assert.equal(loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_HOST: '::1' }).host, '::1')
    assert.equal(loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_HOST: 'localhost' }).host, 'localhost')

    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_LAB_EVALUATOR_SECRET: '' }), /secret/i)
    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT: '../specs' }), /absolute/i)
    assert.throws(() => loadEvaluatorConfig({
      ...VALID_ENV,
      ACADEMY_EVALUATOR_JOB_ROOT: '/srv/academy-evaluator/private-specs/jobs',
    }), /disjoint/i)
    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_IMAGE_PYTHON: 'python:3.12' }), /digest-pinned/i)
    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_PORT: '0' }), /port/i)
    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_PORT: 'not-a-port' }), /port/i)
    assert.throws(() => loadEvaluatorConfig({ ...VALID_ENV, ACADEMY_EVALUATOR_HOST: '0.0.0.0' }), /loopback/i)
  })

  it('proves each private reference solution once with the same controlled runner', async () => {
    let executions = 0
    const prove = createReferenceProofCache(async (code: string, testCase: PrivateLabCase) => {
      executions += 1
      return {
        caseId: testCase.id,
        status: 'passed',
        stdout: code === 'print(42)' ? testCase.expectedStdout : 'wrong',
        expectedStdout: testCase.expectedStdout,
        outputBytes: Buffer.byteLength(testCase.expectedStdout),
      }
    })
    assert.equal(await prove(spec()), true)
    assert.equal(await prove(spec()), true)
    assert.equal(executions, 2)
  })

  it('marks a private spec untrusted when its own reference solution fails', async () => {
    const prove = createReferenceProofCache(async (_code: string, testCase: PrivateLabCase) => ({
      caseId: testCase.id,
      status: 'passed',
      stdout: 'wrong\n',
      expectedStdout: testCase.expectedStdout,
      outputBytes: 6,
    }))
    assert.equal(await prove(spec()), false)
  })
})
