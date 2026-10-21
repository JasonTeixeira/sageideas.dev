import { createHash } from 'node:crypto'

export const PROGRAM_VERSION = 'academy-program-loop-v1'

export const SAFE_LOCAL_GATE_COMMANDS = Object.freeze([
  'npm run academy:audit:test',
  'npm run academy:audit:all',
  'npm run academy:registry:check',
  'npm run typecheck',
  'npm run build',
  'git diff --check',
])

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bgit\s+push\b/i,
  /\b(?:vercel|railway|fly)\s+(?:deploy|up|prod|--prod)\b/i,
  /\bsupabase\s+db\s+(?:push|reset)\b/i,
  /\bnpm\s+run\s+db:push\b/i,
  /\b(?:stripe|paypal)\b/i,
  /\b(?:rm|find)\b[^\n]*\s-(?:rf|delete)\b/i,
  /\b(?:secret|credential)s?\s+(?:set|rotate|delete)\b/i,
  /SAGE_ALLOW_/,
]

const REQUIRED_GATES = Object.freeze({
  focusedTests: 3,
  academyAudit: 1,
  registryCheck: 1,
  typecheck: 1,
  build: 1,
  diffCheck: 1,
})

const REVIEW_CATEGORIES = new Set([
  'accessibility',
  'consistency',
  'content_correctness',
  'pedagogy',
  'performance',
  'sources',
  'ux',
  'visual',
])

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`)
  }
}

function courseSlugs(registry) {
  assertObject(registry, 'registry')
  if (!Array.isArray(registry.courses)) throw new Error('registry.courses must be an array.')
  return registry.courses.map((course) => course.slug)
}

export function assertRegistryVersion(expected, actual) {
  if (expected !== actual) {
    throw new Error(`Academy registry version drift: expected ${expected}, received ${actual}. Re-audit and reconcile the program checkpoint before continuing.`)
  }
}

export function assertSafeCommands(commands) {
  if (!Array.isArray(commands)) throw new Error('commands must be an array.')
  for (const command of commands) {
    const matches = FORBIDDEN_COMMAND_PATTERNS.filter((pattern) => pattern.test(command))
    if (matches.length) {
      throw new Error(`Unsafe command refused by Academy Program Loop: ${command}`)
    }
  }
}

export function buildCourseQueue(registry, graph) {
  const canonicalSlugs = courseSlugs(registry)
  const canonicalSet = new Set(canonicalSlugs)
  if (canonicalSet.size !== canonicalSlugs.length) throw new Error('Canonical registry contains duplicate course slugs.')
  assertObject(graph, 'competency graph')
  if (!Array.isArray(graph.phases)) throw new Error('competency graph phases must be an array.')

  const queue = []
  const seen = new Set()
  for (const phase of graph.phases) {
    for (const slug of phase.courseSlugs) {
      if (!canonicalSet.has(slug)) throw new Error(`Competency graph course is absent from registry: ${slug}`)
      if (seen.has(slug)) continue
      seen.add(slug)
      queue.push({
        sequence: queue.length + 1,
        courseSlug: slug,
        phaseId: phase.id,
        phaseLabel: phase.label,
        source: 'flagship_competency_graph',
      })
    }
  }

  for (const slug of canonicalSlugs) {
    if (seen.has(slug)) continue
    seen.add(slug)
    queue.push({
      sequence: queue.length + 1,
      courseSlug: slug,
      phaseId: 'registry-remainder',
      phaseLabel: 'Complete canonical registry',
      source: 'canonical_registry_remainder',
    })
  }

  if (queue.length !== canonicalSlugs.length) {
    throw new Error(`Program queue coverage mismatch: ${queue.length}/${canonicalSlugs.length} courses.`)
  }
  return queue
}

function nextCurrent(queue, completed) {
  const completedSet = new Set(completed.map((item) => item.courseSlug))
  const next = queue.find((item) => !completedSet.has(item.courseSlug))
  if (!next) return null
  return {
    courseSlug: next.courseSlug,
    phaseId: next.phaseId,
    sequence: next.sequence,
    attemptCount: 0,
    repeatedFailureCount: 0,
    failureFingerprint: null,
  }
}

export function createProgramState({
  registry,
  graph,
  completedCourseSlugs = [],
  checkpointCommit,
  generatedAt = new Date().toISOString(),
}) {
  if (!checkpointCommit || typeof checkpointCommit !== 'string') {
    throw new Error('A checkpoint commit is required to initialize Academy program state.')
  }
  const queue = buildCourseQueue(registry, graph)
  const queueSet = new Set(queue.map((item) => item.courseSlug))
  const unknownCompleted = completedCourseSlugs.filter((slug) => !queueSet.has(slug))
  if (unknownCompleted.length) throw new Error(`Completed courses are absent from the queue: ${unknownCompleted.join(', ')}`)
  if (new Set(completedCourseSlugs).size !== completedCourseSlugs.length) {
    throw new Error('Completed course checkpoints contain duplicate slugs.')
  }
  const flagshipCount = queue.filter((item) => item.source === 'flagship_competency_graph').length
  const completed = completedCourseSlugs.map((courseSlug) => ({
    courseSlug,
    status: 'green_local_curriculum_checkpoint',
    provenance: 'imported_from_verified_branch_history',
    checkpointCommit,
    certificationStatus: 'uncertified',
  }))
  const current = nextCurrent(queue, completed)

  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    registryVersion: registry.registryVersion,
    status: current ? 'active' : 'complete',
    stopReason: null,
    generatedAt,
    updatedAt: generatedAt,
    scope: {
      registryCourses: queue.length,
      flagshipCourses: flagshipCount,
      registryRemainderCourses: queue.length - flagshipCount,
    },
    queue,
    completed,
    current,
    certificationBoundary: {
      courseClaim: 'uncertified',
      labEvidence: 'practice_only',
      authority: 'academy_certification_harness_v2_plus_required_human_and_governance_review',
    },
    autonomyBoundary: {
      allowed: ['local_content_and_code_edits', 'tests', 'evidence_generation', 'scoped_local_commits'],
      approvalRequired: ['push', 'deploy', 'publish', 'supabase_mutation', 'credentials', 'paid_actions', 'destructive_operations'],
      repeatedFailureLimit: 3,
    },
  }
}

export function validateProgramState(state, registry, graph) {
  const errors = []
  try {
    assertObject(state, 'program state')
    if (state.programVersion !== PROGRAM_VERSION) errors.push(`programVersion must be ${PROGRAM_VERSION}`)
    if (state.registryVersion !== registry.registryVersion) errors.push('registryVersion does not match canonical registry')
    const expectedQueue = buildCourseQueue(registry, graph)
    if (JSON.stringify(state.queue) !== JSON.stringify(expectedQueue)) errors.push('queue does not match canonical graph and registry')
    if (new Set(state.completed.map((item) => item.courseSlug)).size !== state.completed.length) errors.push('completed checkpoints contain duplicate courses')
    const expectedCurrent = nextCurrent(expectedQueue, state.completed)
    if ((state.current?.courseSlug ?? null) !== (expectedCurrent?.courseSlug ?? null)) errors.push('current course is not the next incomplete queue item')
    if (state.certificationBoundary?.courseClaim !== 'uncertified') errors.push('program state must not claim course certification')
    if (state.certificationBoundary?.labEvidence !== 'practice_only') errors.push('program state must keep lab evidence practice_only')
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  return errors
}

function remediationNeedsReview(item) {
  return REVIEW_CATEGORIES.has(item.category) && /complete required .* evidence/i.test(item.remediation)
}

export function buildTaskPacket({ state, course, remediationBacklog, generatedAt = new Date().toISOString() }) {
  assertObject(state, 'program state')
  assertObject(course, 'course scorecard')
  if (!state.current) throw new Error('Program has no current course.')
  if (course.courseSlug !== state.current.courseSlug) {
    throw new Error(`Course scorecard mismatch: expected ${state.current.courseSlug}, received ${course.courseSlug}.`)
  }
  const relevant = remediationBacklog.filter((item) => item.courseSlugs.includes(course.courseSlug))
  const deterministic = relevant.filter((item) => !remediationNeedsReview(item))
  const reviewRequired = relevant.filter(remediationNeedsReview)

  return {
    schemaVersion: 1,
    programVersion: PROGRAM_VERSION,
    registryVersion: state.registryVersion,
    generatedAt,
    checkpointContract: {
      baselineRegistryVersion: state.registryVersion,
      registryTransitionAllowed: true,
      transitionRequirement: 'The post-remediation registry, audit board, 32-course queue, current course, and trust boundary must reconcile before advancement.',
    },
    stateStatus: state.status,
    course: {
      sequence: state.current.sequence,
      phaseId: state.current.phaseId,
      courseSlug: course.courseSlug,
      title: course.title,
      lessonCount: course.lessonCount,
      authoringBundle: `data/academy/authoring/${course.courseSlug}.lessons.json`,
      solutionBundle: `data/academy/authoring/${course.courseSlug}.lab_solutions.json`,
      baseline: {
        decision: course.decision,
        deterministicScore: course.deterministicScore,
        hardFailCount: course.hardFailCount,
        hardFailCounts: course.hardFailCounts,
        requiredPending: course.requiredPending,
        dimensions: course.dimensions,
      },
    },
    remediation: { deterministic, reviewRequired },
    definitionOfGreen: [
      { id: 'focused-tests-pass-3', kind: 'local_gate', requirement: 'Course-specific contract tests pass three consecutive times.' },
      { id: 'academy-audit', kind: 'local_gate', requirement: 'Certification Harness V2 completes and reports no new H1, H3, H4, or H5 hard failures.' },
      { id: 'registry-check', kind: 'local_gate', requirement: 'Canonical registry generation check passes.' },
      { id: 'typecheck', kind: 'local_gate', requirement: 'TypeScript typecheck passes.' },
      { id: 'production-build', kind: 'local_gate', requirement: 'Production build passes.' },
      { id: 'diff-check', kind: 'local_gate', requirement: 'Diff is scoped, clean, and contains no whitespace errors or unrelated changes.' },
    ],
    commands: SAFE_LOCAL_GATE_COMMANDS,
    trustBoundary: {
      labEvidence: 'practice_only',
      mayClaimCertified: false,
      pendingReviewCannotBeAutoPassed: true,
    },
    completionAction: 'Record a GREEN local curriculum checkpoint; do not award certification.',
  }
}

export function validateGreenEvidence(evidence) {
  const errors = []
  if (!evidence || typeof evidence !== 'object') return ['evidence must be an object']
  if (!evidence.courseSlug) errors.push('courseSlug is required')
  if (!evidence.baselineRegistryVersion) errors.push('baselineRegistryVersion is required')
  if (!evidence.registryVersion) errors.push('registryVersion is required')
  if (!/^[a-f0-9]{7,40}$/i.test(evidence.commit ?? '')) errors.push('commit must be a Git commit identifier')
  for (const [gate, minimumPasses] of Object.entries(REQUIRED_GATES)) {
    const result = evidence.gates?.[gate]
    if (result?.status !== 'pass' || (result.consecutivePasses ?? 0) < minimumPasses) {
      errors.push(`${gate} must pass at least ${minimumPasses} consecutive time(s)`)
    }
  }
  if (!['untrusted_current_runtime', 'not_applicable'].includes(evidence.labTrust)) {
    errors.push('labTrust must remain untrusted_current_runtime or not_applicable')
  }
  if (evidence.certificationStatus !== 'uncertified') {
    errors.push('certificationStatus must remain uncertified')
  }
  return errors
}

export function validateCompletionEvidence(state, evidence) {
  const errors = []
  if (!state || typeof state !== 'object') return ['state must be an object']
  if (!evidence || typeof evidence !== 'object') return ['evidence must be an object']
  if (state.status !== 'complete' || state.current !== null) {
    errors.push('program state must be complete with no current course')
  }
  if (state.completed?.length !== state.scope?.registryCourses || state.scope?.registryCourses !== 32) {
    errors.push('program state must contain all 32 completed course checkpoints')
  }
  if (evidence.programVersion !== PROGRAM_VERSION) errors.push(`programVersion must be ${PROGRAM_VERSION}`)
  if (evidence.baselineRegistryVersion !== state.registryVersion) {
    errors.push('baselineRegistryVersion must match the completed program state')
  }
  if (!evidence.registryVersion) errors.push('registryVersion is required')
  if (!/^[a-f0-9]{7,40}$/i.test(evidence.commit ?? '')) errors.push('commit must be a Git commit identifier')

  const requiredCatalog = {
    courses: 32,
    lessons: 640,
    labs: 640,
    labReferences: 640,
    missingLabReferences: 0,
    sourceLedgers: 32,
  }
  for (const [field, expected] of Object.entries(requiredCatalog)) {
    if (evidence.catalog?.[field] !== expected) errors.push(`catalog.${field} must equal ${expected}`)
  }
  if (!Number.isFinite(evidence.scores?.minimum) || evidence.scores.minimum < 90) {
    errors.push('scores.minimum must be at least 90')
  }
  if (!Number.isFinite(evidence.scores?.average) || evidence.scores.average < 90) {
    errors.push('scores.average must be at least 90')
  }
  for (const severity of ['H1', 'H3', 'H4', 'H5']) {
    if (evidence.hardFailCounts?.[severity] !== 0) errors.push(`hardFailCounts.${severity} must equal 0`)
  }
  if (evidence.hardFailCounts?.H2 !== evidence.catalog?.labs) {
    errors.push('hardFailCounts.H2 must equal the practice-only lab count')
  }
  if (evidence.decisionCounts?.blocked !== 32 || evidence.decisionCounts?.certified !== 0) {
    errors.push('decisionCounts must retain 32 blocked and 0 certified courses')
  }
  for (const [gate, minimumPasses] of Object.entries(REQUIRED_GATES)) {
    const result = evidence.gates?.[gate]
    if (result?.status !== 'pass' || (result.consecutivePasses ?? 0) < minimumPasses) {
      errors.push(`${gate} must pass at least ${minimumPasses} consecutive time(s)`)
    }
  }
  if (evidence.labTrust !== 'untrusted_current_runtime') {
    errors.push('labTrust must remain untrusted_current_runtime')
  }
  if (evidence.certificationStatus !== 'uncertified') {
    errors.push('certificationStatus must remain uncertified')
  }
  if (!Array.isArray(evidence.pendingReviewDimensions) || evidence.pendingReviewDimensions.length === 0) {
    errors.push('pendingReviewDimensions must preserve unresolved human and governance review')
  }
  return errors
}

export function validateCompletionSources(evidence, registry, board) {
  const errors = []
  try {
    assertObject(evidence, 'completion evidence')
    assertObject(registry, 'registry')
    assertObject(board, 'quality board')
    if (evidence.registryVersion !== registry.registryVersion) errors.push('registryVersion does not match the canonical registry')
    if (evidence.registryVersion !== board.registryVersion) errors.push('registryVersion does not match the quality board')

    const actualCatalog = {
      courses: registry.totals?.courses,
      lessons: registry.totals?.lessons,
      labs: registry.totals?.labBlocks,
      labReferences: registry.totals?.solutionEntries,
      missingLabReferences: registry.totals?.labLessonsWithoutSolutions,
      sourceLedgers: registry.totals?.sourceLedgers,
    }
    for (const [field, actual] of Object.entries(actualCatalog)) {
      if (evidence.catalog?.[field] !== actual) errors.push(`catalog.${field} does not match the canonical registry`)
    }

    const scores = board.courses?.map((course) => course.deterministicScore)
    if (!Array.isArray(scores) || scores.length !== actualCatalog.courses || scores.some((score) => !Number.isFinite(score))) {
      errors.push('quality board deterministic scores do not cover the canonical catalog')
    } else {
      const minimum = Math.min(...scores)
      const average = scores.reduce((total, score) => total + score, 0) / scores.length
      if (evidence.scores?.minimum !== minimum) errors.push('scores.minimum does not match the quality board')
      if (!Number.isFinite(evidence.scores?.average) || Math.abs(evidence.scores.average - average) > Number.EPSILON) {
        errors.push('scores.average does not match the quality board')
      }
    }

    for (const severity of ['H1', 'H2', 'H3', 'H4', 'H5']) {
      if (evidence.hardFailCounts?.[severity] !== board.summary?.hardFailCounts?.[severity]) {
        errors.push(`hardFailCounts.${severity} does not match the quality board`)
      }
    }
    const actualDecisions = {
      eligible: board.summary?.coursesEligible,
      blocked: board.summary?.coursesBlocked,
      remediation: board.summary?.coursesNeedsRemediation,
      pending: board.summary?.coursesPendingReview,
      certified: board.summary?.coursesCertified,
    }
    for (const [field, actual] of Object.entries(actualDecisions)) {
      if (evidence.decisionCounts?.[field] !== actual) errors.push(`decisionCounts.${field} does not match the quality board`)
    }
    if (evidence.labTrust !== board.labTrust) errors.push('labTrust does not match the quality board')
    if (!board.courses?.every((course) => course.certificationStatus === evidence.certificationStatus)) {
      errors.push('certificationStatus does not match every course scorecard')
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  return errors
}

export function reconcileCompletedProgram(state, evidence, generatedAt = new Date().toISOString()) {
  const errors = validateCompletionEvidence(state, evidence)
  if (errors.length) throw new Error(`Completion reconciliation rejected: ${errors.join('; ')}`)
  const next = structuredClone(state)
  next.registryVersion = evidence.registryVersion
  next.updatedAt = generatedAt
  next.stopReason = null
  next.completionReconciliations = [
    ...(next.completionReconciliations ?? []),
    {
      baselineRegistryVersion: evidence.baselineRegistryVersion,
      registryVersion: evidence.registryVersion,
      checkpointCommit: evidence.commit,
      certificationStatus: 'uncertified',
      labTrust: 'untrusted_current_runtime',
      catalog: evidence.catalog,
      scores: evidence.scores,
      hardFailCounts: evidence.hardFailCounts,
      decisionCounts: evidence.decisionCounts,
      gates: evidence.gates,
      pendingReviewDimensions: evidence.pendingReviewDimensions,
      reconciledAt: generatedAt,
    },
  ]
  return next
}

function fingerprint(failures) {
  const normalized = [...new Set(failures.map((failure) => String(failure).trim()).filter(Boolean))].sort()
  return `sha256:${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`
}

export function recordAttempt(state, { status, failures = [], generatedAt = new Date().toISOString() }) {
  if (!state.current) throw new Error('Cannot record an attempt without a current course.')
  if (!['pass', 'fail'].includes(status)) throw new Error(`Unknown attempt status: ${status}`)
  const next = structuredClone(state)
  next.updatedAt = generatedAt
  next.current.attemptCount += 1
  if (status === 'pass') {
    next.current.repeatedFailureCount = 0
    next.current.failureFingerprint = null
    return next
  }
  if (!failures.length) throw new Error('A failed attempt must include at least one failure.')
  const nextFingerprint = fingerprint(failures)
  next.current.repeatedFailureCount = next.current.failureFingerprint === nextFingerprint
    ? next.current.repeatedFailureCount + 1
    : 1
  next.current.failureFingerprint = nextFingerprint
  if (next.current.repeatedFailureCount >= next.autonomyBoundary.repeatedFailureLimit) {
    next.status = 'blocked'
    next.stopReason = 'repeated_failure_fingerprint'
  }
  return next
}

export function recordGreenCheckpoint(state, evidence, generatedAt = new Date().toISOString()) {
  const errors = validateGreenEvidence(evidence)
  if (errors.length) throw new Error(`GREEN checkpoint rejected: ${errors.join('; ')}`)
  if (!state.current || evidence.courseSlug !== state.current.courseSlug) {
    throw new Error(`GREEN checkpoint course does not match current course: ${evidence.courseSlug}`)
  }
  assertRegistryVersion(state.registryVersion, evidence.baselineRegistryVersion)
  const next = structuredClone(state)
  next.registryVersion = evidence.registryVersion
  next.completed.push({
    courseSlug: evidence.courseSlug,
    status: 'green_local_curriculum_checkpoint',
    provenance: 'academy_program_loop_v1',
    checkpointCommit: evidence.commit,
    baselineRegistryVersion: evidence.baselineRegistryVersion,
    registryVersion: evidence.registryVersion,
    certificationStatus: 'uncertified',
    gates: evidence.gates,
    completedAt: generatedAt,
  })
  next.current = nextCurrent(next.queue, next.completed)
  next.status = next.current ? 'active' : 'complete'
  next.stopReason = null
  next.updatedAt = generatedAt
  return next
}
