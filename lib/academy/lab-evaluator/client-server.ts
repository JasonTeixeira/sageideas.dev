import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/server'
import {
  flagshipLabSpecDigest,
  flagshipLabSpecRevision,
} from './activation'
import { requestControlledEvaluation } from './client'
import type { TrustedLabEvaluation } from './signing'
import {
  evaluateLabWithVercelSandbox,
  loadVercelSandboxEvaluatorConfig,
} from '@/services/academy-lab-evaluator/src/vercel-sandbox-evaluate'
import { validateStoredPrivateSpec } from '@/services/academy-lab-evaluator/src/supabase-spec-store'

async function loadFlagshipPrivateSpec(courseSlug: string, lessonSlug: string, labKey: string) {
  const expectedLabKey = `${courseSlug}/${lessonSlug}`
  const specRevision = flagshipLabSpecRevision(courseSlug, lessonSlug)
  const specDigest = flagshipLabSpecDigest(courseSlug, lessonSlug)
  if (labKey !== expectedLabKey || !specRevision || !specDigest) return null

  const { data, error } = await supabaseAdmin()
    .from('academy_private_lab_specs')
    .select('lab_key, spec_revision, spec_digest, spec')
    .eq('lab_key', labKey)
    .eq('spec_revision', specRevision)
    .maybeSingle()
  if (error) throw new Error(`private lab spec lookup failed: ${error.message}`)
  if (!data) return null
  return validateStoredPrivateSpec(data, { labKey, specRevision, specDigest })
}

export async function evaluateLabOnControlledService(input: {
  courseSlug: string
  lessonSlug: string
  code: string
}): Promise<TrustedLabEvaluation | null> {
  const provider = process.env.ACADEMY_LAB_EVALUATOR_PROVIDER
  const managedConfig = provider === 'vercel-sandbox'
    ? loadVercelSandboxEvaluatorConfig(process.env)
    : null
  if (managedConfig) {
    return evaluateLabWithVercelSandbox(input, {
      ...managedConfig,
      loadSpec: (labKey) => loadFlagshipPrivateSpec(input.courseSlug, input.lessonSlug, labKey),
    })
  }

  const url = process.env.ACADEMY_LAB_EVALUATOR_URL
  const secret = process.env.ACADEMY_LAB_EVALUATOR_SECRET
  if (!url || !secret) return null
  return requestControlledEvaluation(input, { url, secret })
}
