import { validateStagingPreviewTarget } from './preview-target.mjs'

export const STAGING_HTTP_PROBES = Object.freeze([
  { method: 'GET', route: '/', expectedStatus: 200 },
  { method: 'GET', route: '/services', expectedStatus: 200 },
  { method: 'GET', route: '/work', expectedStatus: 200 },
  { method: 'GET', route: '/pricing', expectedStatus: 200 },
  { method: 'GET', route: '/blog', expectedStatus: 200 },
  { method: 'GET', route: '/contact', expectedStatus: 200 },
  { method: 'GET', route: '/academy', expectedStatus: 200 },
  { method: 'GET', route: '/academy/catalog', expectedStatus: 200 },
  { method: 'GET', route: '/academy/method', expectedStatus: 200 },
  { method: 'GET', route: '/academy/labs', expectedStatus: 200 },
  { method: 'GET', route: '/academy/try', expectedStatus: 200 },
  { method: 'GET', route: '/login', expectedStatus: 200 },
  { method: 'GET', route: '/api/quality', expectedStatus: 200 },
  { method: 'GET', route: '/portal', expectedStatus: 503 },
  { method: 'GET', route: '/admin', expectedStatus: 503 },
  { method: 'GET', route: '/api/health', expectedStatus: 503 },
  { method: 'GET', route: '/api/cron/discord/daily/publish', expectedStatus: 503 },
  { method: 'POST', route: '/api/academy/billing/portal', expectedStatus: 503, body: '{}' },
  { method: 'POST', route: '/api/checkout', expectedStatus: 400, body: '{}' },
  { method: 'POST', route: '/api/stripe/webhook', expectedStatus: 503, body: '{}' },
  { method: 'POST', route: '/api/academy/waitlist', expectedStatus: 400, body: '{}' },
  { method: 'POST', route: '/api/contact', expectedStatus: 400, body: '{}' },
])

export const REQUIRED_STAGING_HEADERS = Object.freeze([
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'x-robots-tag',
])

const EXPECTED_PROJECT = 'sageideas-academy-staging'
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

function probeKey(probe) {
  return `${probe.method} ${probe.route}`
}

function deploymentFindings(expected, deployment) {
  const findings = []
  let target = null
  try {
    target = validateStagingPreviewTarget(expected?.baseURL)
  } catch {
    findings.push(finding('unsafe_staging_target', 'The target is not an immutable SageIdeas staging Preview URL.'))
  }
  if (!DEPLOYMENT_ID.test(expected?.deploymentId ?? '') || deployment?.id !== expected?.deploymentId) {
    findings.push(finding('deployment_id_mismatch', 'The observed deployment ID does not match the approved deployment.'))
  }
  if (deployment?.name !== EXPECTED_PROJECT) {
    findings.push(finding('deployment_project_mismatch', 'The deployment is not owned by the isolated SageIdeas staging project.'))
  }
  if (deployment?.readyState !== 'READY') {
    findings.push(finding('deployment_not_ready', 'The staging deployment is not READY.'))
  }
  if (deployment?.target === 'production') {
    findings.push(finding('production_target_detected', 'The staging verifier refuses a Vercel production target.'))
  }
  if (!target || deployment?.url !== target.hostname) {
    findings.push(finding('deployment_url_mismatch', 'The observed deployment URL does not match the immutable staging target.'))
  }
  if (!SHA.test(expected?.commitSha ?? '') || deployment?.meta?.gitCommitSha !== expected?.commitSha) {
    findings.push(finding('commit_mismatch', 'The deployment commit does not match the approved Git commit.'))
  }
  if (typeof expected?.branch !== 'string' || deployment?.meta?.gitCommitRef !== expected?.branch) {
    findings.push(finding('branch_mismatch', 'The deployment branch does not match the approved branch.'))
  }
  return findings
}

function headerIsValid(name, value) {
  const normalized = String(value ?? '').toLowerCase()
  if (name === 'strict-transport-security') return /max-age=(?:[6-9]\d{7}|\d{9,})/.test(normalized) && normalized.includes('includesubdomains')
  if (name === 'content-security-policy') return ["default-src 'self'", "base-uri 'self'", "object-src 'none'", 'frame-ancestors'].every((token) => normalized.includes(token))
  if (name === 'x-content-type-options') return normalized === 'nosniff'
  if (name === 'x-frame-options') return ['sameorigin', 'deny'].includes(normalized)
  if (name === 'referrer-policy') return ['strict-origin-when-cross-origin', 'no-referrer'].includes(normalized)
  if (name === 'permissions-policy') return normalized.length > 0
  if (name === 'x-robots-tag') return normalized.split(',').some((token) => token.trim() === 'noindex')
  return false
}

function safeVercelSsoLocation(value) {
  try {
    const location = new URL(value)
    if (location.protocol === 'https:' && location.hostname === 'vercel.com' && location.pathname === '/sso-api') {
      return `${location.origin}${location.pathname}`
    }
  } catch {
    // A missing or malformed redirect is handled by the protection contract.
  }
  return null
}

export function auditStagingHttpFixture(input) {
  const findings = deploymentFindings(input?.expected, input?.deployment)
  const observed = new Map((input?.probes ?? []).map((probe) => [probeKey(probe), probe]))
  const required = new Map(STAGING_HTTP_PROBES.map((probe) => [probeKey(probe), probe]))
  for (const [key, contract] of required) {
    const probe = observed.get(key)
    if (!probe) {
      findings.push(finding('probe_missing', `Required staging probe is missing: ${key}.`))
      continue
    }
    if (probe.expectedStatus !== contract.expectedStatus) {
      findings.push(finding('probe_contract_mismatch', `Probe expectation was changed for ${key}.`))
    }
    if (probe.actualStatus === null) {
      findings.push(finding('probe_request_failed', `Probe request failed without a response: ${key}.`))
    }
    if (probe.actualStatus !== contract.expectedStatus) {
      findings.push(finding('probe_status_mismatch', `Probe returned ${probe.actualStatus} instead of ${contract.expectedStatus}: ${key}.`))
    }
  }
  for (const key of observed.keys()) {
    if (!required.has(key)) findings.push(finding('unexpected_probe', `Unapproved staging probe was supplied: ${key}.`))
  }
  for (const name of REQUIRED_STAGING_HEADERS) {
    if (!input?.headers?.[name]) findings.push(finding('security_header_missing', `Required staging header is missing: ${name}.`))
    else if (!headerIsValid(name, input.headers[name])) findings.push(finding('security_header_invalid', `Required staging header is invalid: ${name}.`))
  }
  const protectedByVercel = safeVercelSsoLocation(input?.publicProtection?.location) !== null
  if (input?.publicProtection?.actualStatus !== 302
      || !String(input?.publicProtection?.robotsTag ?? '').toLowerCase().includes('noindex')
      || !protectedByVercel) {
    findings.push(finding('public_protection_missing', 'Staging must remain access-protected and noindex.'))
  }
  if (JSON.stringify(input?.trust ?? {}) !== JSON.stringify(TRUST)) {
    findings.push(finding('trust_promotion_attempt', 'Stateless staging evidence cannot promote Academy certification or lab trust.'))
  }
  return findings
}

function safeDeployment(deployment) {
  return {
    id: deployment.id,
    name: deployment.name,
    url: deployment.url,
    readyState: deployment.readyState,
    target: deployment.target ?? null,
    meta: {
      gitCommitSha: deployment.meta?.gitCommitSha ?? null,
      gitCommitRef: deployment.meta?.gitCommitRef ?? null,
    },
  }
}

export async function runStagingHttpAudit({ expected, deployment, bypassSecret, fetchImpl = fetch, generatedAt = new Date().toISOString() }) {
  const identityFailures = deploymentFindings(expected, deployment)
  if (identityFailures.length) throw new Error(`Staging preflight refused: ${identityFailures.map((item) => item.code).join(', ')}`)
  if (typeof bypassSecret !== 'string' || bypassSecret.trim().length < 16 || bypassSecret.length > 512 || /[\r\n]/.test(bypassSecret)) {
    throw new Error('STAGING_BYPASS_SECRET is missing or invalid.')
  }

  const target = validateStagingPreviewTarget(expected.baseURL)
  const probes = []
  let rootHeaders = null
  for (const contract of STAGING_HTTP_PROBES) {
    const headers = { 'x-vercel-protection-bypass': bypassSecret }
    if (contract.method === 'POST') headers['content-type'] = 'application/json'
    try {
      const response = await fetchImpl(new URL(contract.route, target), {
        method: contract.method,
        headers,
        body: contract.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      })
      if (contract.route === '/' && contract.method === 'GET') rootHeaders = response.headers
      probes.push({
        method: contract.method,
        route: contract.route,
        expectedStatus: contract.expectedStatus,
        actualStatus: response.status,
      })
    } catch {
      probes.push({
        method: contract.method,
        route: contract.route,
        expectedStatus: contract.expectedStatus,
        actualStatus: null,
      })
    }
  }
  let publicResponse = null
  try {
    publicResponse = await fetchImpl(target, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    publicResponse = null
  }
  const headers = Object.fromEntries(REQUIRED_STAGING_HEADERS.map((name) => [name, rootHeaders?.get(name) ?? null]))
  const fixture = {
    expected: { ...expected, baseURL: target.origin },
    deployment: safeDeployment(deployment),
    probes,
    headers,
    publicProtection: {
      expectedStatus: 302,
      actualStatus: publicResponse?.status ?? null,
      robotsTag: publicResponse?.headers.get('x-robots-tag') ?? null,
      location: safeVercelSsoLocation(publicResponse?.headers.get('location')),
    },
    trust: { ...TRUST },
  }
  const findings = auditStagingHttpFixture(fixture)
  return {
    schemaVersion: 1,
    generatedAt,
    status: findings.length === 0 ? 'pass' : 'fail',
    classification: findings.length === 0 ? 'stateless_staging_verified' : 'staging_http_failed',
    expected: fixture.expected,
    deployment: fixture.deployment,
    summary: {
      requiredProbes: STAGING_HTTP_PROBES.length,
      passedProbes: probes.filter((probe) => probe.actualStatus === probe.expectedStatus).length,
      requiredHeaders: REQUIRED_STAGING_HEADERS.length,
      passedHeaders: REQUIRED_STAGING_HEADERS.filter((name) => headerIsValid(name, headers[name])).length,
    },
    probes,
    headers,
    publicProtection: fixture.publicProtection,
    findings,
    trust: fixture.trust,
    blockedCapabilities: [
      'hosted_migrations',
      'database_restore',
      'authenticated_integrations',
      'controlled_lab_runtime',
      'human_review_beta',
      'production_deployment',
    ],
  }
}
