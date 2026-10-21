import path from 'node:path'

import type { LabLanguage } from '../../../lib/academy/lab-evaluator/contract'
import { validatePinnedImage } from './docker-policy'

export type EvaluatorConfig = {
  secret: string
  privateSpecRoot: string
  jobRoot: string
  images: Record<LabLanguage, string>
  host: string
  port: number
}

function required(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim()
  if (!value) throw new Error(`${key} is required`)
  return value
}

function absoluteRoot(env: Record<string, string | undefined>, key: string): string {
  const value = required(env, key)
  if (!path.isAbsolute(value)) throw new Error(`${key} must be an absolute path`)
  return path.resolve(value)
}

export function loadEvaluatorConfig(env: Record<string, string | undefined> = process.env): EvaluatorConfig {
  const secret = required(env, 'ACADEMY_LAB_EVALUATOR_SECRET')
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('ACADEMY_LAB_EVALUATOR_SECRET must be at least 32 bytes')
  const privateSpecRoot = absoluteRoot(env, 'ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT')
  const jobRoot = absoluteRoot(env, 'ACADEMY_EVALUATOR_JOB_ROOT')
  if (
    privateSpecRoot === jobRoot ||
    privateSpecRoot.startsWith(`${jobRoot}${path.sep}`) ||
    jobRoot.startsWith(`${privateSpecRoot}${path.sep}`)
  ) throw new Error('private spec root and job root must be disjoint')

  const port = Number(env.ACADEMY_EVALUATOR_PORT ?? '8787')
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error('invalid evaluator port')
  const host = env.ACADEMY_EVALUATOR_HOST?.trim() || '127.0.0.1'
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('evaluator host must be a loopback address')
  }
  return {
    secret,
    privateSpecRoot,
    jobRoot,
    host,
    port,
    images: {
      python: validatePinnedImage(required(env, 'ACADEMY_EVALUATOR_IMAGE_PYTHON')),
      javascript: validatePinnedImage(required(env, 'ACADEMY_EVALUATOR_IMAGE_JAVASCRIPT')),
      sql: validatePinnedImage(required(env, 'ACADEMY_EVALUATOR_IMAGE_SQL')),
    },
  }
}
