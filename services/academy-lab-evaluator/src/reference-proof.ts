import { gradePrivateCases, sha256, type PrivateCaseResult, type PrivateLabCase, type PrivateLabSpec } from '../../../lib/academy/lab-evaluator/contract'

export type ReferenceCaseExecutor = (
  code: string,
  testCase: PrivateLabCase,
  spec: PrivateLabSpec,
) => Promise<PrivateCaseResult>

export function createReferenceProofCache(execute: ReferenceCaseExecutor) {
  const cache = new Map<string, Promise<boolean>>()
  return async (spec: PrivateLabSpec): Promise<boolean> => {
    const cacheKey = sha256(JSON.stringify(spec))
    const existing = cache.get(cacheKey)
    if (existing) return existing
    const proof = (async () => {
      const results: PrivateCaseResult[] = []
      for (const testCase of spec.cases) {
        try {
          results.push(await execute(spec.referenceSolution, testCase, spec))
        } catch {
          return false
        }
      }
      return gradePrivateCases(results).verdict === 'passed'
    })()
    cache.set(cacheKey, proof)
    return proof
  }
}
