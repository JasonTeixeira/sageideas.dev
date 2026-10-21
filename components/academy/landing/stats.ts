import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  getAcademyRegistryCourse,
  getPublicRegistryFallbackCourses,
  resolveAcademyCourseSlug,
} from '@/lib/academy/registry'
import type { TopicKey } from '@/lib/academy/topics'

/**
 * Real academy stats for the marketing Home. Computed live from Supabase so the
 * headline numbers stay fresh: published-course count and total published
 * lessons. NEVER falls back to a fabricated number — if the query fails we fall
 * back to the taxonomy's own track count and a lessons total of 0 (unknown), so
 * the page can only ever under-claim, never over-claim.
 */

export type AcademyCourseCard = {
  slug: string
  title: string
  subtitle: string | null
  topic: TopicKey
  level: string
  lessons: number
}

export type AcademyStats = {
  coursesCount: number
  lessonsCount: number
  courses: AcademyCourseCard[]
}

type CourseRow = {
  slug: string | null
  title: string | null
  subtitle: string | null
  topic: string | null
  level: string | null
  lessons: number | null
  status: string | null
}

// Order courses so the catalog preview leads with the flagship judgment/AI work.
const TOPIC_PRIORITY: Record<TopicKey, number> = {
  foundations: 0,
  'ai-engineering': 1,
  engineering: 2,
  data: 3,
  'ship-it': 4,
  growth: 5,
}

function taxonomyFallback(): AcademyStats {
  // Honest degraded state: only registry courses explicitly approved for the
  // public fallback. Counts and identities come from the canonical snapshot.
  const courses: AcademyCourseCard[] = getPublicRegistryFallbackCourses().map(
    (course) => ({
      slug: course.slug,
      title: course.title,
      subtitle: null,
      topic: course.topic,
      level: course.level,
      lessons: course.lessons.length,
    }),
  )
  const lessonsCount = courses.reduce((sum, course) => sum + course.lessons, 0)
  return { coursesCount: courses.length, lessonsCount, courses }
}

// The catalog query must never hold the page hostage: when the DB is
// unreachable, supabase-js takes ~7s to surface the fetch failure, which was
// the entire TTFB of / and /academy. Cap the attempt and memoize the result
// per server instance so only one request per window pays even the cap.
const DB_ATTEMPT_MS = 1200
const MEMO_MS = 120_000
let memo: { at: number; stats: AcademyStats } | null = null

export async function getAcademyStats(): Promise<AcademyStats> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.stats
  const stats = await fetchStats()
  memo = { at: Date.now(), stats }
  return stats
}

async function fetchStats(): Promise<AcademyStats> {
  try {
    const admin = supabaseAdmin()
    const query = admin
      .from('academy_courses')
      .select('slug, title, subtitle, topic, level, lessons, status')
      .eq('status', 'published')
    const raced = await Promise.race([
      query,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), DB_ATTEMPT_MS),
      ),
    ])
    if (!raced) return taxonomyFallback()
    const { data, error } = raced

    if (error || !data || data.length === 0) return taxonomyFallback()

    const rows = data as CourseRow[]
    const courses: AcademyCourseCard[] = rows
      .filter(
        (r): r is CourseRow & { slug: string; title: string } =>
          !!r.slug && !!r.title && resolveAcademyCourseSlug(r.slug) !== null,
      )
      .map((r) => {
        const registered = getAcademyRegistryCourse(r.slug)!
        return {
          slug: registered.slug,
          title: registered.title,
          subtitle: r.subtitle,
          topic: registered.topic,
          level: registered.level,
          lessons: r.lessons ?? 0,
        }
      })
      .sort((a, b) => {
        const p = TOPIC_PRIORITY[a.topic] - TOPIC_PRIORITY[b.topic]
        return p !== 0 ? p : b.lessons - a.lessons
      })

    const lessonsCount = courses.reduce((sum, c) => sum + c.lessons, 0)
    return { coursesCount: courses.length, lessonsCount, courses }
  } catch {
    return taxonomyFallback()
  }
}
