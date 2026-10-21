import registryJson from '@/data/academy/registry.json'
import type { TopicKey } from '@/lib/academy/topics'

export type AcademyRegistryLesson = {
  slug: string
  title: string
  moduleTitle: string
  moduleSort: number
  sort: number
  blockCount: number
  labBlocks: number
  hasLabSolution: boolean
  route: string
}

export type AcademyRegistryCourse = {
  slug: string
  aliases: string[]
  title: string
  topic: TopicKey
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  lifecycleStatus: string
  fallbackVisibility: 'hidden' | 'public'
  routes: { course: string; learn: string }
  certification: { status: 'uncertified'; blockers: string[] }
  lessons: AcademyRegistryLesson[]
}

type AcademyRegistry = {
  schemaVersion: 1
  registryVersion: string
  totals: { courses: number; lessons: number; labBlocks: number }
  courses: AcademyRegistryCourse[]
}

export const academyRegistry = registryJson as AcademyRegistry

const canonicalByIdentity = new Map<string, AcademyRegistryCourse>()
for (const course of academyRegistry.courses) {
  canonicalByIdentity.set(course.slug, course)
  for (const alias of course.aliases) canonicalByIdentity.set(alias, course)
}

export function getAcademyRegistryCourse(
  identity: string,
): AcademyRegistryCourse | null {
  return canonicalByIdentity.get(identity) ?? null
}

export function resolveAcademyCourseSlug(identity: string): string | null {
  return getAcademyRegistryCourse(identity)?.slug ?? null
}

export function getPublicRegistryFallbackCourses(): AcademyRegistryCourse[] {
  return academyRegistry.courses.filter(
    (course) => course.fallbackVisibility === 'public',
  )
}
