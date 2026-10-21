import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  assertRegistryCurrent,
  buildAcademyRegistry,
  compareRuntimeProjection,
  resolveCourseSlug,
} from '../../scripts/academy/registry/core.mjs'

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'sage-academy-registry-'))
  const authoringDir = path.join(root, 'data/academy/authoring')
  const evidenceDir = path.join(root, 'docs/academy/evidence')
  const configPath = path.join(root, 'data/academy/registry.config.json')
  const capabilityPath = path.join(
    root,
    'data/academy/capability-inventory.json',
  )
  const legacyManifestPath = path.join(authoringDir, 'manifest.json')

  await writeJson(configPath, {
    schemaVersion: 1,
    courses: [
      {
        slug: 'alpha-course',
        title: 'Alpha Course',
        topic: 'foundations',
        level: 'Beginner',
        lifecycleStatus: 'draft',
        certificationStatus: 'uncertified',
        fallbackVisibility: 'public',
        aliases: ['alpha'],
      },
      {
        slug: 'beta-course',
        title: 'Beta Course',
        topic: 'engineering',
        level: 'Intermediate',
        lifecycleStatus: 'draft',
        certificationStatus: 'uncertified',
        aliases: [],
      },
    ],
  })
  await writeJson(capabilityPath, {
    schemaVersion: 1,
    capabilities: [
      {
        id: 'lesson_player',
        label: 'Lesson player',
        status: 'implemented_learner_visible',
        evidence: ['app/academy/learn/[course]/[lesson]/page.tsx'],
        notes: 'Fixture capability.',
      },
    ],
  })
  await writeJson(path.join(authoringDir, 'alpha-course.lessons.json'), {
    intro: [
      { type: 'prose', text: 'Start here.' },
      { type: 'lab', runtime: 'javascript', starter: '', check: 'done' },
    ],
  })
  await writeJson(path.join(authoringDir, 'alpha-course.lab_solutions.json'), {
    intro: { solution: "console.log('done')" },
  })
  await writeJson(path.join(authoringDir, 'beta-course.lessons.json'), {
    foundations: [{ type: 'prose', text: 'Build the foundation.' }],
  })
  await writeJson(legacyManifestPath, [
    {
      courseSlug: 'alpha-course',
      slug: 'intro',
      title: 'Introduction',
      moduleTitle: 'Module 1 · Start',
      moduleSort: 0,
      sort: 0,
      sourceMdPath: '/private/source.md',
    },
  ])
  await writeJson(path.join(evidenceDir, 'alpha-course/sources.json'), [
    { id: 'source-1' },
  ])
  await mkdir(path.join(root, 'app/academy/learn/[course]/[lesson]'), {
    recursive: true,
  })
  await writeFile(
    path.join(root, 'app/academy/learn/[course]/[lesson]/page.tsx'),
    'export default null\n',
  )

  return {
    root,
    authoringDir,
    evidenceDir,
    configPath,
    capabilityPath,
    legacyManifestPath,
  }
}

test('builds one deterministic registry from course identity config and authoring bundles', async () => {
  const paths = await fixture()
  const registry = await buildAcademyRegistry(paths)

  assert.equal(registry.schemaVersion, 1)
  assert.deepEqual(registry.totals, {
    courses: 2,
    lessons: 2,
    labBlocks: 1,
    solutionEntries: 1,
    labLessonsWithSolutions: 1,
    labLessonsWithoutSolutions: 0,
    sourceLedgers: 1,
  })
  assert.equal(registry.courses[0].slug, 'alpha-course')
  assert.equal(
    registry.courses[0].routes.course,
    '/academy/course/alpha-course',
  )
  assert.equal(registry.courses[0].fallbackVisibility, 'public')
  assert.equal(registry.courses[1].fallbackVisibility, 'hidden')
  assert.equal(registry.courses[0].lessons[0].title, 'Introduction')
  assert.equal(registry.courses[0].lessons[0].source.kind, 'legacy_manifest')
  assert.equal(registry.courses[0].certification.status, 'uncertified')
  assert.equal(
    registry.courses[1].lessons[0].source.kind,
    'derived_from_authoring',
  )
  assert.match(registry.registryVersion, /^sha256:[a-f0-9]{64}$/)

  const rebuilt = await buildAcademyRegistry(paths)
  assert.deepEqual(rebuilt, registry)
  assert.equal(resolveCourseSlug(registry, 'alpha'), 'alpha-course')
  assert.equal(resolveCourseSlug(registry, 'beta-course'), 'beta-course')
  assert.equal(resolveCourseSlug(registry, 'missing'), null)
})

test('fails closed when a lesson bundle is not registered', async () => {
  const paths = await fixture()
  await writeJson(path.join(paths.authoringDir, 'orphan.lessons.json'), {
    intro: [{ type: 'prose', text: 'Unregistered.' }],
  })

  await assert.rejects(
    buildAcademyRegistry(paths),
    /unregistered course bundle: orphan/,
  )
})

test('fails closed on canonical slug and alias collisions', async () => {
  const paths = await fixture()
  const config = JSON.parse(await readFile(paths.configPath, 'utf8'))
  config.courses[1].aliases = ['alpha']
  await writeJson(paths.configPath, config)

  await assert.rejects(buildAcademyRegistry(paths), /identity collision.*alpha/)
})

test('rejects route identities and evidence paths that escape repository boundaries', async () => {
  const paths = await fixture()
  const config = JSON.parse(await readFile(paths.configPath, 'utf8'))
  config.courses[0].slug = '../admin'
  await writeJson(paths.configPath, config)
  await assert.rejects(
    buildAcademyRegistry(paths),
    /safe lowercase route identity/,
  )

  const lessonFixture = await fixture()
  const authored = JSON.parse(
    await readFile(
      path.join(lessonFixture.authoringDir, 'alpha-course.lessons.json'),
      'utf8',
    ),
  )
  authored['../escape'] = authored.intro
  await writeJson(
    path.join(lessonFixture.authoringDir, 'alpha-course.lessons.json'),
    authored,
  )
  await assert.rejects(
    buildAcademyRegistry(lessonFixture),
    /lesson slug.*safe lowercase route identity/,
  )

  const evidenceFixture = await fixture()
  const inventory = JSON.parse(
    await readFile(evidenceFixture.capabilityPath, 'utf8'),
  )
  inventory.capabilities[0].evidence = ['../outside-repository']
  await writeJson(evidenceFixture.capabilityPath, inventory)
  await assert.rejects(
    buildAcademyRegistry(evidenceFixture),
    /must stay inside the repository/,
  )
})

test('fails closed when shared and course manifests disagree on lesson identity metadata', async () => {
  const paths = await fixture()
  await writeJson(path.join(paths.authoringDir, 'alpha-course.manifest.json'), [
    {
      courseSlug: 'alpha-course',
      slug: 'intro',
      title: 'Conflicting title',
      moduleTitle: 'Module 1 · Start',
      moduleSort: 0,
      sort: 0,
      sourceMdPath: '',
    },
  ])

  await assert.rejects(
    buildAcademyRegistry(paths),
    /conflicting manifest identity.*title/,
  )
})

test('detects checked-in registry drift', async () => {
  const paths = await fixture()
  const registry = await buildAcademyRegistry(paths)
  const outputPath = path.join(paths.root, 'data/academy/registry.json')
  await writeJson(outputPath, registry)
  await assert.doesNotReject(assertRegistryCurrent({ ...paths, outputPath }))

  const authored = JSON.parse(
    await readFile(
      path.join(paths.authoringDir, 'beta-course.lessons.json'),
      'utf8',
    ),
  )
  authored.transfer = [{ type: 'prose', text: 'A new lesson.' }]
  await writeJson(
    path.join(paths.authoringDir, 'beta-course.lessons.json'),
    authored,
  )

  await assert.rejects(
    assertRegistryCurrent({ ...paths, outputPath }),
    /registry drift/i,
  )
})

test('fails when capability evidence points to a missing repository path', async () => {
  const paths = await fixture()
  const inventory = JSON.parse(await readFile(paths.capabilityPath, 'utf8'))
  inventory.capabilities[0].evidence = ['app/academy/does-not-exist.tsx']
  await writeJson(paths.capabilityPath, inventory)

  await assert.rejects(
    buildAcademyRegistry(paths),
    /capability lesson_player.*missing evidence/i,
  )
})

test('reconciles the runtime projection without allowing database-only identities', async () => {
  const paths = await fixture()
  const registry = await buildAcademyRegistry(paths)
  const databaseCourses = registry.courses.map((course) => ({
    slug: course.slug,
    title: course.title,
    topic: course.topic,
    level: course.level,
    status: 'published',
  }))
  const databaseLessons = registry.courses.flatMap((course) =>
    course.lessons.map((lesson) => ({
      course_slug: course.slug,
      slug: lesson.slug,
      title: lesson.title,
      module_title: lesson.moduleTitle,
      module_sort: lesson.moduleSort,
      sort: lesson.sort,
      status: 'published',
    })),
  )
  assert.equal(
    compareRuntimeProjection(registry, databaseCourses, databaseLessons).clean,
    true,
  )

  databaseCourses.push({
    slug: 'database-only',
    title: 'Database Only',
    topic: 'engineering',
    level: 'Beginner',
    status: 'published',
  })
  databaseLessons.pop()
  databaseLessons[0].title = 'Drifted title'
  const drift = compareRuntimeProjection(
    registry,
    databaseCourses,
    databaseLessons,
  )
  assert.equal(drift.clean, false)
  assert.deepEqual(drift.unknownDatabaseCourses, ['database-only'])
  assert.equal(drift.missingDatabaseLessons.length, 1)
  assert.equal(drift.lessonMetadataDrift[0].field, 'title')
})
