import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { buildTrustedLabPersistence } from '../../lib/academy/lab-evaluator/persistence'
import { signEvaluatorResponse, verifyEvaluatorResponse } from '../../lib/academy/lab-evaluator/signing'
import { buildEvaluationRequest } from '../../lib/academy/lab-evaluator/client-core'
import {
  EVALUATOR_VERSION,
  evaluatorPolicyHash,
} from '../../lib/academy/lab-evaluator/contract'

const SECRET = 'test-only-secret-that-is-at-least-thirty-two-bytes'
const NOW = 1_788_194_400_000

describe('academy mastery evidence trust boundary', () => {
  it('builds an auditable atomic persistence command only from a trusted pass', () => {
    const request = buildEvaluationRequest({
      courseSlug: 'python-basics',
      lessonSlug: 'variables',
      code: 'print(42)',
      requestId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b20',
      issuedAt: NOW,
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
      specDigest: 'b'.repeat(64),
      runtimeImage: `registry.example.com/sage/python@sha256:${'a'.repeat(64)}`,
      verdict: 'passed' as const,
      reason: 'all_private_cases_passed' as const,
      tests: { passed: 2, total: 2 },
      resourceUsage: { durationMs: 80, outputBytes: 6 },
    }
    const trusted = verifyEvaluatorResponse(signEvaluatorResponse(payload, SECRET), SECRET, request, { now: NOW })
    const command = buildTrustedLabPersistence({
      userId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b22',
      courseSlug: 'python-basics',
      lessonSlug: 'variables',
      releaseId: 'flagship-labs-2026-08-27.1',
      evaluation: trusted,
    })
    assert.equal(command?.rpc, 'record_trusted_academy_lab_result')
    assert.equal(command?.args.p_evaluation_id, payload.evaluationId)
    assert.equal(command?.args.p_spec_revision, payload.specRevision)
    assert.equal(command?.args.p_spec_digest, payload.specDigest)
    assert.equal(command?.args.p_runtime_image, payload.runtimeImage)
    assert.equal(command?.args.p_release_id, 'flagship-labs-2026-08-27.1')
    assert.equal(command?.args.p_attestation_signature.length, 64)
    assert.equal(command?.args.p_verdict, 'passed')

    const failed = verifyEvaluatorResponse(signEvaluatorResponse({
      ...payload,
      verdict: 'failed',
      reason: 'private_case_failed',
      tests: { passed: 1, total: 2 },
    }, SECRET), SECRET, request, { now: NOW })
    assert.equal(buildTrustedLabPersistence({
      userId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b22',
      courseSlug: 'python-basics',
      lessonSlug: 'variables',
      releaseId: 'flagship-labs-2026-08-27.1',
      evaluation: failed,
    }), null)
  })

  it('removes the learner-output substring verifier from the application path', () => {
    const action = readFileSync('app/academy/_actions/evidence.ts', 'utf8')
    const evaluator = readFileSync('lib/academy/lab-evaluator/client-server.ts', 'utf8')
    const runner = readFileSync('components/academy/lab/LabRunner.tsx', 'utf8')
    assert.equal(action.includes('submittedOutput'), false)
    assert.equal(action.includes('.includes(check'), false)
    assert.match(action, /evaluateLabOnControlledService/)
    assert.match(action, /persistTrustedLabEvaluation/)
    assert.match(action, /isFlagshipLabCandidate/)
    assert.match(action, /masteryPersistenceEnabled/)
    assert.match(action, /FLAGSHIP_ACTIVATION_RELEASE_ID/)
    assert.match(action, /activationAttestationAllowsMastery/)
    assert.match(action, /activation_not_attested/)
    assert.match(action, /activation_spec_mismatch/)
    assert.match(action, /mastery_writes_disabled/)
    assert.equal(runner.includes('lastOutputRef'), false)
    assert.match(runner, /verifyLab\(courseSlug, lessonSlug, code\)/)
    assert.match(evaluator, /ACADEMY_LAB_EVALUATOR_PROVIDER/)
    assert.match(evaluator, /evaluateLabWithVercelSandbox/)
    assert.match(evaluator, /academy_private_lab_specs/)
    assert.match(evaluator, /flagshipLabSpecDigest/)
    assert.match(evaluator, /validateStoredPrivateSpec/)
  })

  it('denies generic lab_verified writes and provides an atomic append-only ledger function', () => {
    const evidenceWriter = readFileSync('lib/academy/evidence-events.ts', 'utf8')
    const action = readFileSync('app/academy/_actions/evidence.ts', 'utf8')
    const migration = readFileSync('supabase/migrations/0116_academy_trusted_lab_evaluations.sql', 'utf8')
    const policyPinMigration = readFileSync('supabase/migrations/0117_academy_lab_evaluator_policy_pin.sql', 'utf8')
    const privateSpecsMigration = readFileSync('supabase/migrations/0118_academy_private_lab_specs.sql', 'utf8')
    const managedPolicyMigration = readFileSync('supabase/migrations/0119_academy_managed_evaluator_policy_pin.sql', 'utf8')
    const releaseBindingMigration = readFileSync('supabase/migrations/0120_academy_lab_release_binding.sql', 'utf8')
    const responseContract = readFileSync('lib/academy/lab-evaluator/contract.ts', 'utf8')
    assert.match(evidenceWriter, /input\.type === 'lab_verified'/)
    assert.match(evidenceWriter, /input\.type === 'sprint_artifact_created'/)
    assert.match(evidenceWriter, /recordNonLabArtifactEvidence/)
    assert.match(action, /recordNonLabArtifactEvidence/)
    assert.match(evidenceWriter, /trusted evaluator persistence/i)
    assert.match(migration, /create table if not exists public\.academy_lab_evaluations/i)
    assert.match(migration, /record_trusted_academy_lab_result/i)
    assert.match(migration, /security definer/i)
    assert.match(migration, /revoke execute[\s\S]*?from public, anon, authenticated/i)
    assert.match(migration, /academy_evidence_events/i)
    assert.match(migration, /append-only/i)
    assert.match(policyPinMigration, /create or replace function public\.record_trusted_academy_lab_result/i)
    assert.match(policyPinMigration, /revoke execute[\s\S]*?from public, anon, authenticated/i)
    assert.match(managedPolicyMigration, /create or replace function public\.record_trusted_academy_lab_result/i)
    assert.match(managedPolicyMigration, /academy-evaluator-v2/)
    assert.match(releaseBindingMigration, new RegExp(EVALUATOR_VERSION))
    assert.match(releaseBindingMigration, new RegExp(evaluatorPolicyHash()))
    assert.match(privateSpecsMigration, /create table if not exists public\.academy_private_lab_specs/i)
    assert.match(privateSpecsMigration, /enable row level security/i)
    assert.match(privateSpecsMigration, /revoke all[\s\S]*?from public, anon, authenticated/i)
    assert.match(privateSpecsMigration, /grant select[\s\S]*?to service_role/i)
    assert.match(privateSpecsMigration, /append-only/i)
    assert.match(responseContract, /specDigest: string \| null/)
    assert.match(responseContract, /runtimeImage: string \| null/)
    assert.match(releaseBindingMigration, /academy_lab_activation_bindings/i)
    assert.match(releaseBindingMigration, /academy_lab_activation_events/i)
    assert.match(releaseBindingMigration, /p_release_id/i)
    assert.match(releaseBindingMigration, /p_spec_digest/i)
    assert.match(releaseBindingMigration, /p_runtime_image/i)
    assert.match(releaseBindingMigration, /academy_private_lab_specs/i)
    assert.match(releaseBindingMigration, /record_trusted_academy_lab_result/i)
    assert.match(releaseBindingMigration, /append-only/i)
  })

  it('defines secret-free, base-digest-required images for managed sandbox boot', () => {
    const python = readFileSync('services/academy-lab-evaluator/runtimes/python-sql/Dockerfile.vercel-sandbox', 'utf8')
    const javascript = readFileSync('services/academy-lab-evaluator/runtimes/javascript/Dockerfile.vercel-sandbox', 'utf8')
    for (const dockerfile of [python, javascript]) {
      assert.match(dockerfile, /^ARG BASE_IMAGE/m)
      assert.match(dockerfile, /^FROM \$\{BASE_IMAGE\}$/m)
      assert.match(dockerfile, /^WORKDIR \/vercel\/sandbox$/m)
      assert.match(dockerfile, /^USER academy-evaluator$/m)
      assert.match(dockerfile, /cp \/bin\/setpriv \/usr\/local\/bin\/academy-setpriv/)
      assert.match(dockerfile, /\/usr\/local\/bin\/academy-setpriv --version/)
      assert.match(dockerfile, /chmod 0555 \/vercel\/sandbox/)
      assert.doesNotMatch(dockerfile, /chmod 1777 \/vercel\/sandbox/)
      assert.equal(/secret|reference|private-spec/i.test(dockerfile), false)
    }
  })
})
