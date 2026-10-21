/**
 * Read-only reconciliation of the canonical Academy registry against Supabase.
 * This script never writes. It exits non-zero on identity or metadata drift.
 */
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

import { compareRuntimeProjection } from './core.mjs'

async function readAll(queryFactory) {
  const rows = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(
      from,
      from + pageSize - 1,
    )
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }
  const registry = JSON.parse(
    await readFile('data/academy/registry.json', 'utf8'),
  )
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const courses = await readAll(() =>
    client
      .from('academy_courses')
      .select('slug,title,topic,level,status')
      .order('slug'),
  )
  const lessons = await readAll(() =>
    client
      .from('academy_lessons')
      .select('course_slug,slug,title,module_title,module_sort,sort,status')
      .order('course_slug')
      .order('module_sort')
      .order('sort'),
  )
  const report = compareRuntimeProjection(registry, courses, lessons)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.clean ? 0 : 2)
}

main().catch((error) => {
  const detail =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && typeof error.message === 'string'
        ? error.message
        : JSON.stringify(error)
  console.error(`Academy runtime reconciliation unavailable: ${detail}`)
  process.exit(1)
})
