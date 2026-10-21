import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { TopicKey } from '@/lib/academy/topics'
import {
  getAcademyRegistryCourse,
  resolveAcademyCourseSlug,
} from '@/lib/academy/registry'
import type { CourseItem } from '@/data/academy/learn-catalog'
import type {
  Course,
  CourseLesson,
  CourseModule,
  Lesson,
  LessonBlock,
} from '@/data/academy/sample-course'

/** Catalog course cards, from the DB (published only). Empty array → caller falls back to fixtures. */
export async function getCatalogCourses(): Promise<CourseItem[]> {
  try {
    const sb = await createSupabaseServerClient()
    const { data } = await sb
      .from('academy_courses')
      .select('slug, title, subtitle, topic, level, lessons, hours')
      .eq('status', 'published')
      .order('sort')
    if (!data?.length) return []
    return data.flatMap((r) => {
      const registered = getAcademyRegistryCourse(r.slug)
      if (!registered) return []
      return [
        {
          slug: registered.slug,
          title: registered.title,
          topic: registered.topic,
          level: registered.level,
          lessons: r.lessons,
          hours: r.hours,
          subtitle: r.subtitle ?? '',
        },
      ]
    })
  } catch (err) {
    console.error('[academy/content] getCatalogCourses failed', err)
    return []
  }
}

/** A course + its lessons grouped into modules (statuses default to 'todo'; the page overlays progress). */
export async function getCourse(slug: string): Promise<Course | null> {
  try {
    const registered = getAcademyRegistryCourse(slug)
    if (!registered) return null
    const canonicalSlug = registered.slug
    const sb = await createSupabaseServerClient()
    const { data: course } = await sb
      .from('academy_courses')
      .select('slug, title, subtitle, topic')
      .eq('slug', canonicalSlug)
      .eq('status', 'published')
      .maybeSingle()
    if (!course) return null

    const { data: lessons } = await sb
      .from('academy_lessons')
      .select('slug, title, module_title, module_sort, sort')
      .eq('course_slug', canonicalSlug)
      .eq('status', 'published')
      .order('module_sort')
      .order('sort')

    const ls = lessons ?? []
    const order: string[] = []
    const byModule = new Map<string, CourseLesson[]>()
    for (const l of ls) {
      if (!byModule.has(l.module_title)) {
        byModule.set(l.module_title, [])
        order.push(l.module_title)
      }
      byModule
        .get(l.module_title)!
        .push({ slug: l.slug, title: l.title, status: 'todo' })
    }
    const modules: CourseModule[] = order.map((t) => ({
      title: t,
      lessons: byModule.get(t)!,
    }))

    return {
      slug: canonicalSlug,
      title: registered.title,
      subtitle: course.subtitle ?? '',
      topic: registered.topic,
      lessonsTotal: ls.length,
      lessonsDone: 0,
      modules,
    }
  } catch (err) {
    console.error('[academy/content] query failed', err)
    return null
  }
}

/**
 * Ordered lessons (slug + title) for every given course, keyed by course slug,
 * in lesson order. Used by the Content Map. One query covers all courses.
 */
export async function getLessonsByCourse(
  courseSlugs: string[],
): Promise<Record<string, { slug: string; title: string }[]>> {
  if (courseSlugs.length === 0) return {}
  try {
    const canonicalSlugs = [
      ...new Set(
        courseSlugs
          .map(resolveAcademyCourseSlug)
          .filter((slug): slug is string => !!slug),
      ),
    ]
    if (canonicalSlugs.length === 0) return {}
    const sb = await createSupabaseServerClient()
    const { data: lessons } = await sb
      .from('academy_lessons')
      .select('slug, title, course_slug, module_sort, sort')
      .in('course_slug', canonicalSlugs)
      .eq('status', 'published')
      .order('module_sort')
      .order('sort')

    const byCourse: Record<string, { slug: string; title: string }[]> = {}
    for (const l of lessons ?? []) {
      ;(byCourse[l.course_slug] ??= []).push({ slug: l.slug, title: l.title })
    }
    return byCourse
  } catch (err) {
    console.error('[academy/content] getLessonsByCourse failed', err)
    return {}
  }
}

export type OverviewLesson = {
  slug: string
  title: string
  estMinutes: number
  isFreePreview: boolean
}
export type OverviewModule = { title: string; lessons: OverviewLesson[] }

/**
 * The real name of a module, with the redundant "Module N" prefix removed.
 *
 * `academy_lessons.module_title` ships in exactly two shapes:
 *   - named: "Module 3 · Framing & Diagnosis"  -> "Framing & Diagnosis"
 *   - bare:  "Module 3"                        -> null (the module has no name)
 *
 * Every surface that renders a "MODULE NN" kicker beside the name must strip the
 * prefix, or the number reads twice ("MODULE 03 · Module 3 · Framing"). The
 * declared number is safe to drop: it equals the module's position in
 * `module_sort` order for every module in the catalogue (verified 154/154).
 *
 * Returns null — never an empty string or an invented name — when the source
 * carries no real name, so callers omit the element rather than render a blank.
 */
export function moduleName(title: string): string | null {
  const stripped = title.replace(/^\s*module\s*\d+\s*[·:\-–—.]?\s*/i, '').trim()
  return stripped === '' ? null : stripped
}
export type CourseOverview = {
  slug: string
  title: string
  subtitle: string
  topic: TopicKey
  level: string
  hours: number
  lessonsTotal: number
  firstLessonSlug: string | null
  modules: OverviewModule[]
}

/** Full course for the overview/syllabus page. */
// When the DB is unreachable, supabase-js takes ~7s to surface the failure —
// which becomes the whole TTFB of every course page. Cap each attempt and trip
// a short circuit breaker so back-to-back renders skip the wait entirely.
const DB_ATTEMPT_MS = 1200
let dbDeadUntil = 0
async function raced<T>(q: PromiseLike<T>): Promise<T | null> {
  if (Date.now() < dbDeadUntil) return null
  const r = await Promise.race([
    q,
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), DB_ATTEMPT_MS),
    ),
  ])
  if (r === null) dbDeadUntil = Date.now() + 60_000
  return r
}

export async function getCourseOverview(
  slug: string,
): Promise<CourseOverview | null> {
  try {
    const registered = getAcademyRegistryCourse(slug)
    if (!registered) return null
    const canonicalSlug = registered.slug
    const sb = await createSupabaseServerClient()
    const courseRes = await raced(
      sb
        .from('academy_courses')
        .select('slug, title, subtitle, topic, level, hours')
        .eq('slug', canonicalSlug)
        .eq('status', 'published')
        .maybeSingle(),
    )
    const course = courseRes?.data
    if (!course) return null

    const lessonsRes = await raced(
      sb
        .from('academy_lessons')
        .select(
          'slug, title, module_title, module_sort, sort, est_minutes, is_free_preview',
        )
        .eq('course_slug', canonicalSlug)
        .eq('status', 'published')
        .order('module_sort')
        .order('sort'),
    )
    const lessons = lessonsRes?.data

    const ls = lessons ?? []
    const order: string[] = []
    const byModule = new Map<string, OverviewLesson[]>()
    for (const l of ls) {
      if (!byModule.has(l.module_title)) {
        byModule.set(l.module_title, [])
        order.push(l.module_title)
      }
      byModule.get(l.module_title)!.push({
        slug: l.slug,
        title: l.title,
        estMinutes: l.est_minutes,
        isFreePreview: l.is_free_preview,
      })
    }

    return {
      slug: canonicalSlug,
      title: registered.title,
      subtitle: course.subtitle ?? '',
      topic: registered.topic,
      level: registered.level,
      hours: course.hours,
      lessonsTotal: ls.length,
      firstLessonSlug: ls[0]?.slug ?? null,
      modules: order.map((t) => ({ title: t, lessons: byModule.get(t)! })),
    }
  } catch (err) {
    console.error('[academy/content] query failed', err)
    return null
  }
}

/** A single lesson (blocks + computed prev/next within the course). */
export async function getLesson(
  courseSlug: string,
  lessonSlug: string,
): Promise<Lesson | null> {
  try {
    const canonicalCourseSlug = resolveAcademyCourseSlug(courseSlug)
    if (!canonicalCourseSlug) return null
    const sb = await createSupabaseServerClient()
    const { data: lessons } = await sb
      .from('academy_lessons')
      .select(
        'slug, title, eyebrow, est_minutes, blocks, module_sort, sort, is_free_preview',
      )
      .eq('course_slug', canonicalCourseSlug)
      .eq('status', 'published')
      .order('module_sort')
      .order('sort')

    const ls = lessons ?? []
    const idx = ls.findIndex((l) => l.slug === lessonSlug)
    if (idx < 0) return null
    const l = ls[idx]
    const prev = ls[idx - 1]
    const next = ls[idx + 1]

    return {
      slug: l.slug,
      courseSlug: canonicalCourseSlug,
      eyebrow: l.eyebrow ?? '',
      title: l.title,
      estMinutes: l.est_minutes,
      isFreePreview: l.is_free_preview ?? false,
      blocks: (l.blocks ?? []) as LessonBlock[],
      prevSlug: prev?.slug,
      prevLabel: prev?.title,
      nextSlug: next?.slug,
      nextLabel: next?.title,
    }
  } catch (err) {
    console.error('[academy/content] query failed', err)
    return null
  }
}
