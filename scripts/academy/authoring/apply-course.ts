/**
 * apply-course — the "apply" half of the academy authoring engine.
 *
 * Takes authored lesson blocks (JSON) for one course and upserts them to the live
 * academy_lessons table, behind a strict runtime validator so a malformed block can
 * never reach the player. Fail-closed: if ANY lesson's blocks fail validation,
 * nothing is written.
 *
 *   # dry-run (default — no DB writes), reports what WOULD upsert:
 *   npx tsx --env-file=.env.local scripts/academy/authoring/apply-course.ts <course_slug>
 *
 *   # actually upsert:
 *   npx tsx --env-file=.env.local scripts/academy/authoring/apply-course.ts <course_slug> --apply
 *
 *   # validator smoke test (no DB, no env needed):
 *   npx tsx scripts/academy/authoring/apply-course.ts --self-test
 *
 * Input file: data/academy/authoring/<course_slug>.lessons.json
 *   — a map { "<lesson-slug>": LessonBlock[] }.
 *
 * Upsert metadata (course/slug/title/module/sort) comes from the generated
 * data/academy/registry.json — NEVER from the lesson JSON or the compatibility-only
 * legacy manifest. A lesson slug that is not in the registry is an ERROR (prevents
 * creating stray rows). Slugs and sorts are preserved exactly. Idempotent: upsert
 * on (course_slug, slug).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { LessonBlock } from '@/data/academy/sample-course'
import {
  validateBlocks,
  countVisualBlocks,
} from '@/lib/academy/validate-blocks'

const VISUAL_FLOOR = 3

type ManifestEntry = {
  courseSlug: string
  slug: string
  title: string
  moduleTitle: string
  moduleSort: number
  sort: number
}

type RegistryCourse = {
  slug: string
  aliases: string[]
  lessons: Array<{
    slug: string
    title: string
    moduleTitle: string
    moduleSort: number
    sort: number
  }>
}

type AcademyRegistry = { courses: RegistryCourse[] }

const ROOT = process.cwd()
const REGISTRY_PATH = path.join(ROOT, 'data/academy/registry.json')

function lessonsJsonPath(courseSlug: string): string {
  return path.join(ROOT, 'data/academy/authoring', `${courseSlug}.lessons.json`)
}

function readJson<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as T
}

function loadRegistryCourse(identity: string): RegistryCourse | null {
  const registry = readJson<AcademyRegistry>(REGISTRY_PATH)
  const course = registry.courses.find(
    (candidate) =>
      candidate.slug === identity || candidate.aliases.includes(identity),
  )
  return course ?? null
}

// ── self-test (no DB) ─────────────────────────────────────────────────────────

/**
 * Hand-constructed valid + invalid blocks. Proves the validator accepts a
 * well-formed block and pinpoints a missing required field — without touching the
 * DB or needing env vars.
 */
function runSelfTest(): never {
  const validBlocks: unknown[] = [
    { type: 'prose', text: 'Hello world.' },
    {
      type: 'diagram',
      title: 'Two-node flow',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [{ from: 'a', to: 'b', label: 'goes to' }],
    },
    {
      type: 'quiz',
      question: 'Pick one',
      options: ['no', 'yes'],
      answer: 1,
    },
  ]

  // Invalid: a diagram whose second edge is missing 'to'.
  const invalidBlocks: unknown[] = [
    { type: 'prose', text: 'ok' },
    {
      type: 'diagram',
      title: 'Broken',
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b' }, // <-- missing 'to'
      ],
    },
  ]

  const good = validateBlocks(validBlocks)
  const bad = validateBlocks(invalidBlocks)

  const goodPass = good.ok === true
  const badPass =
    bad.ok === false &&
    bad.errors.some((e) => e.includes("edge 1 missing 'to'"))

  console.log('— validate-blocks self-test —')
  console.log(
    `valid blocks  → ok=${good.ok} (expected true)  ${goodPass ? 'PASS' : 'FAIL'}`,
  )
  if (!good.ok) console.log('  unexpected errors:', good.errors)
  console.log(
    `invalid block → ok=${bad.ok} (expected false) ${badPass ? 'PASS' : 'FAIL'}`,
  )
  if (!bad.ok) console.log('  caught:', bad.errors)

  const allPass = goodPass && badPass
  console.log(
    allPass
      ? '\nSELF-TEST PASS — validator catches a missing required field.'
      : '\nSELF-TEST FAIL',
  )
  process.exit(allPass ? 0 : 1)
}

// ── main ──────────────────────────────────────────────────────────────────────

type LessonPlan = {
  slug: string
  entry: ManifestEntry
  blocks: LessonBlock[]
  visualCount: number
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.includes('--self-test')) {
    runSelfTest()
  }

  const shouldApply = args.includes('--apply')
  const requestedCourseSlug = args.find((a) => !a.startsWith('--'))

  if (!requestedCourseSlug) {
    console.error(
      'Usage: tsx --env-file=.env.local scripts/academy/authoring/apply-course.ts <course_slug> [--apply]',
    )
    console.error(
      '       tsx scripts/academy/authoring/apply-course.ts --self-test',
    )
    process.exit(1)
  }

  // 1. Load canonical registry → index by lesson slug for THIS course.
  const registryCourse = loadRegistryCourse(requestedCourseSlug)
  if (!registryCourse) {
    console.error(
      `No canonical registry entries found for course '${requestedCourseSlug}'. Check the slug.`,
    )
    process.exit(1)
  }
  const courseSlug = registryCourse.slug
  const manifest: ManifestEntry[] = registryCourse.lessons.map((lesson) => ({
    courseSlug,
    ...lesson,
  }))
  const manifestBySlug = new Map<string, ManifestEntry>()
  for (const e of manifest) {
    if (e.courseSlug === courseSlug) manifestBySlug.set(e.slug, e)
  }

  // 2. Load authored lessons JSON: { "<lesson-slug>": LessonBlock[] }.
  const jsonPath = lessonsJsonPath(courseSlug)
  let authored: Record<string, unknown>
  try {
    authored = readJson<Record<string, unknown>>(jsonPath)
  } catch (err) {
    console.error(
      `Could not read ${jsonPath}: ${err instanceof Error ? err.message : String(err)}`,
    )
    process.exit(1)
  }
  if (
    typeof authored !== 'object' ||
    authored === null ||
    Array.isArray(authored)
  ) {
    console.error(
      `${jsonPath} must be a JSON object mapping lesson-slug → LessonBlock[].`,
    )
    process.exit(1)
  }

  const slugs = Object.keys(authored)
  if (slugs.length === 0) {
    console.error(`${jsonPath} contains no lessons.`)
    process.exit(1)
  }

  // 3. Validate every lesson. Collect ALL problems before deciding to write.
  const fatalErrors: string[] = []
  const warnings: string[] = []
  const plans: LessonPlan[] = []

  for (const slug of slugs) {
    const entry = manifestBySlug.get(slug)
    if (!entry) {
      fatalErrors.push(
        `lesson '${slug}': not in canonical registry for course '${courseSlug}' — refusing to create a stray row`,
      )
      continue
    }

    const result = validateBlocks(authored[slug])
    if (!result.ok) {
      for (const e of result.errors) fatalErrors.push(`lesson '${slug}': ${e}`)
      continue
    }

    const visualCount = countVisualBlocks(result.blocks)
    if (visualCount < VISUAL_FLOOR) {
      warnings.push(
        `lesson '${slug}': only ${visualCount} visual block(s) (< ${VISUAL_FLOOR} floor)`,
      )
    }

    plans.push({ slug, entry, blocks: result.blocks, visualCount })
  }

  // 4. Fail closed: any validation/manifest error → print all, write nothing.
  if (fatalErrors.length > 0) {
    console.error(
      `\nVALIDATION FAILED (${fatalErrors.length} error(s)) — NOTHING was written:\n`,
    )
    for (const e of fatalErrors) console.error(`  ✗ ${e}`)
    if (warnings.length > 0) {
      console.error(`\nWarnings (non-blocking):`)
      for (const w of warnings) console.error(`  ! ${w}`)
    }
    process.exit(1)
  }

  // 5. DRY RUN (default): report what would upsert.
  if (!shouldApply) {
    console.log(
      `DRY RUN — course '${courseSlug}' (${plans.length} lesson(s)). No DB writes.\n`,
    )
    for (const p of plans) {
      console.log(
        `  • ${p.slug.padEnd(40)} blocks=${String(p.blocks.length).padStart(3)}  visual=${String(
          p.visualCount,
        ).padStart(
          2,
        )}  module="${p.entry.moduleTitle}" sort=${p.entry.moduleSort}/${p.entry.sort}  validation=OK`,
      )
    }
    if (warnings.length > 0) {
      console.log(`\n  Warnings (non-blocking — visual-first floor):`)
      for (const w of warnings) console.log(`    ! ${w}`)
    }
    const totalBlocks = plans.reduce((n, p) => n + p.blocks.length, 0)
    console.log(
      `\nSummary: ${plans.length} lesson(s) would upsert · ${totalBlocks} total blocks · 0 validation failures`,
    )
    console.log(`Re-run with --apply to write.`)
    process.exit(0)
  }

  // 6. APPLY: upsert each validated lesson. Metadata strictly from the manifest.
  void applyAll(courseSlug, plans, warnings)
}

async function applyAll(
  courseSlug: string,
  plans: LessonPlan[],
  warnings: string[],
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (load .env.local with --env-file).',
    )
    process.exit(1)
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let applied = 0
  let totalBlocks = 0
  for (const p of plans) {
    const { error } = await sb.from('academy_lessons').upsert(
      {
        course_slug: p.entry.courseSlug,
        slug: p.entry.slug,
        title: p.entry.title,
        // De-dup the ingest artifact "Module N · Module N" -> "Module N"
        // (source manifests carry no descriptive module name).
        module_title: p.entry.moduleTitle.replace(/^(Module \d+) · \1$/, '$1'),
        module_sort: p.entry.moduleSort,
        sort: p.entry.sort,
        status: 'published',
        blocks: p.blocks,
        is_free_preview: p.entry.sort === 0 && p.entry.moduleSort === 0,
      },
      { onConflict: 'course_slug,slug' },
    )
    if (error) {
      console.error(`\nUpsert FAILED on lesson '${p.slug}': ${error.message}`)
      console.error(`Applied ${applied} lesson(s) before the failure.`)
      process.exit(1)
    }
    applied += 1
    totalBlocks += p.blocks.length
  }

  console.log(
    `APPLIED — course '${courseSlug}': upserted ${applied} lesson(s), ${totalBlocks} total blocks.`,
  )
  if (warnings.length > 0) {
    console.log(`Warnings (non-blocking — visual-first floor):`)
    for (const w of warnings) console.log(`  ! ${w}`)
  }
  console.log(
    `Summary: ${applied} applied · ${totalBlocks} blocks · 0 validation failures`,
  )
  process.exit(0)
}

main()
