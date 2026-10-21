import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  EXPECTED_STAGING_BROWSER_TESTS,
  auditStagingBrowserFixture,
  buildStagingBrowserEvidence,
} from '../../lib/staging/browser-evidence.mjs'

const expected = {
  baseURL: 'https://sageideas-academy-staging-btqq5jasl-sage-ideas.vercel.app',
  deploymentId: 'dpl_4XUZE6HwCKz8AHidpiq61gg9sGcx',
  commitSha: 'a0098a861d68480f68810c48d2cb2e71befb5e55',
  branch: 'production/01-program-loop-v1',
}

const passingTests = Array.from({ length: EXPECTED_STAGING_BROWSER_TESTS }, (_, index) => ({
  title: `staging contract ${index + 1}`,
  status: 'passed',
  durationMs: 100 + index,
}))

test('known-good hosted browser evidence is identity-bound and trust preserving', () => {
  const evidence = buildStagingBrowserEvidence({
    expected,
    resultStatus: 'passed',
    expectedTests: EXPECTED_STAGING_BROWSER_TESTS,
    tests: passingTests,
    generatedAt: '2026-09-05T19:21:00.000Z',
  })

  assert.deepEqual(auditStagingBrowserFixture(evidence), [])
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.classification, 'hosted_browser_verified')
  assert.equal(evidence.summary.passed, 15)
  assert.equal(evidence.summary.failed, 0)
  assert.deepEqual(evidence.trust, {
    academyCertification: 'uncertified',
    labTrust: 'untrusted_current_runtime',
    labEvidence: 'practice_only',
  })
})

test('deliberately broken browser fixture fails identity, completeness, execution, and trust gates', () => {
  const broken = JSON.parse(readFileSync('tests/staging/fixtures/browser-known-broken.json', 'utf8'))
  const codes = new Set(auditStagingBrowserFixture(broken).map((finding) => finding.code))
  for (const code of [
    'unsafe_staging_target',
    'deployment_identity_invalid',
    'browser_suite_incomplete',
    'browser_test_failed',
    'trust_promotion_attempt',
  ]) assert.ok(codes.has(code), `expected broken browser finding: ${code}`)
})

test('browser evidence serializes only normalized test outcomes', () => {
  const evidence = buildStagingBrowserEvidence({
    expected,
    resultStatus: 'failed',
    expectedTests: EXPECTED_STAGING_BROWSER_TESTS,
    tests: [{
      title: 'safe title',
      status: 'failed',
      durationMs: 4,
      error: 'x-vercel-protection-bypass: secret-value',
      attachment: { body: 'secret-value' },
    }],
  })

  assert.equal(JSON.stringify(evidence).includes('secret-value'), false)
  assert.deepEqual(Object.keys(evidence.tests[0]).sort(), ['durationMs', 'status', 'title'])
})
