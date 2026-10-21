import { createHash } from 'node:crypto'

export const EVALUATOR_LIMITS = Object.freeze({
  codeBytes: 64 * 1024,
  stdinBytes: 8 * 1024,
  outputBytes: 64 * 1024,
  requestBytes: 96 * 1024,
  wallTimeMs: 5_000,
  cpuSeconds: 3,
  memoryMb: 128,
  javascriptHeapMb: 96,
  javascriptSemiSpaceMb: 4,
  sandboxMemoryMb: 2_048,
  writableTmpfsMb: 16,
  pids: 32,
  cpus: 0.5,
  maxCases: 12,
  maxConcurrency: 4,
  signatureTtlMs: 60_000,
})

export const EVALUATOR_VERSION = 'academy-evaluator-v3'

const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const LAB_KEY_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*\/[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_RE = /^[a-f0-9]{64}$/

export type LabLanguage = 'python' | 'javascript' | 'sql'

export type EvaluationRequest = {
  schemaVersion: 1
  requestId: string
  issuedAt: number
  labKey: string
  code: string
  submissionDigest: string
}

export type PrivateCaseKind = 'happy' | 'edge' | 'negative'

export type PrivateLabCase = {
  id: string
  kind: PrivateCaseKind
  stdin: string
  expectedStdout: string
}

export type PrivateLabSpec = {
  schemaVersion: 1
  labKey: string
  language: LabLanguage
  specRevision: string
  referenceSolution: string
  cases: PrivateLabCase[]
}

export type CaseExecutionStatus = 'passed' | 'runtime_error' | 'timed_out' | 'output_limited' | 'memory_limited'

export type PrivateCaseResult = {
  caseId: string
  status: CaseExecutionStatus
  stdout: string
  expectedStdout: string
  outputBytes: number
}

export type EvaluationVerdict = 'passed' | 'failed' | 'untrusted' | 'error'
export type EvaluationReason =
  | 'all_private_cases_passed'
  | 'private_case_failed'
  | 'resource_limit_exceeded'
  | 'runtime_error'
  | 'private_spec_missing'
  | 'private_spec_invalid'
  | 'evaluator_unavailable'

export type EvaluationResponse = {
  schemaVersion: 2
  evaluationId: string
  requestId: string
  issuedAt: number
  labKey: string
  submissionDigest: string
  evaluatorVersion: string
  policyHash: string
  specRevision: string | null
  specDigest: string | null
  runtimeImage: string | null
  verdict: EvaluationVerdict
  reason: EvaluationReason
  tests: { passed: number; total: number }
  resourceUsage: { durationMs: number; outputBytes: number }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const object = value as Record<string, unknown>
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`
}

export function privateSpecDigest(spec: unknown): string {
  return sha256(stableStringify(spec))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) throw new Error(`unknown field: ${unknown[0]}`)
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function buildLabKey(courseSlug: string, lessonSlug: string): string {
  if (!SLUG_RE.test(courseSlug)) throw new Error('invalid course slug')
  if (!SLUG_RE.test(lessonSlug)) throw new Error('invalid lesson slug')
  return `${courseSlug}/${lessonSlug}`
}

export function parseEvaluationRequest(value: unknown): EvaluationRequest {
  if (!isRecord(value)) throw new Error('evaluation request must be an object')
  assertExactKeys(value, ['schemaVersion', 'requestId', 'issuedAt', 'labKey', 'code', 'submissionDigest'])
  if (value.schemaVersion !== 1) throw new Error('unsupported evaluation request schema')
  if (typeof value.requestId !== 'string' || !UUID_RE.test(value.requestId)) throw new Error('invalid request id')
  if (!Number.isSafeInteger(value.issuedAt) || (value.issuedAt as number) <= 0) throw new Error('invalid issuedAt')
  if (typeof value.labKey !== 'string' || !LAB_KEY_RE.test(value.labKey)) throw new Error('invalid lab key')
  if (typeof value.code !== 'string' || value.code.trim().length === 0) throw new Error('code is required')
  if (byteLength(value.code) > EVALUATOR_LIMITS.codeBytes) throw new Error('code exceeds byte limit')
  if (typeof value.submissionDigest !== 'string' || !SHA256_RE.test(value.submissionDigest)) {
    throw new Error('invalid submission digest')
  }
  if (sha256(value.code) !== value.submissionDigest) throw new Error('submission digest mismatch')
  return value as EvaluationRequest
}

function parseCase(value: unknown, seen: Set<string>): PrivateLabCase {
  if (!isRecord(value)) throw new Error('private case must be an object')
  assertExactKeys(value, ['id', 'kind', 'stdin', 'expectedStdout'])
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value.id)) throw new Error('invalid private case id')
  if (seen.has(value.id)) throw new Error(`duplicate private case id: ${value.id}`)
  seen.add(value.id)
  if (!['happy', 'edge', 'negative'].includes(String(value.kind))) throw new Error('invalid private case kind')
  if (typeof value.stdin !== 'string' || byteLength(value.stdin) > EVALUATOR_LIMITS.stdinBytes) throw new Error('stdin exceeds byte limit')
  if (typeof value.expectedStdout !== 'string' || byteLength(value.expectedStdout) > EVALUATOR_LIMITS.outputBytes) {
    throw new Error('expected output exceeds byte limit')
  }
  return value as PrivateLabCase
}

export function validatePrivateSpec(value: unknown): PrivateLabSpec {
  if (!isRecord(value)) throw new Error('private spec must be an object')
  assertExactKeys(value, ['schemaVersion', 'labKey', 'language', 'specRevision', 'referenceSolution', 'cases'])
  if (value.schemaVersion !== 1) throw new Error('unsupported private spec schema')
  if (typeof value.labKey !== 'string' || !LAB_KEY_RE.test(value.labKey)) throw new Error('invalid lab key')
  if (!['python', 'javascript', 'sql'].includes(String(value.language))) throw new Error('unsupported lab language')
  if (typeof value.specRevision !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(value.specRevision)) throw new Error('invalid spec revision')
  if (typeof value.referenceSolution !== 'string' || value.referenceSolution.trim().length === 0) {
    throw new Error('private reference solution is required')
  }
  if (byteLength(value.referenceSolution) > EVALUATOR_LIMITS.codeBytes) throw new Error('reference solution exceeds byte limit')
  if (!Array.isArray(value.cases) || value.cases.length < 2) throw new Error('private spec requires at least two cases')
  if (value.cases.length > EVALUATOR_LIMITS.maxCases) throw new Error('private spec exceeds case limit')
  const seen = new Set<string>()
  const cases = value.cases.map((testCase) => parseCase(testCase, seen))
  if (!cases.some((testCase) => testCase.kind === 'negative')) throw new Error('private spec requires a negative case')
  return { ...(value as Omit<PrivateLabSpec, 'cases'>), cases }
}

export function parseEvaluationResponse(value: unknown): EvaluationResponse {
  if (!isRecord(value)) throw new Error('evaluation response must be an object')
  assertExactKeys(value, [
    'schemaVersion', 'evaluationId', 'requestId', 'issuedAt', 'labKey', 'submissionDigest',
    'evaluatorVersion', 'policyHash', 'specRevision', 'specDigest', 'runtimeImage',
    'verdict', 'reason', 'tests', 'resourceUsage',
  ])
  if (value.schemaVersion !== 2) throw new Error('unsupported evaluation response schema')
  if (typeof value.evaluationId !== 'string' || !UUID_RE.test(value.evaluationId)) throw new Error('invalid evaluation id')
  if (typeof value.requestId !== 'string' || !UUID_RE.test(value.requestId)) throw new Error('invalid request id')
  if (!Number.isSafeInteger(value.issuedAt) || (value.issuedAt as number) <= 0) throw new Error('invalid issuedAt')
  if (typeof value.labKey !== 'string' || !LAB_KEY_RE.test(value.labKey)) throw new Error('invalid lab key')
  if (typeof value.submissionDigest !== 'string' || !SHA256_RE.test(value.submissionDigest)) throw new Error('invalid submission digest')
  if (typeof value.evaluatorVersion !== 'string' || value.evaluatorVersion.length > 64) throw new Error('invalid evaluator version')
  if (typeof value.policyHash !== 'string' || !SHA256_RE.test(value.policyHash)) throw new Error('invalid policy hash')
  if (value.specRevision !== null && (typeof value.specRevision !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(value.specRevision))) {
    throw new Error('invalid spec revision')
  }
  if (value.specDigest !== null && (typeof value.specDigest !== 'string' || !SHA256_RE.test(value.specDigest))) {
    throw new Error('invalid spec digest')
  }
  if (
    value.runtimeImage !== null &&
    (typeof value.runtimeImage !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*@sha256:[0-9a-f]{64}$/.test(value.runtimeImage))
  ) throw new Error('invalid runtime image')
  if ((value.specRevision === null) !== (value.specDigest === null)) throw new Error('incomplete private spec identity')
  if (!['passed', 'failed', 'untrusted', 'error'].includes(String(value.verdict))) throw new Error('invalid verdict')
  const reasons: EvaluationReason[] = [
    'all_private_cases_passed', 'private_case_failed', 'resource_limit_exceeded', 'runtime_error',
    'private_spec_missing', 'private_spec_invalid', 'evaluator_unavailable',
  ]
  if (!reasons.includes(value.reason as EvaluationReason)) throw new Error('invalid reason')
  if (!isRecord(value.tests) || !Number.isInteger(value.tests.passed) || !Number.isInteger(value.tests.total)) throw new Error('invalid test totals')
  if ((value.tests.passed as number) < 0 || (value.tests.total as number) < 0 || (value.tests.passed as number) > (value.tests.total as number)) throw new Error('invalid test counts')
  if (!isRecord(value.resourceUsage) || !Number.isFinite(value.resourceUsage.durationMs) || !Number.isInteger(value.resourceUsage.outputBytes)) throw new Error('invalid resource usage')
  if ((value.resourceUsage.durationMs as number) < 0 || (value.resourceUsage.outputBytes as number) < 0) throw new Error('invalid resource usage')
  return value as EvaluationResponse
}

export function gradePrivateCases(results: readonly PrivateCaseResult[]): {
  verdict: 'passed' | 'failed'
  reason: 'all_private_cases_passed' | 'private_case_failed' | 'resource_limit_exceeded' | 'runtime_error'
  passed: number
  total: number
  outputBytes: number
} {
  const outputBytes = results.reduce((total, result) => total + result.outputBytes, 0)
  const resourceFailure = results.some((result) => ['timed_out', 'output_limited', 'memory_limited'].includes(result.status))
  const runtimeFailure = results.some((result) => result.status === 'runtime_error')
  const passed = results.filter((result) => result.status === 'passed' && result.stdout === result.expectedStdout).length
  if (resourceFailure) return { verdict: 'failed', reason: 'resource_limit_exceeded', passed, total: results.length, outputBytes }
  if (runtimeFailure) return { verdict: 'failed', reason: 'runtime_error', passed, total: results.length, outputBytes }
  if (results.length === 0 || passed !== results.length) return { verdict: 'failed', reason: 'private_case_failed', passed, total: results.length, outputBytes }
  return { verdict: 'passed', reason: 'all_private_cases_passed', passed, total: results.length, outputBytes }
}

export function evaluatorPolicyHash(): string {
  return sha256(JSON.stringify({ version: EVALUATOR_VERSION, limits: EVALUATOR_LIMITS }))
}
