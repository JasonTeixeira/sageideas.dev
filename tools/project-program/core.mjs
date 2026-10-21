import { createHash } from 'node:crypto'

export const PROGRAM_VERSION = 'sageideas-production-program-loop-v1'

export const WORKSTREAM_GRAPH = Object.freeze([
  {
    id: 'repository-foundation',
    label: 'Repository foundation and canonical truth',
    dependsOn: [],
    boundary: 'safe_local',
    scope: ['repository', 'configuration', 'inventory', 'dependency graph', 'program state'],
  },
  {
    id: 'build-quality',
    label: 'Build, tests, lint, types, and dependency health',
    dependsOn: ['repository-foundation'],
    boundary: 'safe_local',
    scope: ['build', 'unit tests', 'integration tests', 'lint', 'typecheck', 'dependencies'],
  },
  {
    id: 'auth-security',
    label: 'Authentication, authorization, and application security',
    dependsOn: ['build-quality'],
    boundary: 'safe_local',
    scope: ['auth', 'authorization', 'sessions', 'input validation', 'security controls'],
  },
  {
    id: 'data-integrity',
    label: 'Data model, migrations, RLS, and persistence integrity',
    dependsOn: ['auth-security'],
    boundary: 'safe_local',
    scope: ['Supabase', 'migrations', 'RLS', 'data contracts', 'backup design'],
  },
  {
    id: 'billing',
    label: 'Billing and entitlement correctness',
    dependsOn: ['auth-security', 'data-integrity'],
    boundary: 'safe_local',
    scope: ['checkout', 'webhooks', 'entitlements', 'refund states', 'billing tests'],
  },
  {
    id: 'critical-user-journeys',
    label: 'Critical product journeys and failure recovery',
    dependsOn: ['billing'],
    boundary: 'safe_local',
    scope: ['marketing', 'signup', 'onboarding', 'checkout', 'account', 'error recovery'],
  },
  {
    id: 'academy',
    label: 'Academy curriculum, assessments, and practice labs',
    dependsOn: ['data-integrity'],
    boundary: 'safe_local',
    scope: ['courses', 'lessons', 'assessments', 'labs', 'accessibility', 'sources'],
  },
  {
    id: 'admin-portal',
    label: 'Admin and operator workflows',
    dependsOn: ['auth-security', 'data-integrity'],
    boundary: 'safe_local',
    scope: ['admin', 'content operations', 'moderation', 'auditability'],
  },
  {
    id: 'communications-jobs',
    label: 'Email, Discord, background jobs, and automation',
    dependsOn: ['data-integrity'],
    boundary: 'safe_local',
    scope: ['email', 'Discord', 'queues', 'idempotency', 'retry', 'dead letters'],
  },
  {
    id: 'accessibility-performance',
    label: 'Accessibility, responsive UX, and performance',
    dependsOn: ['critical-user-journeys', 'academy', 'admin-portal', 'communications-jobs'],
    boundary: 'safe_local',
    scope: ['WCAG', 'keyboard', 'screen reader', 'motion', 'Core Web Vitals'],
  },
  {
    id: 'observability-recovery',
    label: 'Observability, incident response, and recovery',
    dependsOn: ['communications-jobs', 'critical-user-journeys'],
    boundary: 'safe_local',
    scope: ['logs', 'metrics', 'alerts', 'runbooks', 'rollback', 'recovery'],
  },
  {
    id: 'release-readiness',
    label: 'Local production-candidate release proof',
    dependsOn: ['accessibility-performance', 'observability-recovery'],
    boundary: 'safe_local',
    scope: ['release manifest', 'local gates', 'evidence reconciliation', 'handoff'],
  },
  {
    id: 'staging-validation',
    label: 'Staging deployment and live integration proof',
    dependsOn: ['release-readiness'],
    boundary: 'external_approval',
    scope: ['deployment', 'credentials', 'staging database', 'live integrations'],
  },
  {
    id: 'human-beta-certification',
    label: 'Required human review and controlled beta',
    dependsOn: ['staging-validation'],
    boundary: 'human_review',
    scope: ['expert review', 'learner beta', 'certification decision', 'launch approval'],
  },
])

export const SAFE_LOCAL_COMMANDS = Object.freeze([
  'npm run project:program:test',
  'npm run test:unit',
  'npm run test:security',
  'npm run test:data-integrity',
  'npm run test:billing',
  'npm run test:billing:sql',
  'npm run test:critical-journeys',
  'npm run test:critical-journeys:e2e',
  'npm run test:academy-production',
  'npm run test:admin',
  'npm run test:communications',
  'npm run test:accessibility-performance',
  'npm run test:accessibility-performance:e2e',
  'npm run test:observability-recovery',
  'npm run test:release-readiness',
  'npm run test:staging:contracts',
  'npm run typecheck',
  'npm run lint',
  'npm run build',
  'npm run test:lh:config',
  'npm run test:lh:config:mobile',
  'npm run ops:approval-boundaries',
  'git diff --check',
])

const REQUIRED_PACKAGE_SCRIPTS = Object.freeze(['build', 'lint', 'test:unit', 'typecheck'])
const REQUIRED_GREEN_GATES = Object.freeze([
  'focusedTests',
  'unitTests',
  'typecheck',
  'lint',
  'build',
  'diffCheck',
  'securityReview',
])
const SEVERITY_WEIGHT = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, info: 4 })
const FORBIDDEN_COMMAND_PATTERNS = Object.freeze([
  { code: 'git_push', pattern: /\bgit\s+push\b/i },
  { code: 'deployment', pattern: /\b(?:vercel|railway|fly)\s+(?:deploy|up|prod|--prod)\b/i },
  { code: 'supabase_mutation', pattern: /\bsupabase\s+(?:db\s+(?:push|reset)|migration\s+up)\b/i },
  { code: 'database_mutation', pattern: /\bnpm\s+run\s+(?:db:push|migrate(?::\w+)?)\b/i },
  { code: 'paid_action', pattern: /\b(?:stripe|paypal)\s+(?:create|update|delete|refund|pay)\b/i },
  { code: 'destructive_action', pattern: /\b(?:rm\s+-[^\n]*r[^\n]*f|find\b[^\n]*-delete)\b/i },
  { code: 'credential_mutation', pattern: /\b(?:secret|credential|token|key)s?\s+(?:set|rotate|delete|revoke)\b/i },
  { code: 'approval_bypass', pattern: /SAGE_ALLOW_|--force\b|--no-verify\b/ },
])

export function isCanonicalProjectFile(file) {
  return !file.startsWith('docs/evidence/') && !file.startsWith('.next/')
}

function clone(value) {
  return structuredClone(value)
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`
}

function finding(code, severity, summary, workstreamId = 'repository-foundation', details = {}) {
  return { code, severity, workstreamId, summary, details }
}

function normalizedAuditCounts(counts = {}) {
  return Object.fromEntries(
    ['info', 'low', 'moderate', 'high', 'critical', 'total'].map((severity) => [severity, Number(counts[severity] ?? 0)]),
  )
}

export function classifyDependencyAudit({ all, production, devExceptions = [] }) {
  const allCounts = normalizedAuditCounts(all)
  const productionCounts = normalizedAuditCounts(production)
  const devOnlyCounts = Object.fromEntries(
    Object.keys(allCounts).map((severity) => [severity, Math.max(0, allCounts[severity] - productionCounts[severity])]),
  )
  const productionOk = productionCounts.total === 0
  const applicableExceptions = devOnlyCounts.total > 0 ? devExceptions : []
  return {
    ok: productionOk,
    production: { ...productionCounts, ok: productionOk },
    devOnly: {
      ...devOnlyCounts,
      ok: devOnlyCounts.total === 0,
      exceptionCount: applicableExceptions.length,
      exceptions: clone(applicableExceptions),
    },
    policy: 'production dependency graph must contain zero known vulnerabilities; dev-only findings require an explicit evidence exception',
  }
}

function migrationEntries(files) {
  return files
    .filter((file) => /^supabase\/migrations\/[^/]+\.sql$/i.test(file))
    .map((file) => {
      const filename = file.split('/').at(-1)
      return { file, version: filename.match(/^(\d+)/)?.[1] ?? null }
    })
}

export function assertSafeCommands(commands) {
  if (!Array.isArray(commands)) throw new Error('commands must be an array')
  const failures = []
  for (const command of commands) {
    if (typeof command !== 'string' || !command.trim()) {
      failures.push('empty_or_non_string_command')
      continue
    }
    for (const rule of FORBIDDEN_COMMAND_PATTERNS) {
      if (rule.pattern.test(command)) failures.push(`${rule.code}:${command}`)
    }
  }
  if (failures.length) throw new Error(`Unsafe command refused by SageIdeas Production Program Loop: ${failures.join('; ')}`)
}

export function topologicalWorkstreams(graph = WORKSTREAM_GRAPH) {
  if (!Array.isArray(graph) || graph.length === 0) throw new Error('workstream graph must be a non-empty array')
  const nodes = new Map()
  for (const node of graph) {
    if (!node?.id || nodes.has(node.id)) throw new Error(`duplicate or missing workstream id: ${node?.id ?? 'unknown'}`)
    nodes.set(node.id, clone(node))
  }
  for (const node of nodes.values()) {
    if (!Array.isArray(node.dependsOn)) throw new Error(`dependsOn must be an array for ${node.id}`)
    for (const dependency of node.dependsOn) {
      if (!nodes.has(dependency)) throw new Error(`unknown dependency ${dependency} for ${node.id}`)
    }
  }

  const remaining = new Map(nodes)
  const ordered = []
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((node) => node.dependsOn.every((dependency) => ordered.some((item) => item.id === dependency)))
      .sort((left, right) => {
        const leftBoundary = left.boundary === 'safe_local' ? 0 : 1
        const rightBoundary = right.boundary === 'safe_local' ? 0 : 1
        return leftBoundary - rightBoundary || graph.findIndex((item) => item.id === left.id) - graph.findIndex((item) => item.id === right.id)
      })
    if (!ready.length) throw new Error(`dependency cycle detected among: ${[...remaining.keys()].sort().join(', ')}`)
    const next = ready[0]
    remaining.delete(next.id)
    ordered.push({ ...next, sequence: ordered.length + 1 })
  }
  return ordered
}

export function auditContractFixture(input) {
  const findings = []
  const scripts = input?.packageScripts ?? input?.scripts ?? {}
  for (const script of REQUIRED_PACKAGE_SCRIPTS) {
    if (!scripts[script]) findings.push(finding('required_script_missing', 'critical', `Required package script is missing: ${script}`, 'build-quality', { script }))
  }

  const migrations = migrationEntries(input?.files ?? [])
  const versions = new Map()
  for (const migration of migrations) {
    if (!migration.version) {
      findings.push(finding('migration_version_missing', 'high', `Migration has no numeric version: ${migration.file}`, 'data-integrity'))
      continue
    }
    const sameVersion = versions.get(migration.version) ?? []
    sameVersion.push(migration.file)
    versions.set(migration.version, sameVersion)
  }
  for (const [version, files] of versions) {
    if (files.length > 1) findings.push(finding('duplicate_migration_version', 'critical', `Migration version ${version} is duplicated`, 'data-integrity', { files }))
  }

  try {
    topologicalWorkstreams(input?.workstreams)
  } catch (error) {
    findings.push(finding('dependency_cycle', 'critical', error instanceof Error ? error.message : String(error)))
  }
  try {
    assertSafeCommands(input?.commands ?? [])
  } catch (error) {
    findings.push(finding('unsafe_command', 'critical', error instanceof Error ? error.message : String(error)))
  }

  const sensitiveRoutes = (input?.files ?? []).filter((file) => /^app\/api\/(?:checkout|webhooks?|admin|auth)\//.test(file))
  if (sensitiveRoutes.length && !input?.securityEvidence?.reviewed) {
    findings.push(finding('security_evidence_missing', 'high', 'Sensitive API routes require explicit security-review evidence', 'auth-security', { routes: sensitiveRoutes }))
  }
  if (input?.trust?.academyCertification !== 'uncertified') {
    findings.push(finding('academy_certification_unproven', 'critical', 'Academy certification must remain uncertified without reconciled evidence', 'academy'))
  }
  if (!['practice_only', 'untrusted_current_runtime'].includes(input?.trust?.labTrust)) {
    findings.push(finding('lab_trust_unproven', 'critical', 'Lab trust must remain untrusted without controlled-runtime evidence', 'academy'))
  }
  return { ok: findings.length === 0, findings }
}

export function buildCanonicalInventory({ files, packageJson, academyRegistry, git, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(files)) throw new Error('files must be an array')
  const canonicalFiles = [...new Set(files)].sort()
  const migrations = migrationEntries(canonicalFiles)
  const scripts = packageJson?.scripts ?? packageJson?.packageScripts ?? {}
  const academyTotals = academyRegistry?.totals ?? {}
  const counts = {
    trackedFiles: canonicalFiles.length,
    appPages: canonicalFiles.filter((file) => /^app\/.+\/page\.(?:js|jsx|ts|tsx)$/.test(file) || /^app\/page\.(?:js|jsx|ts|tsx)$/.test(file)).length,
    routeHandlers: canonicalFiles.filter((file) => /^app\/.+\/route\.(?:js|jsx|ts|tsx)$/.test(file)).length,
    apiRoutes: canonicalFiles.filter((file) => /^app\/api\/.+\/route\.(?:js|jsx|ts|tsx)$/.test(file)).length,
    migrations: migrations.length,
    tests: canonicalFiles.filter((file) => /^tests\//.test(file)).length,
    academyCourses: academyTotals.courses ?? 0,
    academyLessons: academyTotals.lessons ?? 0,
    academyLabs: academyTotals.labs ?? academyTotals.labBlocks ?? 0,
  }
  const hashSource = {
    files: canonicalFiles,
    scripts: Object.fromEntries(Object.entries(scripts).sort(([left], [right]) => left.localeCompare(right))),
    academyRegistryVersion: academyRegistry?.registryVersion ?? null,
    counts,
  }
  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    generatedAt,
    inventoryHash: sha256(hashSource),
    git: clone(git ?? { head: null, branch: null }),
    academyRegistryVersion: academyRegistry?.registryVersion ?? null,
    counts,
    packageScripts: Object.keys(scripts).sort(),
    migrations,
    files: canonicalFiles,
    trust: {
      academyCertification: 'uncertified',
      labTrust: 'untrusted_current_runtime',
      labEvidence: 'practice_only',
    },
  }
}

function currentFrom(queue, completedIds) {
  const completed = new Set(completedIds)
  const next = queue.find((item) => !completed.has(item.id))
  if (!next) return null
  return {
    ...clone(next),
    workstreamId: next.id,
    attemptCount: 0,
    repeatedFailureCount: 0,
    failureFingerprint: null,
  }
}

export function createProgramState({ inventory, completedWorkstreamIds = [], generatedAt = new Date().toISOString() }) {
  const queue = topologicalWorkstreams(WORKSTREAM_GRAPH)
  const known = new Set(queue.map((item) => item.id))
  if (completedWorkstreamIds.some((id) => !known.has(id))) throw new Error('completed workstream is absent from the dependency graph')
  if (new Set(completedWorkstreamIds).size !== completedWorkstreamIds.length) throw new Error('completed workstreams contain duplicates')
  const current = currentFrom(queue, completedWorkstreamIds)
  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    inventoryHash: inventory.inventoryHash,
    status: current ? (current.boundary === 'safe_local' ? 'active' : 'blocked') : 'local_program_complete',
    generatedAt,
    updatedAt: generatedAt,
    queue,
    completed: completedWorkstreamIds.map((workstreamId) => ({ workstreamId, status: 'green_local_checkpoint', imported: true })),
    current,
    stopReason: current?.boundary === 'safe_local' ? null : current ? { code: current.boundary === 'human_review' ? 'human_review_boundary' : 'external_approval_boundary', workstreamId: current.id } : null,
    trustBoundary: clone(inventory.trust),
    autonomyBoundary: {
      allowed: ['safe_local_code_and_content', 'tests', 'analysis', 'evidence_generation', 'green_local_commits'],
      approvalRequired: ['destructive_action', 'credentials', 'deployment', 'external_mutation', 'paid_action', 'required_human_review'],
      repeatedFailureLimit: 3,
    },
  }
}

export function validateProgramState(state, inventory) {
  const errors = []
  try {
    if (state?.programVersion !== PROGRAM_VERSION) errors.push(`programVersion must be ${PROGRAM_VERSION}`)
    if (state?.inventoryHash !== inventory?.inventoryHash) errors.push('inventoryHash does not match canonical inventory')
    const expectedQueue = topologicalWorkstreams(WORKSTREAM_GRAPH)
    if (stableJson(state?.queue) !== stableJson(expectedQueue)) errors.push('queue does not match the canonical dependency graph')
    const completedIds = state?.completed?.map((item) => item.workstreamId) ?? []
    if (new Set(completedIds).size !== completedIds.length) errors.push('completed workstreams contain duplicates')
    const expectedCurrent = currentFrom(expectedQueue, completedIds)
    if ((state?.current?.id ?? null) !== (expectedCurrent?.id ?? null)) errors.push('current workstream is not the next dependency-ready item')
    if (state?.trustBoundary?.academyCertification !== 'uncertified') errors.push('academyCertification must remain uncertified')
    if (!['practice_only', 'untrusted_current_runtime'].includes(state?.trustBoundary?.labTrust)) errors.push('labTrust must remain untrusted')
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  return errors
}

export function buildTaskPacket({ inventory, state, findings = [], generatedAt = new Date().toISOString() }) {
  const errors = validateProgramState(state, inventory)
  if (errors.length) throw new Error(`invalid program state: ${errors.join('; ')}`)
  if (!state.current) throw new Error('program has no current workstream')
  if (state.current.boundary !== 'safe_local') throw new Error(`current workstream requires ${state.current.boundary}`)
  const relevant = findings.filter((item) => item.workstreamId === state.current.id)
  const packet = {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    generatedAt,
    inventoryHash: inventory.inventoryHash,
    workstream: clone(state.current),
    findings: clone(relevant),
    mutationBoundary: 'safe_local_only',
    trustBoundary: clone(state.trustBoundary),
    definitionOfGreen: [
      { id: 'focused-tests', requirement: 'Workstream contract tests pass.' },
      { id: 'unit-tests', requirement: 'The repository unit suite passes.' },
      { id: 'typecheck', requirement: 'TypeScript typecheck passes.' },
      { id: 'lint', requirement: 'Lint passes without suppressed new findings.' },
      { id: 'build', requirement: 'The production build passes.' },
      { id: 'diff-check', requirement: 'The diff is scoped and contains no whitespace errors.' },
      { id: 'security-review', requirement: 'Security review has no unresolved critical or high finding.' },
    ],
    commands: [...SAFE_LOCAL_COMMANDS],
    stopBoundaries: [...state.autonomyBoundary.approvalRequired, 'repeated_failure_limit'],
  }
  assertSafeCommands(packet.commands)
  return packet
}

export function recordFailure(state, { fingerprint, summary, generatedAt = new Date().toISOString() }) {
  if (!state.current) throw new Error('program has no current workstream')
  if (!fingerprint) throw new Error('failure fingerprint is required')
  const next = clone(state)
  const repeated = next.current.failureFingerprint === fingerprint ? next.current.repeatedFailureCount + 1 : 1
  next.current.attemptCount += 1
  next.current.failureFingerprint = fingerprint
  next.current.repeatedFailureCount = repeated
  next.current.lastFailure = summary
  next.updatedAt = generatedAt
  if (repeated >= next.autonomyBoundary.repeatedFailureLimit) {
    next.status = 'blocked'
    next.stopReason = { code: 'repeated_failure_boundary', fingerprint, workstreamId: next.current.id, summary }
  }
  return next
}

export function validateGreenEvidence(state, evidence) {
  const errors = []
  if (evidence?.programVersion !== PROGRAM_VERSION) errors.push('programVersion does not match')
  if (evidence?.inventoryHash !== state?.inventoryHash) errors.push('inventoryHash does not match')
  if (evidence?.workstreamId !== state?.current?.id) errors.push('workstreamId does not match current workstream')
  if (!evidence?.commit || typeof evidence.commit !== 'string') errors.push('commit is required')
  for (const gate of REQUIRED_GREEN_GATES) {
    if (evidence?.gates?.[gate]?.status !== 'pass') errors.push(`${gate} gate must pass`)
  }
  if (evidence?.academyCertification !== 'uncertified') errors.push('academyCertification must remain uncertified')
  if (!['practice_only', 'untrusted_current_runtime'].includes(evidence?.labTrust)) errors.push('labTrust must remain untrusted')
  return errors
}

export function recordGreenCheckpoint(state, evidence, generatedAt = new Date().toISOString()) {
  if (state.current?.boundary !== 'safe_local') throw new Error('only safe-local workstreams can receive an autonomous GREEN checkpoint')
  const errors = validateGreenEvidence(state, evidence)
  if (errors.length) throw new Error(`GREEN checkpoint refused: ${errors.join('; ')}`)
  const next = clone(state)
  next.completed.push({
    workstreamId: next.current.id,
    status: 'green_local_checkpoint',
    commit: evidence.commit,
    inventoryHash: evidence.inventoryHash,
    completedAt: generatedAt,
    gates: clone(evidence.gates),
  })
  next.current = currentFrom(next.queue, next.completed.map((item) => item.workstreamId))
  next.updatedAt = generatedAt
  if (!next.current) {
    next.status = 'local_program_complete'
    next.stopReason = null
  } else if (next.current.boundary !== 'safe_local') {
    next.status = 'blocked'
    next.stopReason = {
      code: next.current.boundary === 'human_review' ? 'human_review_boundary' : 'external_approval_boundary',
      workstreamId: next.current.id,
    }
  } else {
    next.status = 'active'
    next.stopReason = null
  }
  return next
}

export function buildProductionReadinessBoard({ inventory, state, findings = [], generatedAt = new Date().toISOString() }) {
  const completed = new Set(state.completed.map((item) => item.workstreamId))
  const workstreams = state.queue.map((item) => {
    const workstreamFindings = findings.filter((findingItem) => findingItem.workstreamId === item.id)
    let status = completed.has(item.id) ? 'green_local_checkpoint' : 'pending'
    if (workstreamFindings.some((item) => ['critical', 'high'].includes(item.severity))) status = 'blocked'
    else if (state.current?.id === item.id && item.boundary === 'safe_local') status = 'in_progress'
    else if (item.boundary !== 'safe_local') status = 'approval_boundary'
    return { ...clone(item), status, findingCount: workstreamFindings.length, findings: clone(workstreamFindings) }
  })
  const local = workstreams.filter((item) => item.boundary === 'safe_local')
  const locallyReady = local.every((item) => item.status === 'green_local_checkpoint') && findings.every((item) => !['critical', 'high'].includes(item.severity))
  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    generatedAt,
    inventoryHash: inventory.inventoryHash,
    overallStatus: locallyReady ? 'local_production_candidate' : 'not_local_production_candidate',
    trust: clone(state.trustBoundary),
    summary: {
      totalWorkstreams: workstreams.length,
      safeLocalWorkstreams: local.length,
      greenLocalWorkstreams: local.filter((item) => item.status === 'green_local_checkpoint').length,
      criticalFindings: findings.filter((item) => item.severity === 'critical').length,
      highFindings: findings.filter((item) => item.severity === 'high').length,
    },
    workstreams,
  }
}

export function buildRemediationBacklog({ board, generatedAt = new Date().toISOString() }) {
  const items = board.workstreams
    .flatMap((workstream) => workstream.findings.map((findingItem) => ({ ...clone(findingItem), workstreamSequence: workstream.sequence })))
    .sort((left, right) => {
      return (SEVERITY_WEIGHT[left.severity] ?? 99) - (SEVERITY_WEIGHT[right.severity] ?? 99)
        || left.workstreamSequence - right.workstreamSequence
        || left.code.localeCompare(right.code)
    })
    .map((item, index) => ({ rank: index + 1, ...item }))
  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    generatedAt,
    inventoryHash: board.inventoryHash,
    items,
  }
}
