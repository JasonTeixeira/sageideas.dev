import { createHash } from 'node:crypto'

export const REQUIRED_EXTERNAL_BOUNDARIES = Object.freeze([
  'staging_deployment',
  'hosted_migrations',
  'live_integrations',
  'controlled_lab_runtime',
  'human_review_beta',
])

export const REQUIRED_EVIDENCE_KEYS = Object.freeze([
  'observations',
  'securityReview',
  'accessibilityPerformance',
  'observabilityRecovery',
])

const REQUIRED_SCRIPTS = Object.freeze({
  'test:release-readiness': 'node --test tests/release-readiness/release-readiness.test.mjs',
  'audit:release-readiness': 'node tools/release-readiness/write-manifest.mjs',
  'project:release:verify': 'node tools/project-program/cli.mjs release-verify',
})

const SHA256 = /^sha256:[a-f0-9]{64}$/

export function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

export function auditReleaseReadiness(input) {
  const findings = []
  const add = (code, message, severity = 'critical') => findings.push({ code, severity, message })
  const manifest = input?.manifest ?? {}
  const canonical = input?.canonical ?? {}

  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (input?.packageScripts?.[name] !== command) add('script_missing', `Missing or changed release script: ${name}`)
  }
  if (manifest.programVersion !== canonical.programVersion) add('program_version_mismatch', 'Release and canonical program versions do not match')
  if (!/^local-candidate-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$/.test(manifest.releaseId ?? '') || !/^[a-f0-9]{40}$/.test(manifest.releaseCommit ?? '')) add('release_identity_invalid', 'Release requires a stable ID and full Git commit')
  if (!SHA256.test(manifest.inventoryHash ?? '') || manifest.inventoryHash !== canonical.inventoryHash || canonical.observations?.inventoryHash !== canonical.inventoryHash) add('inventory_mismatch', 'Manifest, observations, and canonical inventory must share one hash')
  if (canonical.observations?.ok !== true || canonical.observations?.commands?.length === 0 || canonical.observations.commands.some((command) => command.exitCode !== 0) || manifest.localProof?.failedCommands !== 0 || manifest.localProof?.observationCount !== canonical.observations?.commands?.length) add('observation_failure', 'Every canonical observation must be current and GREEN')
  const dependencyTotal = Number(canonical.dependencyAudit?.production?.total ?? 0) + Number(canonical.dependencyAudit?.devOnly?.total ?? 0)
  if (dependencyTotal !== 0 || manifest.localProof?.dependencyVulnerabilities !== 0) add('dependency_vulnerability', 'Release proof requires zero known dependency vulnerabilities')

  const safeIds = canonical.safeWorkstreamIds ?? []
  const completedIds = canonical.completedIds ?? []
  const checkpointMap = new Map((manifest.checkpoints ?? []).map((checkpoint) => [checkpoint.workstreamId, checkpoint]))
  const checkpointInvalid = completedIds.some((id) => {
    const checkpoint = checkpointMap.get(id)
    return !checkpoint || !checkpoint.commit || !SHA256.test(checkpoint.inventoryHash ?? '')
  })
  if (checkpointInvalid
      || new Set(completedIds).size !== completedIds.length
      || manifest.localProof?.completedSafeWorkstreams !== completedIds.length
      || manifest.localProof?.totalSafeWorkstreams !== safeIds.length) add('checkpoint_reconciliation_failed', 'Completed workstreams must reconcile to unique commit-bound GREEN checkpoints')

  for (const key of REQUIRED_EVIDENCE_KEYS) {
    const evidence = manifest.evidenceHashes?.[key]
    if (!evidence?.path || !SHA256.test(evidence?.sha256 ?? '')) add('evidence_hash_missing', `Required evidence is not path/hash bound: ${key}`)
  }
  const requirements = manifest.runtimeRequirements ?? []
  if (requirements.length === 0 || requirements.some((name) => !/^[A-Z][A-Z0-9_]*$/.test(name))) add('runtime_secret_value_present', 'Runtime manifest must contain variable names only, never values')
  if (manifest.trust?.academyCertification !== 'uncertified') add('academy_certification_fabricated', 'Release proof cannot fabricate Academy certification')
  if (!['practice_only', 'untrusted_current_runtime'].includes(manifest.trust?.labTrust) || manifest.trust?.labEvidence !== 'practice_only') add('lab_trust_fabricated', 'Release proof cannot promote lab trust or mastery evidence')

  const readyForCheckpoint = canonical.currentId === 'release-readiness'
    && canonical.currentBoundary === 'safe_local'
    && completedIds.length === safeIds.length - 1
  const localCandidate = completedIds.length === safeIds.length && canonical.currentBoundary !== 'safe_local'
  const expectedStatus = localCandidate ? 'local_production_candidate' : readyForCheckpoint ? 'ready_for_release_checkpoint' : null
  if (!expectedStatus || manifest.status !== expectedStatus) add('release_status_invalid', 'Release status does not match the canonical workstream state')

  if (!manifest.rollback?.runbook
      || (manifest.rollback.triggers?.length ?? 0) < 3
      || (manifest.rollback.verification?.length ?? 0) < 3) add('rollback_contract_missing', 'Release requires a runbook, objective triggers, and post-rollback verification')
  const external = new Map((manifest.externalBoundaries ?? []).map((item) => [item.id, item.status]))
  if (REQUIRED_EXTERNAL_BOUNDARIES.some((id) => external.get(id) !== 'approval_required')) add('external_boundary_missing', 'Every staging, integration, lab, and human-review boundary must remain approval-required')

  const handoff = input?.handoffSource ?? ''
  for (const token of ['Local Production Candidate is not deployment approval', 'Pre-deploy', 'Staging', 'Post-deploy', 'Rollback triggers', 'External approval', 'Academy remains uncertified', 'Labs remain practice-only', 'Evidence hashes']) {
    if (!handoff.includes(token)) {
      add('handoff_incomplete', `Release handoff is missing: ${token}`, 'high')
      break
    }
  }
  return findings
}
