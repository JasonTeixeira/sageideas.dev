import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'

import { REQUIRED_SECTIONS, type SprintIntensity } from '@/lib/academy/engine'
import {
  loadFlagshipCompetencyGraph,
  validateFlagshipCompetencyGraph,
} from '@/lib/academy/flagship-competency-graph'
import { validateBlocks } from '@/lib/academy/validate-blocks'

export const HARNESS_VERSION = '2.0.0'
export const CERTIFICATION_STATUS = 'uncertified' as const

export type CheckStatus = 'pass' | 'fail' | 'pending' | 'not_applicable'
export type CheckMode = 'deterministic' | 'expert' | 'human' | 'supplied_evidence' | 'policy'
export type LabTrust = 'untrusted_current_runtime' | 'controlled_evaluator' | 'trusted_controlled_runtime'
export type ReadinessDecision =
  | 'blocked'
  | 'needs_remediation'
  | 'pending_review'
  | 'eligible_for_certification'

export interface Finding {
  id: string
  code?: 'H1' | 'H2' | 'H3' | 'H4' | 'H5'
  severity: 'blocker' | 'high' | 'medium' | 'low'
  category: string
  courseSlug: string
  lessonSlug?: string
  message: string
  remediation: string
  mode: CheckMode
}

export interface AuditCheck {
  id: string
  mode: CheckMode
  status: CheckStatus
  required: boolean
  summary: string
}

export interface DimensionResult {
  id: string
  status: CheckStatus
  score: number | null
  checks: AuditCheck[]
  findings: Finding[]
}

interface RegistryLesson {
  slug: string
  title: string
  moduleTitle: string
  moduleSort: number
  sort: number
  [key: string]: unknown
}

interface RegistryCourse {
  slug: string
  aliases?: string[]
  title: string
  topic: string
  level: string
  lifecycleStatus: string
  routes?: { course?: string; learn?: string }
  authoring?: { lessonBundle?: string; solutionBundle?: string }
  sources?: { ledger?: string | null }
  lessons: RegistryLesson[]
  [key: string]: unknown
}

interface SourceRow {
  source_id?: string
  title?: string
  organization?: string
  url?: string
  source_tier?: number
  retrieved_at?: string
  excerpt?: string
}

interface LessonEvidence {
  claimCoverageComplete?: boolean
  claimRefs?: Array<{ claim?: string; sourceIds?: string[] }>
  lab?: {
    trust?: LabTrust
    results?: Array<{ blockIndex?: number; status?: 'pass' | 'fail'; reason?: string }>
  }
  accessibility?: {
    status?: 'pass' | 'fail'
    axe?: 'pass' | 'fail'
    keyboardFocus?: 'pass' | 'fail'
    screenReader?: 'pass' | 'fail'
    reducedMotion?: 'pass' | 'fail'
    zoomReflow?: 'pass' | 'fail'
    targetSize?: 'pass' | 'fail'
    critical?: number
    serious?: number
    violations?: string[]
  }
  media?: { status?: 'pass' | 'fail' | 'not_applicable'; missing?: string[] }
  performance?: { status?: 'pass' | 'fail' }
  consistency?: { status?: 'pass' | 'fail' }
  expert?: { contentCorrectness?: 'pass' | 'fail'; pedagogy?: 'pass' | 'fail' }
  human?: { visual?: 'pass' | 'fail'; ux?: 'pass' | 'fail' }
}

export interface AuditBundle {
  course: RegistryCourse
  lessons: Record<string, unknown>
  solutions?: Record<string, { language?: string; code?: string; stdin?: string }>
  sourceLedger?: SourceRow[] | null
  evidence?: Record<string, LessonEvidence>
}

export interface AuditOptions {
  registryVersion: string
  generatedAt: string
  labTrust: LabTrust
  repoRoot?: string
  courseIndex?: Map<string, Set<string>>
  trustedLabKeys?: ReadonlySet<string>
}

export interface LessonScorecard {
  schemaVersion: 2
  harnessVersion: string
  registryVersion: string
  generatedAt: string
  courseSlug: string
  lessonSlug: string
  contentHash: string
  labTrust: LabTrust | 'not_applicable'
  dimensions: Record<string, DimensionResult>
  deterministicScore: number | null
  compositeScore: number | null
  hardFails: Finding[]
  requiredPending: string[]
  decision: ReadinessDecision
  certificationStatus: typeof CERTIFICATION_STATUS
}

export interface CourseScorecard {
  schemaVersion: 2
  harnessVersion: string
  registryVersion: string
  generatedAt: string
  courseSlug: string
  title: string
  contentHash: string
  lessonCount: number
  labTrust: LabTrust | 'not_applicable'
  dimensions: Record<string, DimensionResult>
  deterministicScore: number | null
  compositeScore: number | null
  hardFails: Finding[]
  requiredPending: string[]
  decision: ReadinessDecision
  certificationStatus: typeof CERTIFICATION_STATUS
  lessonScorecards: LessonScorecard[]
}

interface AcademyInput {
  registry: {
    registryVersion: string
    totals: { courses: number; lessons: number }
    courses: RegistryCourse[]
  }
  repoRoot: string
  generatedAt: string
  activation?: {
    trustedLabKeys: ReadonlySet<string>
    evidenceByLesson: ReadonlyMap<string, LessonEvidence>
  }
}

const DIMENSION_IDS = [
  'content_correctness',
  'structure',
  'pedagogy',
  'assessments',
  'sources',
  'labs',
  'accessibility',
  'media',
  'references',
  'metadata',
  'duplication',
  'visual',
  'ux',
  'performance',
  'consistency',
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const sha256 = (value: unknown): string =>
  `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`

const makeFinding = (
  partial: Omit<Finding, 'id' | 'courseSlug' | 'lessonSlug'>,
  courseSlug: string,
  lessonSlug?: string,
): Finding => ({
  ...partial,
  id: sha256([partial.code ?? partial.category, courseSlug, lessonSlug ?? '', partial.message]).slice(7, 23),
  courseSlug,
  ...(lessonSlug ? { lessonSlug } : {}),
})

const aggregateStatus = (checks: AuditCheck[]): CheckStatus => {
  if (checks.some((check) => check.status === 'fail')) return 'fail'
  if (checks.some((check) => check.required && check.status === 'pending')) return 'pending'
  if (checks.every((check) => check.status === 'not_applicable')) return 'not_applicable'
  if (checks.some((check) => check.status === 'pending')) return 'pending'
  return 'pass'
}

const dimension = (id: string, checks: AuditCheck[], findings: Finding[] = []): DimensionResult => {
  const status = aggregateStatus(checks)
  return {
    id,
    status,
    score: status === 'pass' ? 100 : status === 'fail' ? 0 : null,
    checks,
    findings,
  }
}

const check = (
  id: string,
  mode: CheckMode,
  status: CheckStatus,
  summary: string,
  required = true,
): AuditCheck => ({ id, mode, status, required, summary })

const walkStrings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, out))
  else if (isRecord(value)) Object.values(value).forEach((item) => walkStrings(item, out))
  return out
}

const collectNamedAssetRefs = (value: unknown, out: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach((item) => collectNamedAssetRefs(item, out))
  else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (
        typeof item === 'string' &&
        /^(?:url|src|href|assetUrl|poster|audio)$/i.test(key) &&
        /\.(?:png|jpe?g|gif|webp|svg|mp3|mp4|wav|webm)(?:[?#]|$)/i.test(item)
      ) {
        out.push(item)
      } else {
        collectNamedAssetRefs(item, out)
      }
    }
  }
  return out
}

const blockTypes = (blocks: unknown[]): string[] =>
  blocks.filter(isRecord).map((block) => String(block.type ?? ''))

const substantiveText = (block: Record<string, unknown>): string =>
  walkStrings(block)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const shingles = (text: string, size = 5): Set<string> => {
  const words = text.split(' ').filter(Boolean)
  const result = new Set<string>()
  for (let index = 0; index + size <= words.length; index += 1) {
    result.add(words.slice(index, index + size).join(' '))
  }
  return result
}

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const item of left) if (right.has(item)) intersection += 1
  return intersection / (left.size + right.size - intersection)
}

function buildDuplicateIndex(lessons: Record<string, unknown>): Map<string, string[]> {
  const signatures = new Map<string, string[]>()
  const candidates: Array<{ lessonSlug: string; type: string; text: string; shingles: Set<string> }> = []
  for (const [lessonSlug, raw] of Object.entries(lessons)) {
    if (!Array.isArray(raw)) continue
    for (const block of raw.filter(isRecord)) {
      if (!['concept', 'worked-example', 'tradeoff', 'quiz', 'diagram'].includes(String(block.type))) continue
      const text = substantiveText(block)
      if (text.length < 80) continue
      candidates.push({ lessonSlug, type: String(block.type), text, shingles: shingles(text) })
      const signature = sha256([block.type, text])
      const owners = signatures.get(signature) ?? []
      owners.push(lessonSlug)
      signatures.set(signature, owners)
    }
  }
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    const left = candidates[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const right = candidates[rightIndex]
      if (left.lessonSlug === right.lessonSlug || left.type !== right.type || left.text === right.text) continue
      if (jaccard(left.shingles, right.shingles) < 0.85) continue
      signatures.set(
        sha256(['near-duplicate', left.lessonSlug, right.lessonSlug, left.type]),
        [left.lessonSlug, right.lessonSlug],
      )
    }
  }
  return signatures
}

function sourceDimension(
  courseSlug: string,
  lessonSlug: string,
  ledger: SourceRow[] | null | undefined,
  evidence: LessonEvidence,
): DimensionResult {
  const findings: Finding[] = []
  const rows = Array.isArray(ledger) ? ledger : []
  const validRows = rows.filter(
    (row) =>
      typeof row.source_id === 'string' &&
      typeof row.title === 'string' &&
      typeof row.url === 'string' &&
      /^https:\/\//.test(row.url) &&
      typeof row.retrieved_at === 'string',
  )
  const sourceIds = new Set(validRows.map((row) => row.source_id as string))
  const refs = Array.isArray(evidence.claimRefs) ? evidence.claimRefs : []
  const uncited = refs.filter(
    (ref) =>
      typeof ref.claim !== 'string' ||
      !ref.claim.trim() ||
      !Array.isArray(ref.sourceIds) ||
      ref.sourceIds.length === 0,
  )
  const unresolved = refs.flatMap((ref) =>
    (Array.isArray(ref.sourceIds) ? ref.sourceIds : []).filter((sourceId) => !sourceIds.has(sourceId)),
  )
  if (uncited.length) {
    findings.push(
      makeFinding(
        {
          code: 'H1',
          severity: 'blocker',
          category: 'sources',
          message: `${uncited.length} declared claim reference(s) have no source IDs or claim text.`,
          remediation: 'Attach at least one valid ledger source ID to every declared factual claim, or record reviewed practitioner judgment explicitly.',
          mode: 'deterministic',
        },
        courseSlug,
        lessonSlug,
      ),
    )
  }
  if (unresolved.length) {
    findings.push(
      makeFinding(
        {
          code: 'H1',
          severity: 'blocker',
          category: 'sources',
          message: `Claim references unresolved source IDs: ${[...new Set(unresolved)].join(', ')}`,
          remediation: 'Resolve every load-bearing claim to a valid source-ledger row or label it as reviewed practitioner judgment.',
          mode: 'deterministic',
        },
        courseSlug,
        lessonSlug,
      ),
    )
  }
  return dimension(
    'sources',
    [
      check(
        'source-ledger-schema',
        'deterministic',
        rows.length === 0 ? 'pending' : validRows.length === rows.length ? 'pass' : 'fail',
        rows.length === 0
          ? 'No source ledger is registered for this course.'
          : `${validRows.length}/${rows.length} source rows have the required local schema.`,
      ),
      check(
        'claim-level-coverage',
        'expert',
        unresolved.length || uncited.length
          ? 'fail'
          : evidence.claimCoverageComplete && refs.length > 0
            ? 'pass'
            : 'pending',
        evidence.claimCoverageComplete && refs.length > 0
          ? `${refs.length} claim reference(s) supplied as complete coverage.`
          : 'Claim-level source coverage requires expert review and explicit completeness evidence.',
      ),
    ],
    findings,
  )
}

function auditLesson(
  bundle: AuditBundle,
  lesson: RegistryLesson,
  rawBlocks: unknown,
  options: AuditOptions,
  duplicateIndex: Map<string, string[]>,
): LessonScorecard {
  const courseSlug = bundle.course.slug
  const lessonSlug = lesson.slug
  const evidence = bundle.evidence?.[lessonSlug] ?? {}
  const configuredLabTrust = options.trustedLabKeys?.has(`${courseSlug}/${lessonSlug}`)
    ? 'trusted_controlled_runtime'
    : options.labTrust
  const controlledLabTrust = configuredLabTrust === 'controlled_evaluator' || configuredLabTrust === 'trusted_controlled_runtime'
  const blocks = Array.isArray(rawBlocks) ? rawBlocks : []
  const types = blockTypes(blocks)
  const dimensions: Record<string, DimensionResult> = {}

  const validation = validateBlocks(rawBlocks)
  const refErrors = validation.ok
    ? []
    : validation.errors.filter((error) => /references unknown (?:node|edge)/.test(error))
  const schemaErrors = validation.ok
    ? []
    : validation.errors.filter((error) => !refErrors.includes(error))
  const structureFindings = schemaErrors.map((message) =>
    makeFinding(
      {
        severity: 'high',
        category: 'structure',
        message,
        remediation: 'Repair the block so it satisfies the runtime LessonBlock contract.',
        mode: 'deterministic',
      },
      courseSlug,
      lessonSlug,
    ),
  )
  dimensions.structure = dimension(
    'structure',
    [
      check(
        'runtime-block-schema',
        'deterministic',
        schemaErrors.length ? 'fail' : 'pass',
        schemaErrors.length ? `${schemaErrors.length} runtime schema defect(s).` : 'Runtime block schema is valid.',
      ),
    ],
    structureFindings,
  )

  const contract = blocks.find((block) => isRecord(block) && block.type === 'sprint-contract')
  const intensity = isRecord(contract) && typeof contract.intensity === 'string'
    ? (contract.intensity as SprintIntensity)
    : 'standard'
  const required = REQUIRED_SECTIONS[intensity] ?? REQUIRED_SECTIONS.standard
  const missingSections = required.filter((section) => !types.includes(section))
  const observedSequence = types.filter((type) => required.includes(type))
  const dedupedSequence = observedSequence.filter((type, index) => observedSequence.indexOf(type) === index)
  const expectedSequence = required.filter((type) => observedSequence.includes(type))
  const orderValid = dedupedSequence.join('|') === expectedSequence.join('|')
  const pedagogyFindings: Finding[] = []
  if (missingSections.length || !orderValid) {
    pedagogyFindings.push(
      makeFinding(
        {
          severity: 'high',
          category: 'pedagogy',
          message: missingSections.length
            ? `Missing required ${intensity} loop sections: ${missingSections.join(', ')}`
            : `Required ${intensity} loop sections are out of order.`,
          remediation: `Restore the ${intensity} learning loop without replacing course-specific teaching with boilerplate.`,
          mode: 'deterministic',
        },
        courseSlug,
        lessonSlug,
      ),
    )
  }
  const expertPedagogy = evidence.expert?.pedagogy
  dimensions.pedagogy = dimension(
    'pedagogy',
    [
      check(
        'learning-loop-arc',
        'deterministic',
        missingSections.length || !orderValid ? 'fail' : 'pass',
        missingSections.length || !orderValid ? 'The required learning loop is incomplete.' : `The ${intensity} loop is structurally complete and ordered.`,
      ),
      check(
        'expert-pedagogy-review',
        'expert',
        expertPedagogy ?? 'pending',
        expertPedagogy ? `Expert pedagogy review: ${expertPedagogy}.` : 'Expert review of explanations, sequencing, cognitive load, and transfer is pending.',
      ),
    ],
    pedagogyFindings,
  )

  const quizzes = blocks.filter((block) => isRecord(block) && block.type === 'quiz')
  const assessmentDefects: string[] = []
  if (!quizzes.length) assessmentDefects.push('No quiz block is present.')
  for (const quiz of quizzes) {
    if (typeof (quiz as Record<string, unknown>).explanation !== 'string' || !(quiz as Record<string, unknown>).explanation) {
      assessmentDefects.push('A quiz is missing a substantive answer explanation.')
    }
  }
  if (!types.includes('verification')) assessmentDefects.push('No verification block is present.')
  if (!types.includes('teachback')) assessmentDefects.push('No teach-back block is present.')
  const assessmentFindings = assessmentDefects.map((message) =>
    makeFinding(
      {
        severity: 'high',
        category: 'assessments',
        message,
        remediation: 'Add an assessment that measures the stated outcome and gives explanatory feedback.',
        mode: 'deterministic',
      },
      courseSlug,
      lessonSlug,
    ),
  )
  dimensions.assessments = dimension(
    'assessments',
    [check('assessment-structure', 'deterministic', assessmentDefects.length ? 'fail' : 'pass', assessmentDefects.length ? `${assessmentDefects.length} assessment defect(s).` : 'Quiz, explanation, verification, and teach-back are present.')],
    assessmentFindings,
  )

  dimensions.sources = sourceDimension(courseSlug, lessonSlug, bundle.sourceLedger, evidence)

  const labs = blocks
    .map((block, blockIndex) => ({ block, blockIndex }))
    .filter(({ block }) => isRecord(block) && block.type === 'lab')
  const labFindings: Finding[] = []
  if (labs.length) {
    const solution = bundle.solutions?.[lessonSlug]
    for (const { block } of labs) {
      if (!isRecord(block) || typeof block.check !== 'string' || !block.check.trim()) {
        labFindings.push(makeFinding({ code: 'H2', severity: 'blocker', category: 'labs', message: 'A lab has no deterministic expected check.', remediation: 'Define a deterministic expected result and negative cases before the lab can count as proof.', mode: 'deterministic' }, courseSlug, lessonSlug))
      }
      if (!solution?.code) {
        labFindings.push(makeFinding({ code: 'H2', severity: 'blocker', category: 'labs', message: 'A lab has no private reference solution.', remediation: 'Provide a private reference solution and verify it in the controlled evaluator.', mode: 'deterministic' }, courseSlug, lessonSlug))
      }
    }
    if (configuredLabTrust === 'untrusted_current_runtime') {
      labFindings.push(makeFinding({ code: 'H2', severity: 'blocker', category: 'labs', message: 'lab_trust=untrusted_current_runtime; current checks cannot prove mastery.', remediation: 'Route this lab through the Step 4A controlled evaluator before using it for mastery or certification.', mode: 'policy' }, courseSlug, lessonSlug))
    } else {
      const results = evidence.lab?.results ?? []
      const failures = results.filter((result) => result.status === 'fail')
      if (failures.length) {
        labFindings.push(makeFinding({ code: 'H2', severity: 'blocker', category: 'labs', message: `${failures.length} controlled lab result(s) failed${failures[0]?.reason ? `: ${failures[0].reason}` : '.'}`, remediation: 'Repair the lab and prove the reference solution plus hidden negative fixtures in the controlled evaluator.', mode: 'supplied_evidence' }, courseSlug, lessonSlug))
      }
      const expectedIndexes = new Set(labs.map(({ blockIndex }) => blockIndex))
      const observedIndexes = results
        .map((result) => result.blockIndex)
        .filter((blockIndex): blockIndex is number => Number.isInteger(blockIndex))
      const uniqueObserved = new Set(observedIndexes)
      const completeUniqueCoverage =
        evidence.lab?.trust === 'controlled_evaluator' &&
        results.length === labs.length &&
        uniqueObserved.size === labs.length &&
        [...expectedIndexes].every((blockIndex) => uniqueObserved.has(blockIndex)) &&
        results.every((result) => result.status === 'pass')
      if (!completeUniqueCoverage) {
        labFindings.push(makeFinding({ code: 'H2', severity: 'blocker', category: 'labs', message: 'Controlled evidence does not provide one passing result with unique per-lab coverage.', remediation: 'Emit exactly one server-owned passing result for every lab block index; reject duplicates, unknown indices, failures, and missing results.', mode: 'supplied_evidence' }, courseSlug, lessonSlug))
      }
    }
  }
  const controlledResults = evidence.lab?.results ?? []
  const labStatus: CheckStatus = !labs.length
    ? 'not_applicable'
    : labFindings.length
      ? 'fail'
      : controlledLabTrust &&
          evidence.lab?.trust === 'controlled_evaluator' &&
          controlledResults.length === labs.length &&
          new Set(controlledResults.map((result) => result.blockIndex)).size === labs.length &&
          controlledResults.every((result) => result.status === 'pass')
        ? 'pass'
        : 'pending'
  dimensions.labs = dimension('labs', [check('lab-proof', configuredLabTrust === 'untrusted_current_runtime' ? 'policy' : 'supplied_evidence', labStatus, !labs.length ? 'No lab is present in this lesson.' : configuredLabTrust === 'untrusted_current_runtime' ? 'The current runtime is explicitly untrusted for mastery.' : `${controlledResults.filter((result) => result.status === 'pass').length}/${labs.length} controlled lab result(s) passed.`)], labFindings)
  if (configuredLabTrust === 'untrusted_current_runtime' && labs.length) {
    dimensions.labs.score = null
  }

  const access = evidence.accessibility
  const accessFindings: Finding[] = []
  if ((access?.critical ?? 0) > 0 || (access?.serious ?? 0) > 0 || access?.status === 'fail') {
    accessFindings.push(makeFinding({ code: 'H4', severity: 'blocker', category: 'accessibility', message: `Accessibility evidence reports ${access?.critical ?? 0} critical and ${access?.serious ?? 0} serious violation(s)${access?.violations?.length ? ` (${access.violations.join(', ')})` : ''}.`, remediation: 'Resolve every critical and serious accessibility violation and rerun rendered axe coverage.', mode: 'supplied_evidence' }, courseSlug, lessonSlug))
  }
  const diagrams = blocks.filter((block) => isRecord(block) && block.type === 'diagram') as Array<Record<string, unknown>>
  const transcriptReady = diagrams.every((diagram) => !Array.isArray(diagram.storyboard) || diagram.storyboard.every((beat) => isRecord(beat) && typeof beat.say === 'string' && beat.say.trim()))
  dimensions.accessibility = dimension('accessibility', [
    check('static-transcript-readiness', 'deterministic', transcriptReady ? 'pass' : 'fail', transcriptReady ? 'Narrated diagram beats expose transcript text.' : 'A narrated diagram beat is missing transcript text.'),
    check('rendered-axe-wcag-2.2-aa', 'supplied_evidence', access?.axe ?? 'pending', access?.axe ? `Rendered axe evidence: ${access.axe}.` : 'Rendered axe WCAG 2.2 AA evidence is pending.'),
    check('keyboard-and-focus', 'supplied_evidence', access?.keyboardFocus ?? 'pending', access?.keyboardFocus ? `Keyboard and focus evidence: ${access.keyboardFocus}.` : 'Keyboard operation, focus order, focus visibility, and trap checks are pending.'),
    check('screen-reader-semantics', 'supplied_evidence', access?.screenReader ?? 'pending', access?.screenReader ? `Screen-reader evidence: ${access.screenReader}.` : 'Semantic structure, names, relationships, and screen-reader checks are pending.'),
    check('reduced-motion', 'supplied_evidence', access?.reducedMotion ?? 'pending', access?.reducedMotion ? `Reduced-motion evidence: ${access.reducedMotion}.` : 'Reduced-motion behavior is pending.'),
    check('zoom-and-reflow', 'supplied_evidence', access?.zoomReflow ?? 'pending', access?.zoomReflow ? `Zoom/reflow evidence: ${access.zoomReflow}.` : '200% zoom and reflow evidence is pending.'),
    check('target-size', 'supplied_evidence', access?.targetSize ?? 'pending', access?.targetSize ? `Target-size evidence: ${access.targetSize}.` : 'WCAG 2.2 target-size evidence is pending.'),
  ], accessFindings)

  const promisedMedia = blocks.filter((block) => {
    if (!isRecord(block)) return false
    if (block.type === 'video') return true
    return walkStrings(block).some((value) => /\.(mp3|mp4|wav|webm)(?:\?|$)/i.test(value))
  })
  const missingMedia = promisedMedia.filter((block) => {
    if (!isRecord(block)) return true
    if (block.type !== 'video') return false
    return !['url', 'src', 'assetUrl'].some((field) => typeof block[field] === 'string' && String(block[field]).trim())
  })
  const mediaFindings: Finding[] = []
  if (missingMedia.length || evidence.media?.status === 'fail') {
    mediaFindings.push(makeFinding({ code: 'H3', severity: 'blocker', category: 'media', message: missingMedia.length ? `${missingMedia.length} promised media block(s) have no resolvable source.` : `Media evidence reports missing/broken assets: ${evidence.media?.missing?.join(', ') || 'unspecified asset'}.`, remediation: 'Supply the promised media, captions/transcript, and successful asset integrity evidence.', mode: missingMedia.length ? 'deterministic' : 'supplied_evidence' }, courseSlug, lessonSlug))
  }
  const mediaStatus: CheckStatus = !promisedMedia.length
    ? 'not_applicable'
    : missingMedia.length || evidence.media?.status === 'fail'
      ? 'fail'
      : evidence.media?.status === 'pass'
        ? 'pass'
        : 'pending'
  dimensions.media = dimension('media', [check('promised-media-integrity', evidence.media ? 'supplied_evidence' : 'deterministic', mediaStatus, !promisedMedia.length ? 'No audio or video is promised.' : evidence.media?.status === 'pass' ? 'Promised media has passing integrity evidence.' : 'Promised media integrity evidence is missing or failing.')], mediaFindings)

  const referenceFindings: Finding[] = refErrors.map((message) =>
    makeFinding({ code: 'H5', severity: 'blocker', category: 'references', message, remediation: 'Repair the diagram/storyboard reference so every target resolves.', mode: 'deterministic' }, courseSlug, lessonSlug),
  )
  const knownCourseIndex = options.courseIndex ?? new Map([[courseSlug, new Set(bundle.course.lessons.map((item) => item.slug))]])
  const internalLinks = walkStrings(blocks).flatMap((value) => [...value.matchAll(/\/academy\/learn\/([a-z0-9_-]+)\/([a-z0-9_-]+)/g)].map((match) => ({ course: match[1], lesson: match[2] })))
  for (const link of internalLinks) {
    if (!knownCourseIndex.get(link.course)?.has(link.lesson)) {
      referenceFindings.push(makeFinding({ code: 'H5', severity: 'blocker', category: 'references', message: `Dead internal lesson reference: /academy/learn/${link.course}/${link.lesson}`, remediation: 'Point the reference at a registered course and lesson slug.', mode: 'deterministic' }, courseSlug, lessonSlug))
    }
  }
  if (options.repoRoot) {
    const publicRoot = resolve(options.repoRoot, 'public')
    for (const assetRef of collectNamedAssetRefs(blocks)) {
      if (!assetRef.startsWith('/')) continue
      const cleanRef = assetRef.split(/[?#]/, 1)[0]
      let decodedRef = cleanRef
      try {
        decodedRef = decodeURIComponent(cleanRef)
      } catch {
        // A malformed escape cannot resolve to a public asset and is handled below.
      }
      const assetPath = resolve(publicRoot, decodedRef.replace(/^\/+/, ''))
      if (
        (assetPath !== publicRoot && !assetPath.startsWith(`${publicRoot}${sep}`)) ||
        !existsSync(assetPath)
      ) {
        referenceFindings.push(makeFinding({ code: 'H5', severity: 'blocker', category: 'references', message: `Missing local asset reference: ${assetRef}`, remediation: 'Point the asset field at an existing file under public/ or remove the broken promise.', mode: 'deterministic' }, courseSlug, lessonSlug))
      }
    }
  }
  dimensions.references = dimension('references', [check('internal-reference-resolution', 'deterministic', referenceFindings.length ? 'fail' : 'pass', referenceFindings.length ? `${referenceFindings.length} internal reference defect(s).` : 'Diagram, storyboard, and lesson-route references resolve.')], referenceFindings)

  const metadataDefects = [lesson.title, lesson.moduleTitle].filter((value) => typeof value !== 'string' || !value.trim()).length + [lesson.moduleSort, lesson.sort].filter((value) => typeof value !== 'number' || !Number.isFinite(value)).length
  const metadataFindings = metadataDefects ? [makeFinding({ severity: 'high', category: 'metadata', message: `${metadataDefects} required lesson metadata field(s) are missing or invalid.`, remediation: 'Restore canonical title, module, and ordering metadata in the registry source.', mode: 'deterministic' }, courseSlug, lessonSlug)] : []
  dimensions.metadata = dimension('metadata', [check('lesson-metadata', 'deterministic', metadataDefects ? 'fail' : 'pass', metadataDefects ? 'Required lesson metadata is incomplete.' : 'Required lesson metadata is complete.')], metadataFindings)

  const duplicateOwners = [...duplicateIndex.values()].filter((owners) => owners.length > 1 && owners.includes(lessonSlug))
  const duplicationFindings = duplicateOwners.map((owners) => makeFinding({ severity: 'high', category: 'duplication', message: `A substantive teaching block is duplicated or near-duplicated across: ${owners.join(', ')}.`, remediation: 'Replace repeated teaching with course-specific explanation, example, assessment, or visual reasoning.', mode: 'deterministic' }, courseSlug, lessonSlug))
  dimensions.duplication = dimension('duplication', [check('substantive-duplication', 'deterministic', duplicateOwners.length ? 'fail' : 'pass', duplicateOwners.length ? `${duplicateOwners.length} exact/near cross-lesson duplicate(s).` : 'No exact or high-confidence near cross-lesson duplicates were detected.')], duplicationFindings)

  const expertCorrectness = evidence.expert?.contentCorrectness
  const correctnessFindings = expertCorrectness === 'fail' ? [makeFinding({ code: 'H1', severity: 'blocker', category: 'content_correctness', message: 'Expert review rejected content correctness.', remediation: 'Correct the rejected claim or explanation and obtain a new expert review.', mode: 'expert' }, courseSlug, lessonSlug)] : []
  dimensions.content_correctness = dimension('content_correctness', [check('expert-correctness-review', 'expert', expertCorrectness ?? 'pending', expertCorrectness ? `Expert correctness review: ${expertCorrectness}.` : 'Subject-matter expert correctness review is pending.')], correctnessFindings)

  const visualReview = evidence.human?.visual
  const visualFindings = !types.some((type) => ['diagram', 'viz', 'code-walkthrough', 'compare'].includes(type))
    ? [makeFinding({ severity: 'high', category: 'visual', message: 'No code-native visual teaching block is present.', remediation: 'Add a substantive visual that explains a relationship learners cannot see as clearly in prose.', mode: 'deterministic' }, courseSlug, lessonSlug)]
    : visualReview === 'fail'
      ? [makeFinding({ severity: 'high', category: 'visual', message: 'Human visual-quality review failed.', remediation: 'Revise the visual teaching artifact and obtain a new human review.', mode: 'human' }, courseSlug, lessonSlug)]
      : []
  dimensions.visual = dimension('visual', [
    check('visual-presence', 'deterministic', types.some((type) => ['diagram', 'viz', 'code-walkthrough', 'compare'].includes(type)) ? 'pass' : 'fail', 'Every lesson requires at least one substantive code-native visual.'),
    check('human-visual-review', 'human', visualReview ?? 'pending', visualReview ? `Human visual review: ${visualReview}.` : 'Human visual-teaching and legibility review is pending.'),
  ], visualFindings)

  const uxReview = evidence.human?.ux
  const uxFindings = uxReview === 'fail' ? [makeFinding({ severity: 'high', category: 'ux', message: 'Human UX review failed.', remediation: 'Repair the learner experience defect and obtain a new human review.', mode: 'human' }, courseSlug, lessonSlug)] : []
  dimensions.ux = dimension('ux', [check('human-ux-review', 'human', uxReview ?? 'pending', uxReview ? `Human UX review: ${uxReview}.` : 'Human comprehension, flow, and appeal review is pending.')], uxFindings)

  const perf = evidence.performance?.status
  dimensions.performance = dimension('performance', [check('rendered-performance', 'supplied_evidence', perf ?? 'pending', perf ? `Rendered performance evidence: ${perf}.` : 'Production-like performance evidence is pending.')])
  const consistency = evidence.consistency?.status
  dimensions.consistency = dimension('consistency', [check('rendered-consistency', 'supplied_evidence', consistency ?? 'pending', consistency ? `Design-system consistency evidence: ${consistency}.` : 'Rendered design-system consistency evidence is pending.')])

  for (const id of DIMENSION_IDS) {
    if (!dimensions[id]) throw new Error(`Harness invariant: dimension '${id}' was not evaluated`)
  }
  const allFindings = Object.values(dimensions).flatMap((result) => result.findings)
  const hardFails = allFindings.filter((finding) => finding.code)
  const requiredPending = Object.values(dimensions)
    .filter((result) => result.checks.some((item) => item.required && item.status === 'pending'))
    .map((result) => result.id)
  const deterministicChecks = Object.values(dimensions).flatMap((result) => result.checks).filter((item) => item.mode === 'deterministic' && item.status !== 'not_applicable')
  const deterministicScore = deterministicChecks.length
    ? Math.round((deterministicChecks.filter((item) => item.status === 'pass').length / deterministicChecks.length) * 1000) / 10
    : null
  const requiredFailure = Object.values(dimensions).some((result) =>
    result.checks.some((item) => item.required && item.status === 'fail'),
  )
  const complete = hardFails.length === 0 && requiredPending.length === 0 && !requiredFailure
  const decision: ReadinessDecision = hardFails.length
    ? 'blocked'
    : requiredFailure
      ? 'needs_remediation'
      : requiredPending.length
        ? 'pending_review'
        : 'eligible_for_certification'

  return {
    schemaVersion: 2,
    harnessVersion: HARNESS_VERSION,
    registryVersion: options.registryVersion,
    generatedAt: options.generatedAt,
    courseSlug,
    lessonSlug,
    contentHash: sha256(rawBlocks),
    labTrust: labs.length ? configuredLabTrust : 'not_applicable',
    dimensions,
    deterministicScore,
    compositeScore: complete ? 100 : null,
    hardFails,
    requiredPending,
    decision,
    certificationStatus: CERTIFICATION_STATUS,
  }
}

function aggregateDimensions(lessonScorecards: LessonScorecard[]): Record<string, DimensionResult> {
  return Object.fromEntries(DIMENSION_IDS.map((id) => {
    const children = lessonScorecards.map((lesson) => lesson.dimensions[id])
    const status: CheckStatus = children.some((child) => child.status === 'fail')
      ? 'fail'
      : children.some((child) => child.status === 'pending')
        ? 'pending'
        : children.every((child) => child.status === 'not_applicable')
          ? 'not_applicable'
          : 'pass'
    const scored = children.map((child) => child.score).filter((value): value is number => typeof value === 'number')
    return [id, {
      id,
      status,
      score:
        id === 'labs' && children.some((child) => child.status === 'fail' && child.score === null)
          ? null
          : status === 'pass' && scored.length
            ? Math.round((scored.reduce((sum, value) => sum + value, 0) / scored.length) * 10) / 10
            : status === 'fail'
              ? 0
              : null,
      checks: [check(`lesson-rollup-${id}`, 'deterministic', status, `${children.filter((child) => child.status === 'pass').length}/${children.length} lesson(s) passed this dimension.`)],
      findings: children.flatMap((child) => child.findings),
    } satisfies DimensionResult]
  }))
}

export function auditCourseBundle(bundle: AuditBundle, options: AuditOptions): CourseScorecard {
  const missingLessonSlugs = bundle.course.lessons
    .map((lesson) => lesson.slug)
    .filter((slug) => !Object.prototype.hasOwnProperty.call(bundle.lessons, slug))
  if (missingLessonSlugs.length) {
    throw new Error(
      `Course '${bundle.course.slug}' is missing registered lesson payloads: ${missingLessonSlugs.join(', ')}`,
    )
  }
  const duplicateIndex = buildDuplicateIndex(bundle.lessons)
  const lessonScorecards = bundle.course.lessons.map((lesson) =>
    auditLesson(bundle, lesson, bundle.lessons[lesson.slug], options, duplicateIndex),
  )
  const orphanLessonSlugs = Object.keys(bundle.lessons).filter((slug) => !bundle.course.lessons.some((lesson) => lesson.slug === slug))
  if (orphanLessonSlugs.length) {
    throw new Error(`Course '${bundle.course.slug}' contains unregistered lessons: ${orphanLessonSlugs.join(', ')}`)
  }
  const dimensions = aggregateDimensions(lessonScorecards)
  const hardFails = lessonScorecards.flatMap((lesson) => lesson.hardFails)
  const requiredPending = [...new Set(lessonScorecards.flatMap((lesson) => lesson.requiredPending))].sort()
  const deterministic = lessonScorecards.map((lesson) => lesson.deterministicScore).filter((value): value is number => typeof value === 'number')
  const deterministicScore = deterministic.length ? Math.round((deterministic.reduce((sum, value) => sum + value, 0) / deterministic.length) * 10) / 10 : null
  const allEligible = lessonScorecards.length > 0 && lessonScorecards.every((lesson) => lesson.decision === 'eligible_for_certification')
  const decision: ReadinessDecision = hardFails.length
    ? 'blocked'
    : lessonScorecards.some((lesson) => lesson.decision === 'needs_remediation')
      ? 'needs_remediation'
      : allEligible
        ? 'eligible_for_certification'
        : 'pending_review'
  return {
    schemaVersion: 2,
    harnessVersion: HARNESS_VERSION,
    registryVersion: options.registryVersion,
    generatedAt: options.generatedAt,
    courseSlug: bundle.course.slug,
    title: bundle.course.title,
    contentHash: sha256({ lessons: bundle.lessons, solutions: bundle.solutions ?? {}, sources: bundle.sourceLedger ?? [] }),
    lessonCount: lessonScorecards.length,
    labTrust: lessonScorecards.some((lesson) => lesson.labTrust !== 'not_applicable')
      ? lessonScorecards.filter((lesson) => lesson.labTrust !== 'not_applicable').every((lesson) => lesson.labTrust === 'trusted_controlled_runtime')
        ? 'trusted_controlled_runtime'
        : options.labTrust
      : 'not_applicable',
    dimensions,
    deterministicScore,
    compositeScore: allEligible ? 100 : null,
    hardFails,
    requiredPending,
    decision,
    certificationStatus: CERTIFICATION_STATUS,
    lessonScorecards,
  }
}

function confinedPath(repoRoot: string, relativePath: string): string {
  if (isAbsolute(relativePath)) throw new Error(`Absolute registry evidence path is forbidden: ${relativePath}`)
  const root = resolve(repoRoot)
  const target = resolve(root, relativePath)
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`Registry evidence path escapes repository: ${relativePath}`)
  return target
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function bundleFromRegistry(
  course: RegistryCourse,
  repoRoot: string,
  activationEvidence?: ReadonlyMap<string, LessonEvidence>,
): AuditBundle {
  const lessonPath = course.authoring?.lessonBundle
  if (!lessonPath) throw new Error(`Registered course '${course.slug}' has no authoring lesson bundle`)
  const resolvedLessonPath = confinedPath(repoRoot, lessonPath)
  const solutionPath = course.authoring?.solutionBundle
  const ledgerPath = course.sources?.ledger
  return {
    course,
    lessons: readJson(resolvedLessonPath) as Record<string, unknown>,
    solutions: solutionPath && existsSync(confinedPath(repoRoot, solutionPath))
      ? (readJson(confinedPath(repoRoot, solutionPath)) as AuditBundle['solutions'])
      : {},
    sourceLedger: ledgerPath && existsSync(confinedPath(repoRoot, ledgerPath))
      ? (readJson(confinedPath(repoRoot, ledgerPath)) as SourceRow[])
      : null,
    evidence: Object.fromEntries(course.lessons.flatMap((lesson) => {
      const evidence = activationEvidence?.get(`${course.slug}/${lesson.slug}`)
      return evidence ? [[lesson.slug, evidence]] : []
    })),
  }
}

function remediationBacklog(courseScorecards: CourseScorecard[]) {
  const grouped = new Map<string, { category: string; code?: string; severity: Finding['severity']; remediation: string; courseSlugs: Set<string>; lessonCount: number; findingCount: number }>()
  for (const course of courseScorecards) {
    const findings = course.lessonScorecards.flatMap((lesson) => [
      ...Object.values(lesson.dimensions).flatMap((result) => result.findings),
      ...Object.values(lesson.dimensions).flatMap((result) => result.checks.filter((item) => item.required && item.status === 'pending').map((item) => makeFinding({ severity: item.mode === 'expert' ? 'high' : 'medium', category: result.id, message: item.summary, remediation: `Complete required ${result.id} evidence: ${item.id}.`, mode: item.mode }, course.courseSlug, lesson.lessonSlug))),
    ])
    for (const finding of findings) {
      const key = stableStringify([finding.code ?? '', finding.category, finding.remediation])
      const current = grouped.get(key) ?? { category: finding.category, ...(finding.code ? { code: finding.code } : {}), severity: finding.severity, remediation: finding.remediation, courseSlugs: new Set<string>(), lessonCount: 0, findingCount: 0 }
      current.courseSlugs.add(course.courseSlug)
      current.lessonCount += 1
      current.findingCount += 1
      grouped.set(key, current)
    }
  }
  const severityRank = { blocker: 4, high: 3, medium: 2, low: 1 }
  return [...grouped.values()]
    .map((item) => ({ ...item, courseSlugs: [...item.courseSlugs].sort(), priority: severityRank[item.severity] * 1_000_000 + item.courseSlugs.size * 10_000 + item.findingCount }))
    .sort((a, b) => b.priority - a.priority || a.category.localeCompare(b.category))
    .map((item, index) => ({ rank: index + 1, ...item }))
}

export function auditAcademy({ registry, repoRoot, generatedAt, activation }: AcademyInput) {
  const flagshipGraph = loadFlagshipCompetencyGraph(repoRoot)
  const flagshipGraphValidation = validateFlagshipCompetencyGraph(flagshipGraph, registry)
  if (flagshipGraphValidation.errors.length > 0) {
    throw new Error(`Flagship competency graph is invalid:\n${flagshipGraphValidation.errors.join('\n')}`)
  }
  const courseIndex = new Map(registry.courses.map((course) => [course.slug, new Set(course.lessons.map((lesson) => lesson.slug))]))
  const courseScorecards = registry.courses.map((course) => auditCourseBundle(bundleFromRegistry(course, repoRoot, activation?.evidenceByLesson), {
    registryVersion: registry.registryVersion,
    generatedAt,
    labTrust: 'untrusted_current_runtime',
    repoRoot,
    courseIndex,
    trustedLabKeys: activation?.trustedLabKeys,
  }))
  if (courseScorecards.length !== registry.totals.courses) throw new Error(`Audit coverage drift: expected ${registry.totals.courses} courses, audited ${courseScorecards.length}`)
  const lessonsAudited = courseScorecards.reduce((sum, course) => sum + course.lessonCount, 0)
  if (lessonsAudited !== registry.totals.lessons) throw new Error(`Audit coverage drift: expected ${registry.totals.lessons} lessons, audited ${lessonsAudited}`)
  const bySlug = new Map(courseScorecards.map((course) => [course.courseSlug, course]))
  const flagshipReadiness = {
    pathId: flagshipGraph.pathId,
    graphStatus: flagshipGraph.status,
    status: 'mapped_draft_pending_certification',
    masteryPolicy: flagshipGraph.masteryPolicy,
    phases: flagshipGraph.phases.map((phase) => {
      const courses = phase.courseSlugs.map((slug) => bySlug.get(slug)).filter((course): course is CourseScorecard => Boolean(course))
      return {
        id: phase.id,
        label: phase.label,
        prerequisitePhaseIds: phase.prerequisitePhaseIds,
        competencyIds: phase.competencyIds,
        courseSlugs: phase.courseSlugs,
        ...(phase.releaseGap ? { releaseGap: phase.releaseGap } : {}),
        ready: phase.courseSlugs.length > 0 && courses.length === phase.courseSlugs.length && courses.every((course) => course.decision === 'eligible_for_certification'),
        blockedCourses: courses.filter((course) => course.decision !== 'eligible_for_certification').map((course) => course.courseSlug),
      }
    }),
  }
  const summary = {
    coursesAudited: courseScorecards.length,
    lessonsAudited,
    coursesEligible: courseScorecards.filter((course) => course.decision === 'eligible_for_certification').length,
    coursesBlocked: courseScorecards.filter((course) => course.decision === 'blocked').length,
    coursesNeedsRemediation: courseScorecards.filter((course) => course.decision === 'needs_remediation').length,
    coursesPendingReview: courseScorecards.filter((course) => course.decision === 'pending_review').length,
    coursesCertified: 0,
    hardFailCounts: Object.fromEntries(['H1', 'H2', 'H3', 'H4', 'H5'].map((code) => [code, courseScorecards.flatMap((course) => course.hardFails).filter((finding) => finding.code === code).length])),
  }
  const executionCoverage = {
    staticAuthoring: {
      scope: 'full' as const,
      courses: courseScorecards.length,
      lessons: lessonsAudited,
      note: 'Every registered Git-resident bundle was parsed and evaluated independently.',
    },
    currentLabExecution: {
      scope: activation?.trustedLabKeys.size ? 'attested_partial' as const : 'none_by_policy' as const,
      executed: activation?.trustedLabKeys.size ?? 0,
      note: activation?.trustedLabKeys.size
        ? 'Only labs named by the verified, release-bound activation attestation are accepted as controlled evidence.'
        : 'No verified activation attestation was supplied; every current lab remains untrusted by policy.',
    },
    externalLinkReachability: {
      scope: 'none_by_policy' as const,
      checked: 0,
      note: 'The default audit is deterministic and offline; external reachability evidence remains pending.',
    },
    renderedAccessibility: {
      scope: 'no_evidence_supplied' as const,
      lessons: 0,
      note: 'Static transcript readiness runs for all lessons; rendered axe, keyboard, contrast, and reduced-motion evidence remains pending.',
    },
    renderedPerformance: {
      scope: 'no_evidence_supplied' as const,
      lessons: 0,
      note: 'No production-like Lighthouse evidence is inferred from source files.',
    },
    expertAndHumanReview: {
      scope: 'no_evidence_supplied' as const,
      lessons: 0,
      note: 'Correctness, pedagogy, visual teaching, and UX judgments remain explicitly pending.',
    },
  }
  return {
    schemaVersion: 2,
    harnessVersion: HARNESS_VERSION,
    registryVersion: registry.registryVersion,
    generatedAt,
    authority: 'scripts/academy/quality/v2/run.ts',
    labTrust: 'untrusted_current_runtime' as const,
    certificationPolicy: 'No course is certified by this audit. Eligibility requires zero hard fails and zero required pending checks.',
    summary,
    executionCoverage,
    courseScorecards,
    remediationBacklog: remediationBacklog(courseScorecards),
    flagshipReadiness,
  }
}

export function normalizeVolatileFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => normalizeVolatileFields(item)) as T
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['generatedAt', 'runId'].includes(key))
      .map(([key, item]) => [key, normalizeVolatileFields(item)]),
  ) as T
}
