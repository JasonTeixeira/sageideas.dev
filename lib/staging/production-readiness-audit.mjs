import { validateStagingPreviewTarget } from './preview-target.mjs'

const TRUST = Object.freeze({
  academyCertification: 'uncertified',
  labTrust: 'untrusted_current_runtime',
  labEvidence: 'practice_only',
})

const LAB_GATES = Object.freeze([
  'manifest_valid',
  'private_pack_valid',
  'isolated_runtime',
  'digest_pinned_images',
  'migrations_applied',
  'managed_runtime_binding',
  'reference_solutions_passed',
  'adversarial_probes_passed',
  'receipts_reconciled',
  'monitoring_ready',
  'kill_switch_ready',
])

function finding(code, message, severity = 'critical') {
  return { code, severity, message }
}

function evidenceGate(evidence, valid, passClassification) {
  if (!evidence) return { status: 'blocked', evidence: 'not_supplied' }
  if (valid) return { status: 'pass', evidence: passClassification }
  return { status: 'fail', evidence: evidence.status ?? 'invalid' }
}

function fixedBlocked(reason) {
  return { status: 'blocked', evidence: reason }
}

function sameIdentity(left, right) {
  if (!left || !right) return false
  return ['baseURL', 'deploymentId', 'commitSha', 'branch'].every((key) => left[key] === right[key])
}

function validTrust(value) {
  return JSON.stringify(value) === JSON.stringify(TRUST)
}

export function buildStagingProductionReadinessAudit({
  release,
  http,
  browser,
  rollback,
  labs,
  generatedAt = new Date().toISOString(),
} = {}) {
  const findings = []
  if (release?.status !== 'local_production_candidate') {
    findings.push(finding('local_candidate_missing', 'The canonical release is not a Local Production Candidate.'))
  }

  for (const candidate of [http?.expected?.baseURL, browser?.expected?.baseURL].filter(Boolean)) {
    try {
      validateStagingPreviewTarget(candidate)
    } catch {
      if (!findings.some((item) => item.code === 'unsafe_staging_target')) {
        findings.push(finding('unsafe_staging_target', 'A hosted proof targets something other than an immutable isolated staging Preview.'))
      }
    }
  }
  if (http && browser && !sameIdentity(http.expected, browser.expected)) {
    findings.push(finding('staging_identity_mismatch', 'HTTP and browser evidence are not bound to the same deployment identity.'))
  }

  const httpValid = http?.status === 'pass'
    && http?.classification === 'stateless_staging_verified'
    && Array.isArray(http?.findings)
    && http.findings.length === 0
    && http?.summary?.requiredProbes === 22
    && http?.summary?.passedProbes === 22
    && http?.summary?.requiredHeaders === 7
    && http?.summary?.passedHeaders === 7
  const browserValid = browser?.status === 'pass'
    && browser?.classification === 'hosted_browser_verified'
    && Array.isArray(browser?.findings)
    && browser.findings.length === 0
    && browser?.summary?.expectedTests === 15
    && browser?.summary?.observedTests === 15
    && browser?.summary?.passed === 15
    && browser?.summary?.failed === 0
  if ((http && !httpValid) || (browser && !browserValid)) {
    findings.push(finding('staging_evidence_invalid', 'A hosted pass label is missing its complete deterministic proof contract.'))
  }

  let rollbackGate = fixedBlocked('deployment_rollback_evidence_not_supplied')
  if (rollback) {
    const checksPassed = ['baseline', 'rollback', 'restored'].every((key) => rollback?.checks?.[key] === 200)
    const bindingsPassed = rollback?.bindings?.baseline === rollback?.baselineDeploymentId
      && rollback?.bindings?.rollback === rollback?.rollbackDeploymentId
      && rollback?.bindings?.restored === rollback?.baselineDeploymentId
    const identityMatches = http
      && rollback.target === http.expected?.baseURL
      && rollback.baselineDeploymentId === http.expected?.deploymentId
      && rollback.restoredDeploymentId === rollback.baselineDeploymentId
    if (rollback.status === 'pass' && rollback.restored === true && checksPassed && bindingsPassed && identityMatches) {
      rollbackGate = { status: 'pass', evidence: 'isolated_alias_rollback_and_restore_verified' }
    } else {
      rollbackGate = { status: 'fail', evidence: 'rollback_restore_unproven' }
      findings.push(finding('rollback_restore_unproven', 'The isolated application rollback was not proven and restored to the approved baseline.'))
    }
  }

  let labGate = fixedBlocked('controlled_lab_activation_evidence_pending')
  if (labs && labs.status !== 'blocked') {
    const allPassed = LAB_GATES.every((gate) => labs?.gates?.[gate] === true)
    if (labs.status === 'pass' && allPassed) {
      labGate = { status: 'pass', evidence: 'release_bound_controlled_lab_gates_passed' }
    } else {
      labGate = { status: 'fail', evidence: 'controlled_lab_evidence_invalid' }
      findings.push(finding('controlled_lab_evidence_invalid', 'Controlled lab readiness was claimed without every required release-bound gate.'))
    }
  }

  for (const evidence of [release, http, browser, rollback].filter(Boolean)) {
    if (!validTrust(evidence.trust)) {
      findings.push(finding('trust_promotion_attempt', 'Staging readiness evidence cannot promote Academy certification or lab trust.'))
      break
    }
  }

  const gates = {
    local_production_candidate: release?.status === 'local_production_candidate'
      ? { status: 'pass', evidence: 'canonical_release_manifest' }
      : { status: 'fail', evidence: release?.status ?? 'not_supplied' },
    stateless_http: evidenceGate(http, httpValid, 'identity_bound_routes_headers_and_protection'),
    hosted_browser: evidenceGate(browser, browserValid, 'identity_bound_accessibility_responsive_and_hydration_suite'),
    application_rollback: rollbackGate,
    hosted_migrations: fixedBlocked('designated_supabase_staging_project_not_supplied'),
    database_restore: fixedBlocked('designated_supabase_staging_project_not_supplied'),
    authenticated_integrations: fixedBlocked('credentialed_staging_configuration_not_supplied'),
    controlled_lab_runtime: labGate,
    human_review: { status: 'approval_required', evidence: 'human_review_boundary' },
    production_deployment: { status: 'approval_required', evidence: 'production_deployment_boundary' },
  }

  const summary = Object.values(gates).reduce((counts, gate) => {
    const key = gate.status === 'approval_required' ? 'approvalRequired' : gate.status
    counts[key] += 1
    return counts
  }, { pass: 0, fail: 0, blocked: 0, approvalRequired: 0 })
  const statelessVerified = findings.length === 0
    && ['local_production_candidate', 'stateless_http', 'hosted_browser', 'application_rollback']
      .every((name) => gates[name].status === 'pass')

  return {
    schemaVersion: 1,
    generatedAt,
    status: 'not_production_ready',
    classification: findings.length > 0
      ? 'staging_verification_failed'
      : statelessVerified
        ? 'stateless_staging_verified_external_evidence_pending'
        : 'staging_evidence_incomplete',
    summary,
    gates,
    findings,
    trust: { ...TRUST },
    stopBoundary: 'human_review_or_production_deployment',
  }
}
