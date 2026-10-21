import assert from 'node:assert/strict'
import test from 'node:test'

import {
  auditStagingRollbackFixture,
  buildStagingRollbackEvidence,
} from '../../lib/staging/rollback-evidence.mjs'

const baseline = {
  id: 'dpl_4XUZE6HwCKz8AHidpiq61gg9sGcx',
  name: 'sageideas-academy-staging',
  url: 'sageideas-academy-staging-btqq5jasl-sage-ideas.vercel.app',
  readyState: 'READY',
  target: null,
  meta: {
    gitCommitSha: 'a0098a861d68480f68810c48d2cb2e71befb5e55',
    gitCommitRef: 'production/01-program-loop-v1',
  },
}

const rollback = {
  ...baseline,
  id: 'dpl_42Q6yxYnrERqFUGmcu82Ut7brjwG',
  url: 'sageideas-academy-staging-prior-sage-ideas.vercel.app',
  meta: { ...baseline.meta, gitCommitSha: '10098f6f0c08a0efaa320cdb0822648b2d72b5d3' },
}

test('isolated alias rollback evidence proves baseline, rollback, and restoration', () => {
  const evidence = buildStagingRollbackEvidence({
    baseline,
    rollback,
    alias: 'sageideas-academy-staging-drill.vercel.app',
    checks: { baseline: 200, rollback: 200, restored: 200 },
    bindings: { baseline: baseline.id, rollback: rollback.id, restored: baseline.id },
    restoredDeploymentId: baseline.id,
    publicProtection: { status: 302, location: 'https://vercel.com/sso-api' },
    generatedAt: '2026-09-05T20:30:00.000Z',
  })

  assert.deepEqual(auditStagingRollbackFixture(evidence), [])
  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.restored, true)
  assert.equal(evidence.target, `https://${baseline.url}`)
  assert.equal(JSON.stringify(evidence).includes('nonce='), false)
})

test('rollback proof fails closed for production targets and incomplete restoration', () => {
  const evidence = buildStagingRollbackEvidence({
    baseline: { ...baseline, target: 'production' },
    rollback,
    alias: 'sageideas.dev',
    checks: { baseline: 200, rollback: 500, restored: 200 },
    bindings: { baseline: rollback.id, rollback: rollback.id, restored: rollback.id },
    restoredDeploymentId: rollback.id,
    publicProtection: { status: 200, location: 'https://example.com/secret?nonce=secret' },
  })
  const codes = new Set(evidence.findings.map((finding) => finding.code))
  for (const code of [
    'unsafe_deployment',
    'unsafe_rollback_alias',
    'rollback_probe_failed',
    'alias_binding_mismatch',
    'baseline_not_restored',
    'public_protection_missing',
  ]) assert.ok(codes.has(code), `expected rollback finding: ${code}`)
  assert.equal(evidence.status, 'fail')
  assert.equal(JSON.stringify(evidence).includes('nonce='), false)
})
