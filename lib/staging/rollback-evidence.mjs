import { isApprovedStagingPreviewHostname } from './preview-target.mjs'

const PROJECT = 'sageideas-academy-staging'
const DRILL_ALIAS = 'sageideas-academy-staging-drill.vercel.app'
const SHA = /^[a-f0-9]{40}$/
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/
const TRUST = Object.freeze({
  academyCertification: 'uncertified',
  labTrust: 'untrusted_current_runtime',
  labEvidence: 'practice_only',
})

function finding(code, message, severity = 'critical') {
  return { code, severity, message }
}

function safeSsoLocation(value) {
  try {
    const location = new URL(value)
    if (location.protocol === 'https:' && location.hostname === 'vercel.com' && location.pathname === '/sso-api') {
      return `${location.origin}${location.pathname}`
    }
  } catch {
    // Invalid protection evidence is rejected below.
  }
  return null
}

function deploymentIsSafe(deployment) {
  return DEPLOYMENT_ID.test(deployment?.id ?? '')
    && deployment?.name === PROJECT
    && isApprovedStagingPreviewHostname(deployment?.url ?? '')
    && deployment?.readyState === 'READY'
    && deployment?.target !== 'production'
    && SHA.test(deployment?.meta?.gitCommitSha ?? '')
    && typeof deployment?.meta?.gitCommitRef === 'string'
    && deployment.meta.gitCommitRef.length > 0
}

function safeDeployment(deployment) {
  return {
    id: deployment?.id ?? null,
    name: deployment?.name ?? null,
    url: deployment?.url ?? null,
    readyState: deployment?.readyState ?? null,
    target: deployment?.target ?? null,
    meta: {
      gitCommitSha: deployment?.meta?.gitCommitSha ?? null,
      gitCommitRef: deployment?.meta?.gitCommitRef ?? null,
    },
  }
}

export function auditStagingRollbackFixture(input) {
  const findings = validateStagingRollbackTargets(input)
  if (!['baseline', 'rollback', 'restored'].every((key) => input?.checks?.[key] === 200)) {
    findings.push(finding('rollback_probe_failed', 'Every quality probe must return 200 during the rollback sequence.'))
  }
  if (input?.bindings?.baseline !== input?.baseline?.id
      || input?.bindings?.rollback !== input?.rollback?.id
      || input?.bindings?.restored !== input?.baseline?.id) {
    findings.push(finding('alias_binding_mismatch', 'Provider alias state did not match every intended deployment transition.'))
  }
  if (input?.restoredDeploymentId !== input?.baseline?.id || input?.restored !== true) {
    findings.push(finding('baseline_not_restored', 'The drill alias was not proven restored to its starting deployment.'))
  }
  if (input?.publicProtection?.status !== 302 || safeSsoLocation(input?.publicProtection?.location) === null) {
    findings.push(finding('public_protection_missing', 'The restored drill alias must remain protected by Vercel Authentication.'))
  }
  if (JSON.stringify(input?.trust ?? {}) !== JSON.stringify(TRUST)) {
    findings.push(finding('trust_promotion_attempt', 'A deployment rollback drill cannot promote Academy certification or lab trust.'))
  }
  return findings
}

export function validateStagingRollbackTargets(input) {
  const findings = []
  if (!deploymentIsSafe(input?.baseline) || !deploymentIsSafe(input?.rollback)) {
    findings.push(finding('unsafe_deployment', 'Rollback proof must use two READY Preview deployments from the isolated staging project.'))
  }
  if (input?.baseline?.id === input?.rollback?.id) {
    findings.push(finding('rollback_target_unchanged', 'The rollback deployment must differ from the baseline deployment.'))
  }
  if (input?.alias !== DRILL_ALIAS) {
    findings.push(finding('unsafe_rollback_alias', 'The drill may mutate only the dedicated isolated staging alias.'))
  }
  return findings
}

export function buildStagingRollbackEvidence({
  baseline,
  rollback,
  alias,
  checks,
  bindings,
  restoredDeploymentId,
  publicProtection,
  generatedAt = new Date().toISOString(),
}) {
  const candidate = {
    schemaVersion: 1,
    generatedAt,
    status: 'fail',
    classification: 'isolated_application_rollback_failed',
    target: typeof baseline?.url === 'string' ? `https://${baseline.url}` : null,
    alias,
    baselineDeploymentId: baseline?.id ?? null,
    rollbackDeploymentId: rollback?.id ?? null,
    restoredDeploymentId: restoredDeploymentId ?? null,
    restored: restoredDeploymentId === baseline?.id,
    baseline: safeDeployment(baseline),
    rollback: safeDeployment(rollback),
    checks: {
      baseline: checks?.baseline ?? null,
      rollback: checks?.rollback ?? null,
      restored: checks?.restored ?? null,
    },
    bindings: {
      baseline: bindings?.baseline ?? null,
      rollback: bindings?.rollback ?? null,
      restored: bindings?.restored ?? null,
    },
    publicProtection: {
      status: publicProtection?.status ?? null,
      location: safeSsoLocation(publicProtection?.location),
    },
    trust: { ...TRUST },
  }
  const findings = auditStagingRollbackFixture(candidate)
  return {
    ...candidate,
    status: findings.length === 0 ? 'pass' : 'fail',
    classification: findings.length === 0
      ? 'isolated_application_rollback_verified'
      : 'isolated_application_rollback_failed',
    findings,
  }
}
