import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildStagingRollbackEvidence,
  validateStagingRollbackTargets,
} from '../../lib/staging/rollback-evidence.mjs'

const SCOPE = 'sage-ideas'
const ALIAS = 'sageideas-academy-staging-drill.vercel.app'
const destination = path.resolve('docs/evidence/project-loop/staging-rollback-latest.json')
const baselineId = process.env.STAGING_BASELINE_DEPLOYMENT_ID ?? ''
const rollbackId = process.env.STAGING_ROLLBACK_DEPLOYMENT_ID ?? ''
const bypassSecret = process.env.STAGING_BYPASS_SECRET ?? ''
const providerEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => name !== 'STAGING_BYPASS_SECRET'),
)

if (!/^dpl_[A-Za-z0-9]+$/.test(baselineId) || !/^dpl_[A-Za-z0-9]+$/.test(rollbackId) || baselineId === rollbackId) {
  throw new Error('Two distinct valid staging deployment IDs are required.')
}
if (bypassSecret.trim().length < 16 || bypassSecret.length > 512 || /[\r\n]/.test(bypassSecret)) {
  throw new Error('STAGING_BYPASS_SECRET is missing or invalid.')
}

function vercelJson(deploymentId) {
  const output = execFileSync('vercel', ['api', `/v13/deployments/${deploymentId}`, '--scope', SCOPE], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: providerEnvironment,
  })
  return JSON.parse(output)
}

function setAlias(deployment) {
  execFileSync('vercel', ['alias', 'set', `https://${deployment.url}`, ALIAS, '--scope', SCOPE], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: providerEnvironment,
  })
}

function aliasDeploymentId() {
  const output = execFileSync('vercel', ['alias', 'list', '--format', 'json', '--limit', '100', '--scope', SCOPE], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: providerEnvironment,
  })
  const result = JSON.parse(output)
  return result.aliases?.find((candidate) => candidate.alias === ALIAS)?.deploymentId ?? null
}

async function qualityStatus() {
  const response = await fetch(`https://${ALIAS}/api/quality`, {
    headers: { 'x-vercel-protection-bypass': bypassSecret },
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  return response.status
}

async function protectionStatus() {
  const response = await fetch(`https://${ALIAS}/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  })
  return { status: response.status, location: response.headers.get('location') }
}

const baseline = vercelJson(baselineId)
const rollback = vercelJson(rollbackId)
const targetFindings = validateStagingRollbackTargets({ baseline, rollback, alias: ALIAS })
if (targetFindings.length > 0) {
  throw new Error(`Rollback preflight refused: ${targetFindings.map((item) => item.code).join(', ')}`)
}

const checks = { baseline: null, rollback: null, restored: null }
const bindings = { baseline: null, rollback: null, restored: null }
let restoredDeploymentId = null
let primaryFailure = null
try {
  setAlias(baseline)
  bindings.baseline = aliasDeploymentId()
  checks.baseline = await qualityStatus()
  setAlias(rollback)
  bindings.rollback = aliasDeploymentId()
  checks.rollback = await qualityStatus()
} catch (error) {
  primaryFailure = error
} finally {
  try {
    setAlias(baseline)
    bindings.restored = aliasDeploymentId()
    checks.restored = await qualityStatus()
    restoredDeploymentId = baseline.id
  } catch (restoreError) {
    throw new Error('Rollback drill failed to restore the approved baseline.', { cause: restoreError })
  }
}
if (primaryFailure) throw new Error('Rollback drill failed before restoration.', { cause: primaryFailure })

const evidence = buildStagingRollbackEvidence({
  baseline,
  rollback,
  alias: ALIAS,
  checks,
  bindings,
  restoredDeploymentId,
  publicProtection: await protectionStatus(),
})
mkdirSync(path.dirname(destination), { recursive: true })
writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o640 })
console.log(`Staging rollback evidence: ${evidence.status}`)
console.log(`Quality probes: ${checks.baseline}/${checks.rollback}/${checks.restored}`)
if (evidence.status !== 'pass') process.exitCode = 1
