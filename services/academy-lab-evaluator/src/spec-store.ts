import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { EVALUATOR_LIMITS, validatePrivateSpec, type PrivateLabSpec } from '../../../lib/academy/lab-evaluator/contract'

const LAB_KEY_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*\/[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const MAX_SPEC_BYTES = EVALUATOR_LIMITS.requestBytes * 4

export async function loadPrivateSpec(root: string, labKey: string): Promise<PrivateLabSpec | null> {
  if (!path.isAbsolute(root)) throw new Error('private spec root must be absolute')
  if (!LAB_KEY_RE.test(labKey)) throw new Error('invalid lab key')
  const [courseSlug, lessonSlug] = labKey.split('/')
  const rootPath = path.resolve(root)
  const specPath = path.resolve(rootPath, `${courseSlug}--${lessonSlug}.json`)
  if (!specPath.startsWith(`${rootPath}${path.sep}`)) throw new Error('private spec path escaped root')

  let raw: string
  try {
    raw = await readFile(specPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_SPEC_BYTES) throw new Error('private spec exceeds file limit')
  const spec = validatePrivateSpec(JSON.parse(raw) as unknown)
  if (spec.labKey !== labKey) throw new Error('private spec lab key mismatch')
  return spec
}
