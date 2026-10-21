import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  PROGRAM_VERSION,
  assertRegistryVersion,
  assertSafeCommands,
  buildTaskPacket,
  createProgramState,
  reconcileCompletedProgram,
  recordAttempt,
  recordGreenCheckpoint,
  validateCompletionSources,
  validateProgramState,
} from './core.mjs'

const root = process.cwd()
const programDir = path.join(root, 'docs/evidence/academy/program-loop')
const statePath = path.join(programDir, 'state.json')
const taskPath = path.join(programDir, 'task-packet-latest.json')
const verificationPath = path.join(programDir, 'verification-latest.json')
const dryRunPath = path.join(programDir, 'dry-run-latest.json')

const FOUNDATION_CHECKPOINTS = [
  'career-engineering_judgment_foundation',
  'programming-fundamentals',
  'python-basics',
  'git-the-terminal',
  'data-structures',
  'career-programming_cs_foundations',
]

const REQUIRED_SCRIPTS = {
  'academy:program:plan': 'node tools/academy-program/cli.mjs plan',
  'academy:program:once': 'node tools/academy-program/cli.mjs once',
  'academy:program:verify': 'node --test tests/academy/program-loop.test.mjs && node tools/academy-program/cli.mjs verify',
  'academy:program:status': 'node tools/academy-program/cli.mjs status',
  'academy:program:dry-run': 'node tools/academy-program/cli.mjs once --dry-run',
  'academy:program:reconcile': 'node tools/academy-program/cli.mjs reconcile',
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function loadSources() {
  const [registry, graph, board, backlog] = await Promise.all([
    readJson('data/academy/registry.json'),
    readJson('data/academy/flagship-competency-graph.json'),
    readJson('docs/evidence/academy/certification-v2/academy-quality-board.json'),
    readJson('docs/evidence/academy/certification-v2/remediation-backlog.json'),
  ])
  assertRegistryVersion(registry.registryVersion, board.registryVersion)
  assertRegistryVersion(registry.registryVersion, backlog.registryVersion)
  return { registry, graph, board, backlog }
}

function headCommit() {
  return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
}

async function loadOrCreateState(sources, { write = true } = {}) {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'))
    assertRegistryVersion(state.registryVersion, sources.registry.registryVersion)
    const errors = validateProgramState(state, sources.registry, sources.graph)
    if (errors.length) throw new Error(`Invalid Academy program state: ${errors.join('; ')}`)
    return state
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    const state = createProgramState({
      registry: sources.registry,
      graph: sources.graph,
      completedCourseSlugs: FOUNDATION_CHECKPOINTS,
      checkpointCommit: headCommit(),
    })
    if (write) await writeJson(statePath, state)
    return state
  }
}

function packetFor(state, sources) {
  const current = sources.board.courses.find((course) => course.courseSlug === state.current?.courseSlug)
  if (!current) throw new Error(`Missing scorecard for current course: ${state.current?.courseSlug ?? 'none'}`)
  const packet = buildTaskPacket({
    state,
    course: current,
    remediationBacklog: sources.backlog.items,
  })
  assertSafeCommands(packet.commands)
  return packet
}

async function plan({ dryRun = false } = {}) {
  const sources = await loadSources()
  const state = await loadOrCreateState(sources, { write: !dryRun })
  if (!state.current) return { ok: true, programVersion: PROGRAM_VERSION, status: 'complete', state }
  const packet = packetFor(state, sources)
  if (!dryRun) await writeJson(taskPath, packet)
  return {
    ok: true,
    programVersion: PROGRAM_VERSION,
    mode: dryRun ? 'dry_run' : 'local_task_packet',
    status: state.status,
    statePath: path.relative(root, statePath),
    taskPath: path.relative(root, taskPath),
    nextCourse: packet.course,
    deterministicRemediationItems: packet.remediation.deterministic.length,
    reviewRequiredItems: packet.remediation.reviewRequired.length,
    trustBoundary: packet.trustBoundary,
  }
}

async function verify() {
  const sources = await loadSources()
  const state = await loadOrCreateState(sources)
  const packageJson = await readJson('package.json')
  const failures = []
  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (packageJson.scripts?.[name] !== command) failures.push(`missing_or_changed_script:${name}`)
  }
  failures.push(...validateProgramState(state, sources.registry, sources.graph))
  if (state.current) {
    const packet = packetFor(state, sources)
    if (packet.registryVersion !== state.registryVersion) failures.push('task_packet_registry_version_mismatch')
    if (packet.course.courseSlug !== state.current.courseSlug) failures.push('task_packet_current_course_mismatch')
    try {
      assertSafeCommands(packet.commands)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  } else {
    if (state.status !== 'complete') failures.push('missing_current_course_without_complete_status')
    if (state.completed.length !== state.scope.registryCourses) failures.push('complete_status_without_full_queue')
  }
  const evidence = {
    ok: failures.length === 0,
    programVersion: PROGRAM_VERSION,
    generatedAt: new Date().toISOString(),
    mutationMode: 'local_files_only',
    registryVersion: sources.registry.registryVersion,
    queueCoverage: `${state.queue.length}/${sources.registry.totals.courses}`,
    progress: `${state.completed.length}/${state.scope.registryCourses}`,
    status: state.status,
    currentCourse: state.current?.courseSlug ?? null,
    certificationClaim: state.certificationBoundary.courseClaim,
    labEvidence: state.certificationBoundary.labEvidence,
    requiredScripts: REQUIRED_SCRIPTS,
    failures,
  }
  await writeJson(verificationPath, evidence)
  if (!evidence.ok) throw new Error(`Academy Program Loop verification failed: ${failures.join('; ')}`)
  return evidence
}

async function status() {
  const sources = await loadSources()
  const state = await loadOrCreateState(sources)
  return {
    programVersion: state.programVersion,
    status: state.status,
    registryVersion: state.registryVersion,
    progress: `${state.completed.length}/${state.scope.registryCourses}`,
    current: state.current,
    stopReason: state.stopReason,
    certificationBoundary: state.certificationBoundary,
  }
}

function argValue(name) {
  const prefix = `--${name}=`
  return process.argv.slice(3).find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

async function checkpoint() {
  const evidencePath = argValue('evidence')
  if (!evidencePath) throw new Error('checkpoint requires --evidence=<path>')
  const sources = await loadSources()
  const evidence = await readJson(evidencePath)
  const state = JSON.parse(await readFile(statePath, 'utf8'))
  assertRegistryVersion(state.registryVersion, evidence.baselineRegistryVersion)
  assertRegistryVersion(sources.registry.registryVersion, evidence.registryVersion)
  const reconciledState = { ...state, registryVersion: sources.registry.registryVersion }
  const stateErrors = validateProgramState(reconciledState, sources.registry, sources.graph)
  if (stateErrors.length) {
    throw new Error(`Registry transition changed the active Academy queue: ${stateErrors.join('; ')}`)
  }
  const next = recordGreenCheckpoint(state, evidence)
  await writeJson(statePath, next)
  if (next.current) await writeJson(taskPath, packetFor(next, sources))
  return { ok: true, completed: evidence.courseSlug, next: next.current, status: next.status }
}

async function reconcile() {
  const evidencePath = argValue('evidence')
  if (!evidencePath) throw new Error('reconcile requires --evidence=<path>')
  const sources = await loadSources()
  const evidence = await readJson(evidencePath)
  const state = JSON.parse(await readFile(statePath, 'utf8'))
  const sourceErrors = validateCompletionSources(evidence, sources.registry, sources.board)
  if (sourceErrors.length) {
    throw new Error(`Completion evidence disagrees with canonical sources: ${sourceErrors.join('; ')}`)
  }
  const next = reconcileCompletedProgram(state, evidence)
  const stateErrors = validateProgramState(next, sources.registry, sources.graph)
  if (stateErrors.length) {
    throw new Error(`Completion registry transition changed the Academy queue: ${stateErrors.join('; ')}`)
  }
  await writeJson(statePath, next)
  return {
    ok: true,
    status: next.status,
    progress: `${next.completed.length}/${next.scope.registryCourses}`,
    registryVersion: next.registryVersion,
    certificationClaim: next.certificationBoundary.courseClaim,
    labEvidence: next.certificationBoundary.labEvidence,
  }
}

async function fail() {
  const failure = argValue('failure')
  if (!failure) throw new Error('fail requires --failure=<normalized failure>')
  const sources = await loadSources()
  const state = await loadOrCreateState(sources)
  const next = recordAttempt(state, { status: 'fail', failures: [failure] })
  await writeJson(statePath, next)
  return { ok: next.status !== 'blocked', status: next.status, current: next.current, stopReason: next.stopReason }
}

async function main() {
  const command = process.argv[2] ?? 'status'
  const dryRun = process.argv.includes('--dry-run')
  let result
  if (command === 'plan' || command === 'once') result = await plan({ dryRun })
  else if (command === 'verify') result = await verify()
  else if (command === 'status') result = await status()
  else if (command === 'checkpoint') result = await checkpoint()
  else if (command === 'reconcile') result = await reconcile()
  else if (command === 'fail') result = await fail()
  else throw new Error(`Unknown Academy program command: ${command}`)
  if (dryRun) await writeJson(dryRunPath, result)
  console.log(JSON.stringify(result, null, 2))
  if (result.ok === false) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
