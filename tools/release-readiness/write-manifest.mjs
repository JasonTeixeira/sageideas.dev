import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { auditReleaseReadiness, sha256 } from '../../lib/release-readiness/contract.mjs'
import { WORKSTREAM_GRAPH } from '../project-program/core.mjs'

const root = process.cwd()
const evidenceDir = path.join(root, 'docs/evidence/project-loop')
const readText = (file) => readFile(path.join(root, file), 'utf8')
const readJson = async (file) => JSON.parse(await readText(file))
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

const [packageJson, inventory, state, observations] = await Promise.all([
  readJson('package.json'),
  readJson('docs/evidence/project-loop/canonical-inventory.json'),
  readJson('docs/evidence/project-loop/state.json'),
  readJson('docs/evidence/project-loop/observations-latest.json'),
])

const evidenceFiles = {
  observations: 'docs/evidence/project-loop/observations-latest.json',
  securityReview: 'docs/evidence/project-loop/security-review-latest.json',
  accessibilityPerformance: 'docs/evidence/project-loop/accessibility-performance-audit.json',
  observabilityRecovery: 'docs/evidence/project-loop/observability-recovery-audit.json',
}
const evidenceHashes = Object.fromEntries(await Promise.all(Object.entries(evidenceFiles).map(async ([key, file]) => [
  key,
  { path: file, sha256: sha256(await readText(file)) },
])))
const safeWorkstreams = WORKSTREAM_GRAPH.filter((workstream) => workstream.boundary === 'safe_local')
const completedSafe = state.completed.filter((checkpoint) => safeWorkstreams.some((workstream) => workstream.id === checkpoint.workstreamId))
const releaseCommit = git('rev-parse', 'HEAD')
const date = new Date().toISOString().slice(0, 10)
const status = completedSafe.length === safeWorkstreams.length
  ? 'local_production_candidate'
  : 'ready_for_release_checkpoint'
const runtimeRequirements = [...new Set(git('grep', '-h', '-o', 'process\\.env\\.[A-Z0-9_]*', '--', 'app', 'lib', 'instrumentation.ts', 'sentry.client.config.ts', 'sentry.edge.config.ts', 'sentry.server.config.ts')
  .split('\n')
  .map((entry) => entry.replace('process.env.', ''))
  .filter(Boolean))].sort()

const manifest = {
  schemaVersion: 1,
  programVersion: state.programVersion,
  generatedAt: new Date().toISOString(),
  releaseId: `local-candidate-${date}-${releaseCommit.slice(0, 8)}`,
  releaseCommit,
  branch: git('branch', '--show-current'),
  inventoryHash: inventory.inventoryHash,
  status,
  trust: state.trustBoundary,
  localProof: {
    observationCount: observations.commands.length,
    failedCommands: observations.commands.filter((command) => command.exitCode !== 0).length,
    dependencyVulnerabilities: (observations.dependencyAudit?.production?.total ?? 0) + (observations.dependencyAudit?.devOnly?.total ?? 0),
    completedSafeWorkstreams: completedSafe.length,
    totalSafeWorkstreams: safeWorkstreams.length,
  },
  checkpoints: completedSafe.map(({ workstreamId, commit, inventoryHash, completedAt }) => ({ workstreamId, commit, inventoryHash, completedAt })),
  evidenceHashes,
  runtimeRequirements,
  rollback: {
    runbook: 'docs/sops/07-deployment-rollback.md',
    triggers: ['readiness fails twice within five minutes', 'a critical customer journey fails', 'security or data-integrity regression', 'error signals exceed the approved threshold'],
    verification: ['public health and active release identity', 'SLO/error/dead-letter telemetry', 'read-only critical customer journeys', 'audit and provider-event reconciliation'],
  },
  externalBoundaries: [
    { id: 'staging_deployment', status: 'approval_required' },
    { id: 'hosted_migrations', status: 'approval_required' },
    { id: 'live_integrations', status: 'approval_required' },
    { id: 'controlled_lab_runtime', status: 'approval_required' },
    { id: 'human_review_beta', status: 'approval_required' },
  ],
}

const canonical = {
  programVersion: state.programVersion,
  inventoryHash: inventory.inventoryHash,
  safeWorkstreamIds: safeWorkstreams.map((workstream) => workstream.id),
  completedIds: completedSafe.map((checkpoint) => checkpoint.workstreamId),
  currentId: state.current?.id ?? null,
  currentBoundary: state.current?.boundary ?? null,
  observations,
  dependencyAudit: observations.dependencyAudit,
}

const handoff = `# SageIdeas Local Production Candidate handoff

Local Production Candidate is not deployment approval. It proves the safe-local repository gates only.

## Local proof

- Release: \`${manifest.releaseId}\`
- Commit: \`${manifest.releaseCommit}\`
- Inventory: \`${manifest.inventoryHash}\`
- Status: \`${manifest.status}\`
- Observations: ${manifest.localProof.observationCount}, failures: ${manifest.localProof.failedCommands}
- Dependencies: ${manifest.localProof.dependencyVulnerabilities} known vulnerabilities
- Academy remains uncertified.
- Labs remain practice-only and \`untrusted_current_runtime\`.

## Pre-deploy

- [ ] Explicit external approval and named deployer/reviewer
- [ ] Target Vercel project, Supabase project, region, release commit, and environment confirmed
- [ ] Runtime variables configured from the manifest names without copying values into evidence
- [ ] Hosted migrations reviewed, backed up, and tested on an isolated target
- [ ] Rollback target and triggers agreed before mutation

## Staging

- [ ] Apply approved migrations and reconcile the hosted ledger
- [ ] Exercise auth/MFA, tenant isolation, billing/webhooks, communications/jobs, storage, and the five controlled evaluator labs
- [ ] Prove alert delivery, scrubbed Sentry traces, health/SLO signals, rate limits, and kill switches
- [ ] Run assistive-technology checks, field-like performance, rollback, and restore drills

## Post-deploy

- [ ] Verify active release identity, public health, critical customer journeys, audit events, queues, and provider receipts
- [ ] Monitor at least one agreed alert window and retain evidence
- [ ] Obtain the required human review and controlled-beta decision

## Rollback triggers

${manifest.rollback.triggers.map((trigger) => `- ${trigger}`).join('\n')}

## External approval boundaries

${manifest.externalBoundaries.map((boundary) => `- [ ] ${boundary.id}: ${boundary.status}`).join('\n')}

## Evidence hashes

${Object.entries(manifest.evidenceHashes).map(([name, evidence]) => `- ${name}: \`${evidence.sha256}\` — ${evidence.path}`).join('\n')}
`
const input = { packageScripts: packageJson.scripts, manifest, canonical, handoffSource: handoff }
const findings = auditReleaseReadiness(input)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: findings.length === 0 ? 'pass' : 'fail',
  manifestStatus: manifest.status,
  findingCount: findings.length,
  findings,
  externalMutationPerformed: false,
}

await mkdir(evidenceDir, { recursive: true })
await Promise.all([
  writeFile(path.join(evidenceDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(path.join(evidenceDir, 'release-readiness-audit.json'), `${JSON.stringify(report, null, 2)}\n`),
  writeFile(path.join(evidenceDir, 'release-handoff.md'), handoff),
])
console.log(JSON.stringify({ status: report.status, manifestStatus: manifest.status, findingCount: findings.length }))
if (findings.length) process.exitCode = 1
