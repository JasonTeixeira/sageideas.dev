import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export const HEALTH_TIMEOUT_MS = 2_000

export function createRequestId() {
  return randomUUID()
}

export function publicHealthErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : String(error)
  if (code === 'health_timeout' || code === 'database_timeout') return 'database_timeout'
  if (code === 'configuration_unavailable') return 'configuration_unavailable'
  return 'database_unavailable'
}

async function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('health_timeout')), HEALTH_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function checkPublicReadiness() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { ok: false as const, latencyMs: 0, errorCode: 'configuration_unavailable' }
  const start = Date.now()
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const result = await withTimeout(client.from('contract_templates').select('id', { head: true, count: 'exact' }))
    if (result.error) throw new Error('database_query_failed')
    return { ok: true as const, latencyMs: Date.now() - start, errorCode: null }
  } catch (error) {
    return { ok: false as const, latencyMs: Date.now() - start, errorCode: publicHealthErrorCode(error) }
  }
}
