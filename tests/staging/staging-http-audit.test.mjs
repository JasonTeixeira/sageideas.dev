import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  REQUIRED_STAGING_HEADERS,
  STAGING_HTTP_PROBES,
  auditStagingHttpFixture,
  runStagingHttpAudit,
} from '../../lib/staging/http-audit.mjs'

const baseURL = 'https://sageideas-academy-staging-btqq5jasl-sage-ideas.vercel.app'
const deploymentId = 'dpl_4XUZE6HwCKz8AHidpiq61gg9sGcx'
const commitSha = 'a0098a861d68480f68810c48d2cb2e71befb5e55'
const branch = 'production/01-program-loop-v1'

const deployment = {
  id: deploymentId,
  name: 'sageideas-academy-staging',
  url: new URL(baseURL).hostname,
  readyState: 'READY',
  target: null,
  meta: { gitCommitSha: commitSha, gitCommitRef: branch },
}

const securityHeaders = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=()',
  'x-robots-tag': 'noindex',
}

function knownGoodFixture() {
  return {
    expected: { baseURL, deploymentId, commitSha, branch },
    deployment,
    probes: STAGING_HTTP_PROBES.map((probe) => ({ ...probe, actualStatus: probe.expectedStatus })),
    headers: securityHeaders,
    publicProtection: {
      expectedStatus: 302,
      actualStatus: 302,
      robotsTag: 'noindex',
      location: 'https://vercel.com/sso-api?url=https%3A%2F%2Fexample.test',
    },
    trust: {
      academyCertification: 'uncertified',
      labTrust: 'untrusted_current_runtime',
      labEvidence: 'practice_only',
    },
  }
}

test('known-good stateless staging evidence passes every allowlisted contract', () => {
  const findings = auditStagingHttpFixture(knownGoodFixture())
  assert.deepEqual(findings, [])
  assert.equal(STAGING_HTTP_PROBES.length, 22)
  assert.equal(REQUIRED_STAGING_HEADERS.length, 7)
  assert(STAGING_HTTP_PROBES.every((probe) => ['GET', 'POST'].includes(probe.method)))
  assert(STAGING_HTTP_PROBES.filter((probe) => probe.method === 'POST').every((probe) => probe.body === '{}'))
})

test('deliberately broken staging fixture fails closed across identity, routes, headers, protection, and trust', () => {
  const broken = JSON.parse(readFileSync('tests/staging/fixtures/known-broken.json', 'utf8'))
  const codes = new Set(auditStagingHttpFixture(broken).map((finding) => finding.code))
  for (const code of [
    'unsafe_staging_target',
    'deployment_id_mismatch',
    'deployment_project_mismatch',
    'deployment_not_ready',
    'production_target_detected',
    'deployment_url_mismatch',
    'commit_mismatch',
    'branch_mismatch',
    'probe_missing',
    'probe_status_mismatch',
    'security_header_missing',
    'public_protection_missing',
    'trust_promotion_attempt',
  ]) assert.ok(codes.has(code), `expected broken fixture finding: ${code}`)
})

test('runtime audit scopes the bypass to the approved origin and never serializes it', async () => {
  const bypassSecret = 'staging-bypass-must-never-appear-in-evidence'
  const requests = []
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input)
    const headers = new Headers(init.headers)
    requests.push({ url: url.href, method: init.method ?? 'GET', bypass: headers.get('x-vercel-protection-bypass') })
    const isProtectedRequest = headers.has('x-vercel-protection-bypass')
    if (!isProtectedRequest) {
      return new Response(null, {
        status: 302,
        headers: {
          'x-robots-tag': 'noindex',
          location: 'https://vercel.com/sso-api?url=https%3A%2F%2Fexample.test&nonce=secret-nonce',
        },
      })
    }
    const probe = STAGING_HTTP_PROBES.find((candidate) => candidate.method === (init.method ?? 'GET') && candidate.route === url.pathname)
    assert(probe, `unexpected request: ${init.method ?? 'GET'} ${url.pathname}`)
    return new Response(null, { status: probe.expectedStatus, headers: url.pathname === '/' ? securityHeaders : {} })
  }

  const evidence = await runStagingHttpAudit({
    expected: { baseURL, deploymentId, commitSha, branch },
    deployment,
    bypassSecret,
    fetchImpl,
    generatedAt: '2026-09-05T19:15:00.000Z',
  })

  assert.equal(evidence.status, 'pass')
  assert.equal(evidence.classification, 'stateless_staging_verified')
  assert.equal(evidence.summary.passedProbes, 22)
  assert.equal(evidence.summary.requiredProbes, 22)
  assert.equal(requests.length, 23)
  assert(requests.slice(0, 22).every((request) => request.bypass === bypassSecret && new URL(request.url).origin === baseURL))
  assert.equal(requests.at(-1).bypass, null)
  assert.equal(JSON.stringify(evidence).includes(bypassSecret), false)
  assert.equal(evidence.publicProtection.location, 'https://vercel.com/sso-api')
  assert.equal(JSON.stringify(evidence).includes('secret-nonce'), false)
  assert.deepEqual(evidence.trust, {
    academyCertification: 'uncertified',
    labTrust: 'untrusted_current_runtime',
    labEvidence: 'practice_only',
  })
})

test('runtime request failures produce sanitized fail-closed evidence', async () => {
  const bypassSecret = 'another-secret-that-must-not-be-recorded'
  let calls = 0
  const fetchImpl = async () => {
    calls += 1
    if (calls === 1) throw new Error(`provider failure ${bypassSecret}`)
    return new Response(null, {
      status: calls === STAGING_HTTP_PROBES.length + 1 ? 302 : STAGING_HTTP_PROBES[calls - 1].expectedStatus,
      headers: calls === STAGING_HTTP_PROBES.length + 1
        ? { 'x-robots-tag': 'noindex', location: 'https://vercel.com/sso-api' }
        : {},
    })
  }

  const evidence = await runStagingHttpAudit({
    expected: { baseURL, deploymentId, commitSha, branch },
    deployment,
    bypassSecret,
    fetchImpl,
  })

  assert.equal(evidence.status, 'fail')
  assert(evidence.findings.some((finding) => finding.code === 'probe_request_failed'))
  assert.equal(JSON.stringify(evidence).includes('provider failure'), false)
  assert.equal(JSON.stringify(evidence).includes(bypassSecret), false)
})

test('runtime preflight refuses mismatched deployment identity before any request', async () => {
  let calls = 0
  await assert.rejects(
    runStagingHttpAudit({
      expected: { baseURL, deploymentId, commitSha, branch },
      deployment: { ...deployment, target: 'production' },
      bypassSecret: 'valid-staging-bypass-secret',
      fetchImpl: async () => { calls += 1 },
    }),
    /production_target_detected/,
  )
  assert.equal(calls, 0)
})

test('package scripts expose separate deterministic tests and approved hosted execution', () => {
  const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts
  assert.equal(scripts['test:staging:http'], 'node --test tests/staging/staging-http-audit.test.mjs')
  assert.equal(scripts['staging:http:verify'], 'node tools/staging/verify-http.mjs')
  assert.equal(scripts['staging:rollback:verify'], 'node tools/staging/verify-rollback.mjs')
  assert.equal(scripts['staging:readiness:audit'], 'node tools/staging/write-production-readiness-audit.mjs')
})
