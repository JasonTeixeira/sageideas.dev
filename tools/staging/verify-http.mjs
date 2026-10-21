import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { runStagingHttpAudit } from '../../lib/staging/http-audit.mjs'

const root = process.cwd()
const outputPath = path.join(root, 'docs/evidence/project-loop/staging-http-latest.json')
const VERCEL_SCOPE = 'sage-ideas'
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]+$/
const SHA = /^[a-f0-9]{40}$/
const providerEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => name !== 'STAGING_BYPASS_SECRET'),
)

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function readDeployment(deploymentId) {
  if (!DEPLOYMENT_ID.test(deploymentId)) throw new Error('STAGING_DEPLOYMENT_ID is invalid.')
  const result = spawnSync('vercel', ['api', `/v13/deployments/${deploymentId}`, '--scope', VERCEL_SCOPE, '--raw'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 2 * 1024 * 1024,
    env: providerEnvironment,
  })
  if (result.status !== 0) throw new Error('Unable to read the approved Vercel staging deployment.')
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error('Vercel returned invalid deployment metadata.')
  }
}

async function main() {
  const deploymentId = required('STAGING_DEPLOYMENT_ID')
  const commitSha = required('STAGING_EXPECTED_COMMIT')
  if (!SHA.test(commitSha)) throw new Error('STAGING_EXPECTED_COMMIT must be a full Git SHA.')
  const evidence = await runStagingHttpAudit({
    expected: {
      baseURL: required('STAGING_BASE_URL'),
      deploymentId,
      commitSha,
      branch: process.env.STAGING_EXPECTED_BRANCH?.trim() || 'production/01-program-loop-v1',
    },
    deployment: readDeployment(deploymentId),
    bypassSecret: required('STAGING_BYPASS_SECRET'),
  })
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o640 })
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    classification: evidence.classification,
    deploymentId: evidence.deployment.id,
    commitSha: evidence.deployment.meta.gitCommitSha,
    ...evidence.summary,
    outputPath: path.relative(root, outputPath),
  }, null, 2)}\n`)
  if (evidence.status !== 'pass') process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Staging HTTP verification failed.')
  process.exit(1)
})
