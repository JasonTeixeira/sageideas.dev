import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/server'
import type { TrustedLabEvaluation } from './signing'
import { buildTrustedLabPersistence } from './persistence'

export async function persistTrustedLabEvaluation(input: {
  userId: string
  courseSlug: string
  lessonSlug: string
  releaseId: string
  evaluation: TrustedLabEvaluation
}): Promise<boolean> {
  const command = buildTrustedLabPersistence(input)
  if (!command) return false
  const { data, error } = await supabaseAdmin().rpc(command.rpc, command.args)
  if (error) throw new Error(`trusted lab persistence failed: ${error.message}`)
  return data === true
}
