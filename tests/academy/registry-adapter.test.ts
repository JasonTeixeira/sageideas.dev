import assert from 'node:assert/strict'
import test from 'node:test'

import {
  academyRegistry,
  getAcademyRegistryCourse,
  getPublicRegistryFallbackCourses,
  resolveAcademyCourseSlug,
} from '../../lib/academy/registry'

test('application adapter exposes the generated canonical registry', () => {
  assert.equal(academyRegistry.totals.courses, 32)
  assert.equal(academyRegistry.totals.lessons, 640)
  assert.equal(
    resolveAcademyCourseSlug('programming-fundamentals'),
    'programming-fundamentals',
  )
  assert.equal(resolveAcademyCourseSlug('not-a-course'), null)
  assert.equal(getAcademyRegistryCourse('git-the-terminal')?.lessons.length, 20)
  assert.deepEqual(
    getPublicRegistryFallbackCourses().map((course) => course.slug),
    ['career-engineering_judgment_foundation', 'programming-fundamentals'],
  )
})
