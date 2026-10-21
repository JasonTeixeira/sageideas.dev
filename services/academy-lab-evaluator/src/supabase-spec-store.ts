import { validatePrivateSpec, type PrivateLabSpec } from '../../../lib/academy/lab-evaluator/contract'
import { privateSpecDigest } from '../../../scripts/academy/lab-evaluator/staging/core'

type StoredPrivateSpecRow = {
  lab_key: unknown
  spec_revision: unknown
  spec_digest: unknown
  spec: unknown
}

export function validateStoredPrivateSpec(
  row: StoredPrivateSpecRow,
  expected: { labKey: string; specRevision: string; specDigest: string },
): PrivateLabSpec {
  if (row.lab_key !== expected.labKey) throw new Error('private spec lab key mismatch')
  if (row.spec_revision !== expected.specRevision) throw new Error('private spec revision mismatch')
  if (row.spec_digest !== expected.specDigest) throw new Error('private spec digest pin mismatch')
  const spec = validatePrivateSpec(row.spec)
  if (spec.labKey !== expected.labKey) throw new Error('private spec payload lab key mismatch')
  if (spec.specRevision !== expected.specRevision) throw new Error('private spec payload revision mismatch')
  if (privateSpecDigest(spec) !== expected.specDigest) throw new Error('private spec digest mismatch')
  return spec
}
