/**
 * Ingest the 21-course AI-career curriculum into the academy as a navigable
 * SKELETON — so the whole pipeline (catalog → 21 courses → modules → lessons)
 * is walkable end to end before the full interactive lessons are authored.
 *
 *   tsx scripts/academy/ingest-career-os.ts                           # dry-run (default)
 *   tsx --env-file=.env.local scripts/academy/ingest-career-os.ts --apply
 *
 * SOURCE (READ-ONLY — never modified here):
 *   /Users/Sage/AI_CAREER_OPERATING_SYSTEM/courses/<NN>_<slug>/course_manifest.json
 *   …/<NN>_<slug>/modules/<MM>_<name>/lessons/*.md   (+ optional sibling .json)
 *
 * TARGET (academy DB):
 *   academy_courses  — one row per manifest, slug prefixed with `career-`.
 *   academy_lessons  — one row per lesson .md file (or one placeholder per
 *                      module when a module has no lesson files).
 *
 * Honesty: blocks are a SKELETON of REAL source content — a `context` block
 * carrying the lesson's actual intro/summary (trimmed) plus a `callout` (tone
 * 'note') stating the full interactive lesson is in production. No fabricated
 * pedagogy. Idempotent: upserts on the natural keys
 * (academy_courses.slug, academy_lessons.course_slug+slug).
 *
 * Mirrors scripts/academy/seed-first-steps.ts: createClient from env, default
 * dry-run, --apply flag, idempotent upserts, denormalized lesson counter.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

import type { LessonBlock } from '../../data/academy/sample-course'
import type { TopicKey } from '../../lib/academy/topics'

const shouldApply = process.argv.includes('--apply')

const COURSES_ROOT = '/Users/Sage/AI_CAREER_OPERATING_SYSTEM/courses'
const SLUG_PREFIX = 'career-'
const SUMMARY_MAX = 600
const ACADEMY_REGISTRY = JSON.parse(
  readFileSync(join(process.cwd(), 'data/academy/registry.json'), 'utf8'),
) as {
  courses: Array<{
    slug: string
    aliases: string[]
    lessons: Array<{ slug: string }>
  }>
}
const REGISTRY_BY_IDENTITY = new Map(
  ACADEMY_REGISTRY.courses.flatMap((course) =>
    [course.slug, ...course.aliases].map((id) => [id, course] as const),
  ),
)

// The one course whose first lesson is a free preview.
const FREE_PREVIEW_COURSE_SLUG = 'career-engineering_judgment_foundation'

// Per-course academy topic. Keys are canonical_slug (manifest); values are
// valid TopicKey values from lib/academy/topics.ts. Each course is mapped to
// the closest domain bucket in the disciplined 6-topic palette.
const TOPIC_BY_SLUG: Record<string, TopicKey> = {
  engineering_judgment_foundation: 'foundations',
  concept_maps_real_world_engineering: 'foundations',
  programming_cs_foundations: 'foundations',
  backend_engineering: 'engineering',
  frontend_fullstack: 'engineering',
  databases_data_modeling: 'data',
  cloud_devops_operations: 'ship-it',
  architecture_system_design: 'engineering',
  ai_engineering_rag_eval: 'ai-engineering',
  data_engineering_analytics: 'data',
  security_identity: 'engineering',
  observability_reliability_performance: 'ship-it',
  interview_career_portfolio: 'growth',
  product_execution_market_feedback: 'growth',
  mobile_engineering_deep_dive: 'engineering',
  qa_sdet_test_automation_engineering: 'engineering',
  networking_fundamentals_advanced_networking: 'engineering',
  platform_engineering_internal_developer_platforms: 'ship-it',
  ux_ui_product_design_for_engineers: 'engineering',
  engineering_leadership_staff_execution: 'growth',
  enterprise_it_saas_admin_business_systems: 'ship-it',
}

const DEFAULT_TOPIC: TopicKey = 'engineering'

// Rough hours estimate per lesson, so the denormalized course.hours is honest
// rather than zero. ~25 min skeleton lessons → 12 lessons ≈ 5 h.
const MINUTES_PER_LESSON = 25

type CourseManifest = {
  canonical_slug: string
  canonical_course_number: string
  title: string
  promise?: string
  target_learner?: string
  lesson_count?: number | null
  modules?: string[]
  capstone?: string
}

type LessonSource = {
  /** kebab slug, unique within the course */
  slug: string
  title: string
  summary: string
}

type ModuleSource = {
  /** readable label, e.g. "Module 1 · Mobile Architecture And App Shape" */
  title: string
  moduleSort: number
  lessons: LessonSource[]
}

type CourseRow = {
  slug: string
  title: string
  subtitle: string
  topic: TopicKey
  sort: number
  lessons: number
  modules: ModuleSource[]
}

// ----------------------------------------------------------------- slugify
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** A readable module name from a module dir like "01_mobile_architecture". */
function moduleLabel(moduleDir: string, index: number): string {
  // strip a leading numeric ordinal ("01_", "05_") then title-case the rest.
  const tail = moduleDir.replace(/^\d+[a-z]?_/i, '')
  const words = tail
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  const name = words || `Module ${index + 1}`
  return `Module ${index + 1} · ${name}`
}

// --------------------------------------------------- title + summary extract
const H1_RE = /^#\s+(.+?)\s*$/m
const LESSON_PACK_RE = /^Lesson Pack\s+\d+\s*:\s*/i
const LESSON_PREFIX_RE = /^Lesson\s*:\s*/i
// Summary sections we prefer, in priority order, across the source formats.
const SUMMARY_HEADINGS = [
  'Real-World Scenario',
  'Goal',
  'Overview',
  'Real-World',
  'Capability Built',
]

function cleanTitle(raw: string, fallbackFile: string): string {
  let t = (raw || '').trim()
  t = t.replace(LESSON_PACK_RE, '').replace(LESSON_PREFIX_RE, '').trim()
  if (!t) {
    const base = basename(fallbackFile).replace(/\.md$/i, '')
    t = base
      .replace(/^\d+[_-]/g, '')
      .replace(/_lesson$/i, '')
      .replace(/_/g, ' ')
      .trim()
    t = t.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return t
}

/** First non-empty paragraph under one of the preferred headings, else first prose. */
function extractSummary(md: string): string {
  const lines = md.split('\n')

  for (const heading of SUMMARY_HEADINGS) {
    const idx = lines.findIndex((l) =>
      new RegExp(`^#{1,6}\\s+${heading}\\b`, 'i').test(l.trim()),
    )
    if (idx === -1) continue
    const para = collectParagraph(lines, idx + 1)
    if (para) return trimSummary(para)
  }

  // Fallback: first prose paragraph that is not the H1, an HTML comment, or a heading.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l) continue
    if (l.startsWith('#')) continue
    if (l.startsWith('<!--')) continue
    if (
      /^(Course|Sprint source|Progression phase|Primary external anchor):/i.test(
        l,
      )
    )
      continue
    const para = collectParagraph(lines, i)
    if (para) return trimSummary(para)
  }
  return ''
}

/** Join consecutive non-blank, non-heading lines into one paragraph from `start`. */
function collectParagraph(lines: string[], start: number): string {
  const buf: string[] = []
  for (let i = start; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l) {
      if (buf.length) break
      continue
    }
    if (l.startsWith('#')) {
      if (buf.length) break
      continue
    }
    if (l.startsWith('<!--')) continue
    buf.push(l)
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim()
}

function trimSummary(text: string): string {
  if (text.length <= SUMMARY_MAX) return text
  const cut = text.slice(0, SUMMARY_MAX)
  const lastStop = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('? '),
    cut.lastIndexOf('! '),
  )
  return (
    (lastStop > SUMMARY_MAX * 0.5
      ? cut.slice(0, lastStop + 1)
      : cut.trimEnd()) + ' …'
  )
}

/** Read a sibling `<name>.json` lesson manifest if present (courses 13–19). */
function siblingJsonSummary(mdPath: string): string {
  const jsonPath = mdPath.replace(/\.md$/i, '.json')
  if (!existsSync(jsonPath)) return ''
  try {
    const j = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<
      string,
      unknown
    >
    const parts = [j.outcome, j.context, j.retrieval]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim())
    return trimSummary(parts.join(' '))
  } catch {
    return ''
  }
}

function parseLessonFile(mdPath: string): LessonSource {
  const md = readFileSync(mdPath, 'utf8')
  const h1 = md.match(H1_RE)?.[1] ?? ''
  const title = cleanTitle(h1, mdPath)
  // Prefer the structured sibling JSON outcome; fall back to the md summary.
  const summary = siblingJsonSummary(mdPath) || extractSummary(md)
  return { slug: slugify(title || basename(mdPath)), title, summary }
}

// --------------------------------------------------------- skeleton blocks
function skeletonBlocks(summary: string): LessonBlock[] {
  const blocks: LessonBlock[] = []
  if (summary) {
    blocks.push({ type: 'context', text: summary })
  }
  blocks.push({
    type: 'callout',
    tone: 'note',
    text: 'This is a course skeleton. The summary above is drawn directly from the source curriculum; the full interactive lesson — worked examples, labs, and verification — is in production.',
  })
  return blocks
}

function placeholderBlocks(moduleTitle: string): LessonBlock[] {
  return [
    {
      type: 'context',
      text: `This module (${moduleTitle}) is scaffolded in the source curriculum; its lessons are in production.`,
    },
    {
      type: 'callout',
      tone: 'note',
      text: 'Course skeleton — lessons for this module are in production and will appear here as they are authored.',
    },
  ]
}

// ----------------------------------------------------------- read one course
function readCourse(courseDir: string): CourseRow | null {
  const manifestPath = join(COURSES_ROOT, courseDir, 'course_manifest.json')
  if (!existsSync(manifestPath)) return null
  const manifest = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  ) as CourseManifest

  const canonical = manifest.canonical_slug
  const candidateSlug = `${SLUG_PREFIX}${canonical}`
  const registryCourse = REGISTRY_BY_IDENTITY.get(candidateSlug)
  if (!registryCourse) {
    throw new Error(
      `source course '${candidateSlug}' is not in the canonical Academy registry`,
    )
  }
  const slug = registryCourse.slug
  const topic = TOPIC_BY_SLUG[canonical] ?? DEFAULT_TOPIC
  // Course numbers look like "00", "00A", "01" … "19". Scale by 10 and add a
  // letter offset so an "A"-suffixed course (00A) slots just after its base (00)
  // without colliding on the integer `sort` column: 00→0, 00A→1, 01→10, 19→190.
  const numMatch = manifest.canonical_course_number.match(/^(\d+)([A-Za-z])?/)
  const baseNum = numMatch ? parseInt(numMatch[1], 10) : 0
  const letterOffset = numMatch?.[2]
    ? numMatch[2].toUpperCase().charCodeAt(0) - 64
    : 0
  const sort = baseNum * 10 + letterOffset

  // Discover module directories on disk (authoritative over manifest order).
  const modulesRoot = join(COURSES_ROOT, courseDir, 'modules')
  const moduleDirs = existsSync(modulesRoot)
    ? readdirSync(modulesRoot)
        .filter((d) => statSync(join(modulesRoot, d)).isDirectory())
        .sort()
    : []

  const modules: ModuleSource[] = moduleDirs.map((moduleDir, mIdx) => {
    const lessonsDir = join(modulesRoot, moduleDir, 'lessons')
    const title = moduleLabel(moduleDir, mIdx)

    const lessonFiles = existsSync(lessonsDir)
      ? readdirSync(lessonsDir)
          .filter((f) => f.toLowerCase().endsWith('.md'))
          .sort()
      : []

    if (lessonFiles.length === 0) {
      // Module with no lesson files → one navigable placeholder lesson.
      return {
        title,
        moduleSort: mIdx,
        lessons: [
          {
            slug: slugify(`${moduleDir}-overview`),
            title: title.replace(/^Module \d+ · /, ''),
            summary: '',
          },
        ],
      }
    }

    // De-dupe lesson slugs within the module (defensive against title collisions).
    const seen = new Map<string, number>()
    const lessons = lessonFiles.map((file) => {
      const parsed = parseLessonFile(join(lessonsDir, file))
      let slug = parsed.slug || slugify(file)
      const n = seen.get(slug) ?? 0
      seen.set(slug, n + 1)
      if (n > 0) slug = `${slug}-${n + 1}`
      return { ...parsed, slug }
    })

    return { title, moduleSort: mIdx, lessons }
  })

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)

  // Subtitle = trimmed promise (fall back to target_learner, then title).
  const promise = (
    manifest.promise ||
    manifest.target_learner ||
    manifest.title
  ).trim()
  const subtitle =
    promise.length > 200 ? `${promise.slice(0, 197).trimEnd()}…` : promise

  return {
    slug,
    title: manifest.title,
    subtitle,
    topic,
    sort,
    lessons: manifest.lesson_count ?? totalLessons,
    modules,
  }
}

// ------------------------------------------------------------------- main
async function main(): Promise<void> {
  const courseDirs = readdirSync(COURSES_ROOT)
    .filter((d) => /^\d/.test(d))
    .filter((d) => existsSync(join(COURSES_ROOT, d, 'course_manifest.json')))
    .sort()

  const courses = courseDirs
    .map(readCourse)
    .filter((c): c is CourseRow => c !== null)

  const identityErrors: string[] = []
  for (const course of courses) {
    const registryCourse = REGISTRY_BY_IDENTITY.get(course.slug)
    if (!registryCourse) {
      identityErrors.push(`${course.slug}: missing canonical course identity`)
      continue
    }
    const registeredLessons = new Set(
      registryCourse.lessons.map((lesson) => lesson.slug),
    )
    for (const courseModule of course.modules) {
      for (const lesson of courseModule.lessons) {
        if (!registeredLessons.has(lesson.slug)) {
          identityErrors.push(
            `${course.slug}/${lesson.slug}: source lesson is not registered`,
          )
        }
      }
    }
  }
  if (identityErrors.length > 0) {
    throw new Error(
      `canonical registry mismatch:\n${identityErrors.map((error) => `- ${error}`).join('\n')}`,
    )
  }

  const totalCourses = courses.length
  const totalModules = courses.reduce((s, c) => s + c.modules.length, 0)
  const totalLessonRows = courses.reduce(
    (s, c) => s + c.modules.reduce((m, mod) => m + mod.lessons.length, 0),
    0,
  )

  if (!shouldApply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          totals: {
            courses: totalCourses,
            modules: totalModules,
            lessons: totalLessonRows,
          },
          courses: courses.map((c) => ({
            slug: c.slug,
            title: c.title,
            topic: c.topic,
            sort: c.sort,
            declaredLessons: c.lessons,
            modules: c.modules.map((m) => ({
              title: m.title,
              moduleSort: m.moduleSort,
              lessons: m.lessons.map((l) => ({
                slug: l.slug,
                title: l.title,
                hasSummary: !!l.summary,
              })),
            })),
          })),
        },
        null,
        2,
      ),
    )
    console.log(
      `\nDRY-RUN: would upsert ${totalCourses} courses, ${totalModules} modules, ${totalLessonRows} lessons. Re-run with --apply to write.`,
    )
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (load .env.local).',
    )
    process.exit(1)
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const course of courses) {
    // 1. Upsert the course (idempotent on slug).
    const lessonCount = course.modules.reduce(
      (m, mod) => m + mod.lessons.length,
      0,
    )
    const hours = Math.max(
      1,
      Math.round((lessonCount * MINUTES_PER_LESSON) / 60),
    )
    const { error: courseErr } = await sb.from('academy_courses').upsert(
      {
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        topic: course.topic,
        level: 'Beginner',
        lessons: lessonCount,
        hours,
        sort: course.sort,
        status: 'published',
      },
      { onConflict: 'slug' },
    )
    if (courseErr) throw courseErr

    // 2. Upsert lessons (idempotent on course_slug+slug).
    for (const mod of course.modules) {
      for (let i = 0; i < mod.lessons.length; i++) {
        const lesson = mod.lessons[i]
        const isFirstLessonOfCourse = mod.moduleSort === 0 && i === 0
        const isFreePreview =
          isFirstLessonOfCourse && course.slug === FREE_PREVIEW_COURSE_SLUG
        const blocks = lesson.summary
          ? skeletonBlocks(lesson.summary)
          : placeholderBlocks(mod.title)

        const { error: lessonErr } = await sb.from('academy_lessons').upsert(
          {
            course_slug: course.slug,
            slug: lesson.slug,
            title: lesson.title,
            module_title: mod.title,
            module_sort: mod.moduleSort,
            sort: i,
            status: 'published',
            blocks,
            is_free_preview: isFreePreview,
            eyebrow: `${mod.title} · Lesson ${i + 1}`,
            est_minutes: MINUTES_PER_LESSON,
          },
          { onConflict: 'course_slug,slug' },
        )
        if (lessonErr) throw lessonErr
      }
    }

    // 3. Maintain the denormalized lesson counter from what is actually published.
    const { count } = await sb
      .from('academy_lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_slug', course.slug)
      .eq('status', 'published')
    await sb
      .from('academy_courses')
      .update({ lessons: count ?? 0 })
      .eq('slug', course.slug)

    console.log(
      `upserted ${course.slug} — ${count ?? 0} published lesson(s) across ${course.modules.length} module(s)`,
    )
  }

  console.log(
    `\nIngested ${totalCourses} courses / ${totalModules} modules / ${totalLessonRows} lessons into the academy skeleton.`,
  )
}

main().catch((err) => {
  console.error('ingest failed:', err)
  process.exit(1)
})
