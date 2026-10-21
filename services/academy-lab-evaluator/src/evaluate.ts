import { randomUUID } from 'node:crypto'

import {
  EVALUATOR_VERSION,
  evaluatorPolicyHash,
  gradePrivateCases,
  privateSpecDigest,
  type EvaluationRequest,
  type EvaluationResponse,
  type PrivateCaseResult,
  type PrivateLabCase,
  type PrivateLabSpec,
} from '../../../lib/academy/lab-evaluator/contract'

export type EvaluationDependencies = {
  now?: () => number
  newId?: () => string
  loadSpec: (labKey: string) => Promise<PrivateLabSpec | null>
  proveSpec?: (spec: PrivateLabSpec) => Promise<boolean>
  executeCase: (code: string, testCase: PrivateLabCase, spec: PrivateLabSpec) => Promise<PrivateCaseResult>
  runtimeImageFor?: (spec: PrivateLabSpec) => string
}

function baseResponse(
  request: EvaluationRequest,
  deps: EvaluationDependencies,
  identity: { specRevision: string | null; specDigest: string | null; runtimeImage: string | null },
): Omit<EvaluationResponse, 'verdict' | 'reason' | 'tests' | 'resourceUsage'> {
  const now = deps.now ?? Date.now
  return {
    schemaVersion: 2,
    evaluationId: (deps.newId ?? randomUUID)(),
    requestId: request.requestId,
    issuedAt: now(),
    labKey: request.labKey,
    submissionDigest: request.submissionDigest,
    evaluatorVersion: EVALUATOR_VERSION,
    policyHash: evaluatorPolicyHash(),
    ...identity,
  }
}

export async function evaluateSubmission(
  request: EvaluationRequest,
  deps: EvaluationDependencies,
): Promise<EvaluationResponse> {
  const now = deps.now ?? Date.now
  const startedAt = now()
  let spec: PrivateLabSpec | null
  try {
    spec = await deps.loadSpec(request.labKey)
  } catch {
    return {
      ...baseResponse(request, deps, { specRevision: null, specDigest: null, runtimeImage: null }),
      verdict: 'untrusted', reason: 'private_spec_invalid', tests: { passed: 0, total: 0 },
      resourceUsage: { durationMs: Math.max(0, now() - startedAt), outputBytes: 0 },
    }
  }
  if (!spec) {
    return {
      ...baseResponse(request, deps, { specRevision: null, specDigest: null, runtimeImage: null }),
      verdict: 'untrusted', reason: 'private_spec_missing', tests: { passed: 0, total: 0 },
      resourceUsage: { durationMs: Math.max(0, now() - startedAt), outputBytes: 0 },
    }
  }
  const identity = {
    specRevision: spec.specRevision,
    specDigest: privateSpecDigest(spec),
    runtimeImage: deps.runtimeImageFor?.(spec) ?? null,
  }
  if (deps.proveSpec && !(await deps.proveSpec(spec))) {
    return {
      ...baseResponse(request, deps, identity),
      verdict: 'untrusted', reason: 'private_spec_invalid', tests: { passed: 0, total: spec.cases.length },
      resourceUsage: { durationMs: Math.max(0, now() - startedAt), outputBytes: 0 },
    }
  }

  const results: PrivateCaseResult[] = []
  for (const testCase of spec.cases) {
    try {
      results.push(await deps.executeCase(request.code, testCase, spec))
    } catch {
      results.push({
        caseId: testCase.id,
        status: 'runtime_error',
        stdout: '',
        expectedStdout: testCase.expectedStdout,
        outputBytes: 0,
      })
    }
  }
  const grade = gradePrivateCases(results)
  return {
    ...baseResponse(request, deps, identity),
    verdict: grade.verdict,
    reason: grade.reason,
    tests: { passed: grade.passed, total: grade.total },
    resourceUsage: {
      durationMs: Math.max(0, now() - startedAt),
      outputBytes: grade.outputBytes,
    },
  }
}
