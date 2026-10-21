import { validateStagingPreviewTarget } from './preview-target.mjs'

export const EXPECTED_STAGING_BROWSER_TESTS = 15

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

function safeTests(tests) {
  return (Array.isArray(tests) ? tests : []).map((result) => ({
    title: typeof result?.title === 'string' ? result.title : '',
    status: typeof result?.status === 'string' ? result.status : 'unknown',
    durationMs: Number.isFinite(result?.durationMs) && result.durationMs >= 0
      ? Math.round(result.durationMs)
      : 0,
  }))
}

export function auditStagingBrowserFixture(input) {
  const findings = []
  try {
    validateStagingPreviewTarget(input?.expected?.baseURL)
  } catch {
    findings.push(finding('unsafe_staging_target', 'The browser proof target is not an immutable SageIdeas staging Preview URL.'))
  }

  if (!DEPLOYMENT_ID.test(input?.expected?.deploymentId ?? '')
      || !SHA.test(input?.expected?.commitSha ?? '')
      || typeof input?.expected?.branch !== 'string'
      || input.expected.branch.length === 0) {
    findings.push(finding('deployment_identity_invalid', 'The browser proof is not bound to a valid deployment, commit, and branch identity.'))
  }

  const tests = Array.isArray(input?.tests) ? input.tests : []
  const expectedTests = input?.summary?.expectedTests
  const observedTests = input?.summary?.observedTests
  const uniqueTitles = new Set(tests.map((result) => result?.title))
  if (expectedTests !== EXPECTED_STAGING_BROWSER_TESTS
      || observedTests !== EXPECTED_STAGING_BROWSER_TESTS
      || tests.length !== EXPECTED_STAGING_BROWSER_TESTS
      || uniqueTitles.size !== EXPECTED_STAGING_BROWSER_TESTS) {
    findings.push(finding('browser_suite_incomplete', `Hosted browser proof must contain exactly ${EXPECTED_STAGING_BROWSER_TESTS} distinct test results.`))
  }

  const passed = tests.filter((result) => result?.status === 'passed').length
  const failed = tests.length - passed
  if (input?.status !== 'pass'
      || input?.resultStatus !== 'passed'
      || failed > 0
      || input?.summary?.passed !== passed
      || input?.summary?.failed !== failed) {
    findings.push(finding('browser_test_failed', 'One or more hosted browser checks failed or the result summary is inconsistent.'))
  }

  if (JSON.stringify(input?.trust ?? {}) !== JSON.stringify(TRUST)) {
    findings.push(finding('trust_promotion_attempt', 'Hosted browser evidence cannot promote Academy certification or lab trust.'))
  }
  return findings
}

export function buildStagingBrowserEvidence({
  expected,
  resultStatus,
  expectedTests,
  tests,
  generatedAt = new Date().toISOString(),
}) {
  const normalizedTests = safeTests(tests)
  const passed = normalizedTests.filter((result) => result.status === 'passed').length
  const failed = normalizedTests.length - passed
  const candidate = {
    schemaVersion: 1,
    generatedAt,
    status: resultStatus === 'passed' && failed === 0 ? 'pass' : 'fail',
    classification: resultStatus === 'passed' && failed === 0
      ? 'hosted_browser_verified'
      : 'hosted_browser_failed',
    resultStatus,
    expected: {
      baseURL: expected?.baseURL,
      deploymentId: expected?.deploymentId,
      commitSha: expected?.commitSha,
      branch: expected?.branch,
    },
    summary: {
      expectedTests,
      observedTests: normalizedTests.length,
      passed,
      failed,
    },
    tests: normalizedTests,
    trust: { ...TRUST },
    blockedCapabilities: [
      'hosted_migrations',
      'database_restore',
      'authenticated_integrations',
      'controlled_lab_runtime',
      'human_review_beta',
      'production_deployment',
    ],
  }
  const findings = auditStagingBrowserFixture(candidate)
  return {
    ...candidate,
    status: findings.length === 0 ? 'pass' : 'fail',
    classification: findings.length === 0 ? 'hosted_browser_verified' : 'hosted_browser_failed',
    findings,
  }
}
