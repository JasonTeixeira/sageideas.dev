import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { buildStagingProductionReadinessAudit } from '../../lib/staging/production-readiness-audit.mjs'

const identity = {
  baseURL: 'https://sageideas-academy-staging-btqq5jasl-sage-ideas.vercel.app',
  deploymentId: 'dpl_4XUZE6HwCKz8AHidpiq61gg9sGcx',
  commitSha: 'a0098a861d68480f68810c48d2cb2e71befb5e55',
  branch: 'production/01-program-loop-v1',
}

const trust = {
  academyCertification: 'uncertified',
  labTrust: 'untrusted_current_runtime',
  labEvidence: 'practice_only',
}

test('honest partial staging evidence preserves every external and human boundary', () => {
  const audit = buildStagingProductionReadinessAudit({
    release: { status: 'local_production_candidate', trust },
    http: {
      status: 'pass',
      classification: 'stateless_staging_verified',
      expected: identity,
      summary: { requiredProbes: 22, passedProbes: 22, requiredHeaders: 7, passedHeaders: 7 },
      findings: [],
      trust,
    },
    browser: {
      status: 'pass',
      classification: 'hosted_browser_verified',
      expected: identity,
      summary: { expectedTests: 15, observedTests: 15, passed: 15, failed: 0 },
      findings: [],
      trust,
    },
    rollback: {
      status: 'pass',
      target: identity.baseURL,
      baselineDeploymentId: identity.deploymentId,
      restoredDeploymentId: identity.deploymentId,
      rollbackDeploymentId: 'dpl_42Q6yxYnrERqFUGmcu82Ut7brjwG',
      checks: { baseline: 200, rollback: 200, restored: 200 },
      bindings: {
        baseline: identity.deploymentId,
        rollback: 'dpl_42Q6yxYnrERqFUGmcu82Ut7brjwG',
        restored: identity.deploymentId,
      },
      restored: true,
      trust,
    },
    labs: {
      status: 'blocked',
      gates: {
        manifest_valid: true,
        private_pack_valid: false,
        isolated_runtime: false,
        digest_pinned_images: false,
        migrations_applied: false,
        managed_runtime_binding: false,
        reference_solutions_passed: false,
        adversarial_probes_passed: false,
        receipts_reconciled: false,
        monitoring_ready: false,
        kill_switch_ready: false,
      },
    },
    generatedAt: '2026-09-05T20:00:00.000Z',
  })

  assert.equal(audit.status, 'not_production_ready')
  assert.equal(audit.classification, 'stateless_staging_verified_external_evidence_pending')
  assert.deepEqual(audit.summary, { pass: 4, fail: 0, blocked: 4, approvalRequired: 2 })
  assert.equal(audit.gates.controlled_lab_runtime.status, 'blocked')
  assert.equal(audit.gates.production_deployment.status, 'approval_required')
  assert.deepEqual(audit.trust, trust)
  assert.deepEqual(audit.findings, [])
})

test('deliberately broken readiness evidence fails closed instead of fabricating readiness', () => {
  const input = JSON.parse(readFileSync('tests/staging/fixtures/readiness-known-broken.json', 'utf8'))
  const audit = buildStagingProductionReadinessAudit(input)
  const codes = new Set(audit.findings.map((finding) => finding.code))
  for (const code of [
    'local_candidate_missing',
    'unsafe_staging_target',
    'staging_identity_mismatch',
    'rollback_restore_unproven',
    'controlled_lab_evidence_invalid',
    'trust_promotion_attempt',
  ]) assert.ok(codes.has(code), `expected readiness finding: ${code}`)
  assert.equal(audit.status, 'not_production_ready')
  assert.equal(audit.classification, 'staging_verification_failed')
})

test('missing evidence is represented as blocked, never as an execution failure or success', () => {
  const audit = buildStagingProductionReadinessAudit({
    release: { status: 'local_production_candidate', trust },
  })

  assert.equal(audit.gates.stateless_http.status, 'blocked')
  assert.equal(audit.gates.hosted_browser.status, 'blocked')
  assert.equal(audit.gates.application_rollback.status, 'blocked')
  assert.equal(audit.summary.fail, 0)
  assert.equal(audit.status, 'not_production_ready')
})

test('a bare pass label cannot substitute for complete hosted evidence', () => {
  const audit = buildStagingProductionReadinessAudit({
    release: { status: 'local_production_candidate', trust },
    http: { status: 'pass', expected: identity, trust },
    browser: { status: 'pass', expected: identity, trust },
  })

  assert.equal(audit.gates.stateless_http.status, 'fail')
  assert.equal(audit.gates.hosted_browser.status, 'fail')
  assert(audit.findings.some((finding) => finding.code === 'staging_evidence_invalid'))
})
