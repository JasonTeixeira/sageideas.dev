import { spawnSync } from 'node:child_process'
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createHash } from 'node:crypto'

import { auditReleaseReadiness } from '../../lib/release-readiness/contract.mjs'

import {
  PROGRAM_VERSION,
  SAFE_LOCAL_COMMANDS,
  WORKSTREAM_GRAPH,
  assertSafeCommands,
  auditContractFixture,
  buildCanonicalInventory,
  buildProductionReadinessBoard,
  buildRemediationBacklog,
  buildTaskPacket,
  classifyDependencyAudit,
  createProgramState,
  isCanonicalProjectFile,
  recordFailure,
  recordGreenCheckpoint,
  topologicalWorkstreams,
  validateProgramState,
} from './core.mjs'

const root = process.cwd()
const evidenceDir = path.join(root, 'docs/evidence/project-loop')
const paths = Object.freeze({
  inventory: path.join(evidenceDir, 'canonical-inventory.json'),
  graph: path.join(evidenceDir, 'dependency-graph.json'),
  state: path.join(evidenceDir, 'state.json'),
  task: path.join(evidenceDir, 'task-packet-latest.json'),
  observations: path.join(evidenceDir, 'observations-latest.json'),
  verification: path.join(evidenceDir, 'verification-latest.json'),
  board: path.join(evidenceDir, 'production-readiness-board.json'),
  backlog: path.join(evidenceDir, 'remediation-backlog.json'),
  releaseManifest: path.join(evidenceDir, 'release-manifest.json'),
  releaseAudit: path.join(evidenceDir, 'release-readiness-audit.json'),
  releaseHandoff: path.join(evidenceDir, 'release-handoff.md'),
})

const REQUIRED_SCRIPTS = Object.freeze({
  'project:program:inventory': 'node tools/project-program/cli.mjs inventory',
  'project:program:plan': 'node tools/project-program/cli.mjs plan',
  'project:program:once': 'node tools/project-program/cli.mjs once',
  'project:program:status': 'node tools/project-program/cli.mjs status',
  'project:program:verify': 'npm run project:program:test && node tools/project-program/cli.mjs verify',
  'project:program:test': 'node --test tests/project-program/program-loop.test.mjs',
  'project:program:observe': 'node tools/project-program/cli.mjs observe',
  'project:program:checkpoint': 'node tools/project-program/cli.mjs checkpoint',
  'project:program:fail': 'node tools/project-program/cli.mjs fail',
  'project:release:verify': 'node tools/project-program/cli.mjs release-verify',
  'test:staging:http': 'node --test tests/staging/staging-http-audit.test.mjs',
  'test:staging:contracts': 'node --test tests/staging/*.test.mjs',
  'staging:http:verify': 'node tools/staging/verify-http.mjs',
  'staging:rollback:verify': 'node tools/staging/verify-rollback.mjs',
  'staging:readiness:audit': 'node tools/staging/write-production-readiness-audit.mjs',
})

const OBSERVATION_COMMANDS = Object.freeze([
  { id: 'program-contract', command: 'npm run project:program:test', severity: 'critical', workstreamId: 'repository-foundation' },
  { id: 'unit-tests', command: 'npm run test:unit', severity: 'critical', workstreamId: 'build-quality' },
  { id: 'security-contract', command: 'npm run test:security', severity: 'critical', workstreamId: 'auth-security' },
  { id: 'data-integrity-contract', command: 'npm run test:data-integrity', severity: 'critical', workstreamId: 'data-integrity' },
  { id: 'billing-contract', command: 'npm run test:billing', severity: 'critical', workstreamId: 'billing' },
  { id: 'billing-sql-integration', command: 'npm run test:billing:sql', severity: 'critical', workstreamId: 'billing' },
  { id: 'critical-journey-contract', command: 'npm run test:critical-journeys', severity: 'critical', workstreamId: 'critical-user-journeys' },
  { id: 'academy-production-contract', command: 'npm run test:academy-production', severity: 'critical', workstreamId: 'academy' },
  { id: 'admin-production-contract', command: 'npm run test:admin', severity: 'critical', workstreamId: 'admin-portal' },
  { id: 'communications-production-contract', command: 'npm run test:communications', severity: 'critical', workstreamId: 'communications-jobs' },
  { id: 'accessibility-performance-contract', command: 'npm run test:accessibility-performance', severity: 'critical', workstreamId: 'accessibility-performance' },
  { id: 'observability-recovery-contract', command: 'npm run test:observability-recovery', severity: 'critical', workstreamId: 'observability-recovery' },
  { id: 'release-readiness-contract', command: 'npm run test:release-readiness', severity: 'critical', workstreamId: 'release-readiness' },
  { id: 'staging-contracts', command: 'npm run test:staging:contracts', severity: 'critical', workstreamId: 'staging-validation' },
  { id: 'typecheck', command: 'npm run typecheck', severity: 'high', workstreamId: 'build-quality' },
  { id: 'lint', command: 'npm run lint', severity: 'high', workstreamId: 'build-quality' },
  { id: 'production-build', command: 'npm run build', severity: 'critical', workstreamId: 'build-quality' },
  { id: 'critical-journey-browser', command: 'npm run test:critical-journeys:e2e', severity: 'critical', workstreamId: 'critical-user-journeys' },
  { id: 'accessibility-performance-browser', command: 'ACCESSIBILITY_PERFORMANCE_REUSE_BUILD=1 npm run test:accessibility-performance:e2e', severity: 'critical', workstreamId: 'accessibility-performance' },
  { id: 'lighthouse-desktop', command: 'npm run test:lh:config', severity: 'high', workstreamId: 'build-quality' },
  { id: 'lighthouse-mobile', command: 'npm run test:lh:config:mobile', severity: 'high', workstreamId: 'build-quality' },
  { id: 'accessibility-performance-evidence', command: 'npm run audit:accessibility-performance', severity: 'high', workstreamId: 'accessibility-performance' },
  { id: 'approval-boundaries', command: 'npm run ops:approval-boundaries', severity: 'critical', workstreamId: 'auth-security' },
  { id: 'diff-check', command: 'git diff --check', severity: 'high', workstreamId: 'repository-foundation' },
])

function relative(filePath) {
  return path.relative(root, filePath)
}

async function readJson(filePath, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return null
    throw error
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function canonicalFiles() {
  const output = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).stdout
  return output
    .split('\0')
    .filter(Boolean)
    .filter(isCanonicalProjectFile)
    .sort()
}

async function buildInventory() {
  const [packageJson, academyRegistry] = await Promise.all([
    readJson(path.join(root, 'package.json')),
    readJson(path.join(root, 'data/academy/registry.json'), { optional: true }),
  ])
  const inventory = buildCanonicalInventory({
    files: canonicalFiles(),
    packageJson,
    academyRegistry,
    git: {
      head: git(['rev-parse', 'HEAD']).stdout.trim(),
      branch: git(['branch', '--show-current']).stdout.trim(),
      mergeInProgress: git(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { allowFailure: true }).status === 0,
    },
  })
  const graph = {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    inventoryHash: inventory.inventoryHash,
    workstreams: topologicalWorkstreams(WORKSTREAM_GRAPH),
  }
  await Promise.all([writeJson(paths.inventory, inventory), writeJson(paths.graph, graph)])
  return { inventory, graph, packageJson }
}

function reconcileInventory(state, inventory, generatedAt = new Date().toISOString()) {
  if (state.inventoryHash === inventory.inventoryHash) return state
  const next = structuredClone(state)
  next.inventoryTransitions = [
    ...(next.inventoryTransitions ?? []),
    { from: next.inventoryHash, to: inventory.inventoryHash, observedAt: generatedAt },
  ]
  next.inventoryHash = inventory.inventoryHash
  next.updatedAt = generatedAt
  next.current = next.current ? {
    ...next.current,
    attemptCount: 0,
    repeatedFailureCount: 0,
    failureFingerprint: null,
  } : null
  return next
}

async function loadOrCreateState(inventory) {
  const existing = await readJson(paths.state, { optional: true })
  const state = existing ? reconcileInventory(existing, inventory) : createProgramState({ inventory })
  const errors = validateProgramState(state, inventory)
  if (errors.length) throw new Error(`Persistent program state is invalid: ${errors.join('; ')}`)
  await writeJson(paths.state, state)
  return state
}

function structuralFindings({ inventory, packageJson, state }) {
  const fixtureAudit = auditContractFixture({
    packageScripts: packageJson.scripts,
    files: inventory.files,
    workstreams: WORKSTREAM_GRAPH,
    commands: SAFE_LOCAL_COMMANDS,
    trust: inventory.trust,
    securityEvidence: { reviewed: true },
  })
  const findings = [...fixtureAudit.findings]
  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (packageJson.scripts?.[name] !== command) {
      findings.push({
        code: 'program_script_missing_or_changed',
        severity: 'critical',
        workstreamId: 'repository-foundation',
        summary: `Required project program script is missing or changed: ${name}`,
        details: { expected: command, actual: packageJson.scripts?.[name] ?? null },
      })
    }
  }
  if (inventory.git.mergeInProgress) {
    findings.push({
      code: 'merge_checkpoint_pending',
      severity: 'high',
      workstreamId: 'repository-foundation',
      summary: 'The integration merge is intentionally pending until the checkpoint is GREEN.',
      details: {},
    })
  }
  if (!state.completed.some((item) => item.workstreamId === 'auth-security')) {
    findings.push({
      code: 'security_review_pending',
      severity: 'medium',
      workstreamId: 'auth-security',
      summary: 'The production security review remains pending for auth, billing, and user-data boundaries.',
      details: {},
    })
  }
  return findings
}

function observationFindings(observations, inventory) {
  if (!observations) {
    return [{
      code: 'deterministic_observations_missing',
      severity: 'high',
      workstreamId: 'build-quality',
      summary: 'Run npm run project:program:observe to establish the local verification baseline.',
      details: {},
    }]
  }
  if (observations.inventoryHash !== inventory.inventoryHash) {
    return [{
      code: 'deterministic_observations_stale',
      severity: 'high',
      workstreamId: 'build-quality',
      summary: 'The verification observations do not match the current canonical inventory.',
      details: { observed: observations.inventoryHash, current: inventory.inventoryHash },
    }]
  }
  const findings = observations.commands
    .filter((item) => !item.ok)
    .map((item) => ({
      code: `${item.id.replaceAll('-', '_')}_failed`,
      severity: item.severity,
      workstreamId: item.workstreamId,
      summary: `${item.command} failed with exit code ${item.exitCode}.`,
      details: { exitCode: item.exitCode, stdoutTail: item.stdoutTail, stderrTail: item.stderrTail },
    }))
  if (!observations.dependencyAudit?.production?.ok) {
    findings.push({
      code: 'high_risk_dependencies',
      severity: 'high',
      workstreamId: 'build-quality',
      summary: `Production dependency audit reports ${observations.dependencyAudit?.production?.critical ?? 0} critical, ${observations.dependencyAudit?.production?.high ?? 0} high, and ${observations.dependencyAudit?.production?.moderate ?? 0} moderate vulnerabilities.`,
      details: observations.dependencyAudit,
    })
  }
  if ((observations.dependencyAudit?.devOnly?.total ?? 0) > 0) {
    findings.push({
      code: 'dev_dependency_exception',
      severity: 'medium',
      workstreamId: 'build-quality',
      summary: `Dev-only dependency audit has ${observations.dependencyAudit.devOnly.total} findings isolated from the production graph.`,
      details: observations.dependencyAudit.devOnly,
    })
  }
  return findings
}

async function rebuildProgramArtifacts({ includeTask = true } = {}) {
  const { inventory, graph, packageJson } = await buildInventory()
  const state = await loadOrCreateState(inventory)
  const observations = await readJson(paths.observations, { optional: true })
  const findings = [
    ...structuralFindings({ inventory, packageJson, state }),
    ...observationFindings(observations, inventory),
  ]
  const board = buildProductionReadinessBoard({ inventory, state, findings })
  const backlog = buildRemediationBacklog({ board })
  let task = null
  if (includeTask && state.current?.boundary === 'safe_local') {
    task = buildTaskPacket({ inventory, state, findings })
  }
  await Promise.all([
    writeJson(paths.board, board),
    writeJson(paths.backlog, backlog),
    ...(task ? [writeJson(paths.task, task)] : []),
    ...(includeTask && !task ? [rm(paths.task, { force: true })] : []),
  ])
  return { inventory, graph, packageJson, state, observations, findings, board, backlog, task }
}

function runCommand(item) {
  assertSafeCommands([item.command])
  const startedAt = new Date().toISOString()
  const started = Date.now()
  const result = spawnSync(item.command, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  })
  return {
    ...item,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    exitCode: result.status,
    signal: result.signal,
    ok: result.status === 0,
    stdoutTail: (result.stdout ?? '').slice(-12000),
    stderrTail: (result.stderr ?? '').slice(-12000),
  }
}

function rawDependencyAudit(args = []) {
  const result = spawnSync('npm', ['audit', ...args, '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  })
  let parsed = null
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    return { counts: {}, parseError: true, exitCode: result.status, stderrTail: (result.stderr ?? '').slice(-4000) }
  }
  return { counts: parsed.metadata?.vulnerabilities ?? {}, exitCode: result.status, parseError: false }
}

function dependencyAudit() {
  const all = rawDependencyAudit()
  const production = rawDependencyAudit(['--omit=dev'])
  if (all.parseError || production.parseError) {
    return { ok: false, parseError: true, all, production }
  }
  return classifyDependencyAudit({
    all: all.counts,
    production: production.counts,
    devExceptions: [],
  })
}

async function observe() {
  const { inventory } = await buildInventory()
  const commands = OBSERVATION_COMMANDS.map(runCommand)
  const audit = dependencyAudit()
  const observations = {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    inventoryHash: inventory.inventoryHash,
    generatedAt: new Date().toISOString(),
    mutationMode: 'safe_local_verification_only',
    ok: commands.every((item) => item.ok) && audit.ok,
    commands,
    dependencyAudit: audit,
  }
  await writeJson(paths.observations, observations)
  const artifacts = await rebuildProgramArtifacts()
  return response('observe', observations.ok ? 'pass' : 'findings_recorded', {
    observationsPath: relative(paths.observations),
    failedCommands: commands.filter((item) => !item.ok).map((item) => item.id),
    dependencyAudit: observations.dependencyAudit,
    boardStatus: artifacts.board.overallStatus,
  }, ['Use the ranked remediation backlog; do not promote release readiness while findings remain.'])
}

async function verify() {
  const artifacts = await rebuildProgramArtifacts()
  const failures = []
  const good = auditContractFixture(await readJson(path.join(root, 'tests/project-program/fixtures/known-good.json')))
  const broken = auditContractFixture(await readJson(path.join(root, 'tests/project-program/fixtures/deliberately-broken.json')))
  const requiredBrokenCodes = [
    'required_script_missing',
    'duplicate_migration_version',
    'dependency_cycle',
    'unsafe_command',
    'academy_certification_unproven',
    'lab_trust_unproven',
  ]
  if (!good.ok) failures.push(`known-good fixture failed: ${good.findings.map((item) => item.code).join(', ')}`)
  for (const code of requiredBrokenCodes) {
    if (!broken.findings.some((item) => item.code === code)) failures.push(`deliberately broken fixture escaped detection: ${code}`)
  }
  failures.push(...validateProgramState(artifacts.state, artifacts.inventory))
  if (artifacts.graph.inventoryHash !== artifacts.inventory.inventoryHash) failures.push('dependency graph inventory hash mismatch')
  if (artifacts.board.inventoryHash !== artifacts.inventory.inventoryHash) failures.push('readiness board inventory hash mismatch')
  if (artifacts.backlog.inventoryHash !== artifacts.inventory.inventoryHash) failures.push('remediation backlog inventory hash mismatch')
  if (artifacts.task) {
    if (artifacts.task.inventoryHash !== artifacts.inventory.inventoryHash) failures.push('task packet inventory hash mismatch')
    try { assertSafeCommands(artifacts.task.commands) } catch (error) { failures.push(error instanceof Error ? error.message : String(error)) }
  }
  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (artifacts.packageJson.scripts?.[name] !== command) failures.push(`missing_or_changed_script:${name}`)
  }
  const evidence = {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    inventoryHash: artifacts.inventory.inventoryHash,
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    fixtureProof: { knownGoodPassed: good.ok, deliberatelyBrokenDetected: broken.findings.map((item) => item.code).sort() },
    stateStatus: artifacts.state.status,
    currentWorkstream: artifacts.state.current?.id ?? null,
    boardStatus: artifacts.board.overallStatus,
    backlogItems: artifacts.backlog.items.length,
    trust: artifacts.state.trustBoundary,
    failures,
  }
  await writeJson(paths.verification, evidence)
  if (!evidence.ok) throw new Error(`Project Program Loop verification failed: ${failures.join('; ')}`)
  return response('verify', 'pass', {
    verificationPath: relative(paths.verification),
    inventoryHash: evidence.inventoryHash,
    brokenFixtureFindings: evidence.fixtureProof.deliberatelyBrokenDetected.length,
    boardStatus: evidence.boardStatus,
  }, ['Execute the current safe-local task packet and record only fully GREEN checkpoints.'])
}

async function releaseVerify() {
  const result = await verify()
  const { state, board, observations, inventory, packageJson } = await rebuildProgramArtifacts({ includeTask: false })
  const failures = []
  if (!observations?.ok) failures.push('deterministic local observations are not all green')
  if (board.overallStatus !== 'local_production_candidate') failures.push(`readiness board is ${board.overallStatus}`)
  if (state.current?.boundary === 'safe_local') failures.push(`safe-local work remains: ${state.current.id}`)
  if (state.trustBoundary.academyCertification !== 'uncertified') failures.push('Academy certification claim is not evidence-safe')
  if (!['practice_only', 'untrusted_current_runtime'].includes(state.trustBoundary.labTrust)) failures.push('Lab trust claim is not evidence-safe')
  const [manifest, releaseAudit, handoffSource] = await Promise.all([
    readJson(paths.releaseManifest, { optional: true }),
    readJson(paths.releaseAudit, { optional: true }),
    readFile(paths.releaseHandoff, 'utf8').catch(() => ''),
  ])
  if (!manifest || !releaseAudit) {
    failures.push('release manifest or audit is missing')
  } else {
    const safeWorkstreamIds = WORKSTREAM_GRAPH.filter((workstream) => workstream.boundary === 'safe_local').map((workstream) => workstream.id)
    const completedIds = state.completed.filter((checkpoint) => safeWorkstreamIds.includes(checkpoint.workstreamId)).map((checkpoint) => checkpoint.workstreamId)
    const contractFindings = auditReleaseReadiness({
      packageScripts: packageJson.scripts,
      manifest,
      canonical: {
        programVersion: state.programVersion,
        inventoryHash: inventory.inventoryHash,
        safeWorkstreamIds,
        completedIds,
        currentId: state.current?.id ?? null,
        currentBoundary: state.current?.boundary ?? null,
        observations,
        dependencyAudit: observations?.dependencyAudit,
      },
      handoffSource,
    })
    if (contractFindings.length) failures.push(`release contract findings: ${contractFindings.map((finding) => finding.code).join(', ')}`)
    if (releaseAudit.status !== 'pass' || releaseAudit.manifestStatus !== 'local_production_candidate') failures.push('release audit is not a passing local candidate')
    for (const [name, evidence] of Object.entries(manifest.evidenceHashes ?? {})) {
      const resolved = path.resolve(root, evidence.path ?? '')
      if (!resolved.startsWith(`${root}${path.sep}`)) {
        failures.push(`release evidence escapes repository: ${name}`)
        continue
      }
      try {
        const actual = `sha256:${createHash('sha256').update(await readFile(resolved)).digest('hex')}`
        if (actual !== evidence.sha256) failures.push(`release evidence hash mismatch: ${name}`)
      } catch {
        failures.push(`release evidence missing: ${name}`)
      }
    }
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', manifest.releaseCommit, 'HEAD'], { cwd: root })
    if (ancestor.status !== 0) failures.push('release commit is not an ancestor of HEAD')
  }
  if (failures.length) throw new Error(`Local Production Candidate gate failed: ${failures.join('; ')}`)
  return response('release-verify', 'local_production_candidate', result.observation, ['Request explicit approval before staging deployment or external mutation.'])
}

function arg(name) {
  const prefix = `--${name}=`
  return process.argv.slice(3).find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

async function checkpoint() {
  const evidenceFile = arg('evidence')
  if (!evidenceFile) throw new Error('checkpoint requires --evidence=<path>')
  const artifacts = await rebuildProgramArtifacts()
  const evidence = await readJson(path.resolve(root, evidenceFile))
  const next = recordGreenCheckpoint(artifacts.state, evidence)
  await writeJson(paths.state, next)
  const refreshed = await rebuildProgramArtifacts()
  return response('checkpoint', 'recorded', {
    completedWorkstream: evidence.workstreamId,
    nextWorkstream: refreshed.state.current?.id ?? null,
    status: refreshed.state.status,
  }, refreshed.state.stopReason ? ['Stop at the recorded approval or human-review boundary.'] : ['Continue with the next safe-local task packet.'])
}

async function fail() {
  const fingerprint = arg('fingerprint')
  const summary = arg('summary') ?? fingerprint
  if (!fingerprint) throw new Error('fail requires --fingerprint=<normalized-failure>')
  const artifacts = await rebuildProgramArtifacts()
  const next = recordFailure(artifacts.state, { fingerprint, summary })
  await writeJson(paths.state, next)
  return response('fail', next.status, {
    workstream: next.current.id,
    repeatedFailureCount: next.current.repeatedFailureCount,
    stopReason: next.stopReason,
  }, next.status === 'blocked' ? ['Stop and report the repeated-failure boundary with evidence.'] : ['Continue safe local remediation.'])
}

function response(action, status, observation, nextActions) {
  return {
    programVersion: PROGRAM_VERSION,
    action,
    status,
    observation,
    next_actions: nextActions,
    artifacts: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, relative(value)])),
  }
}

async function inventoryCommand() {
  const { inventory, graph } = await buildInventory()
  return response('inventory', 'written', { inventoryHash: inventory.inventoryHash, counts: inventory.counts, workstreams: graph.workstreams.length }, ['Generate persistent state, readiness board, backlog, and the first task packet.'])
}

async function plan() {
  const artifacts = await rebuildProgramArtifacts()
  return response('plan', artifacts.state.status, {
    inventoryHash: artifacts.inventory.inventoryHash,
    currentWorkstream: artifacts.state.current?.id ?? null,
    currentBoundary: artifacts.state.current?.boundary ?? null,
    boardStatus: artifacts.board.overallStatus,
    backlogItems: artifacts.backlog.items.length,
    taskPath: artifacts.task ? relative(paths.task) : null,
  }, artifacts.task ? ['Execute the task packet using RED-GREEN-REFACTOR and rerun deterministic observations.'] : ['Honor the recorded stop boundary.'])
}

async function status() {
  const artifacts = await rebuildProgramArtifacts()
  return response('status', artifacts.state.status, {
    inventoryHash: artifacts.inventory.inventoryHash,
    progress: `${artifacts.state.completed.length}/${artifacts.state.queue.filter((item) => item.boundary === 'safe_local').length} safe-local workstreams`,
    current: artifacts.state.current,
    stopReason: artifacts.state.stopReason,
    boardStatus: artifacts.board.overallStatus,
    criticalFindings: artifacts.board.summary.criticalFindings,
    highFindings: artifacts.board.summary.highFindings,
    trust: artifacts.state.trustBoundary,
  }, artifacts.task ? ['Continue the current safe-local task packet.'] : ['Honor the recorded stop boundary.'])
}

async function once() {
  await inventoryCommand()
  const planned = await plan()
  await verify()
  return response('once', planned.status, planned.observation, planned.next_actions)
}

async function main() {
  const command = process.argv[2] ?? 'status'
  let result
  if (command === 'inventory') result = await inventoryCommand()
  else if (command === 'plan') result = await plan()
  else if (command === 'once') result = await once()
  else if (command === 'status') result = await status()
  else if (command === 'verify') result = await verify()
  else if (command === 'observe') result = await observe()
  else if (command === 'checkpoint') result = await checkpoint()
  else if (command === 'fail') result = await fail()
  else if (command === 'release-verify') result = await releaseVerify()
  else throw new Error(`Unknown project program command: ${command}`)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
