import { createHash } from 'node:crypto'
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const VALID_TOPICS = new Set([
  'foundations',
  'engineering',
  'data',
  'ai-engineering',
  'ship-it',
  'growth',
])
const VALID_LEVELS = new Set(['Beginner', 'Intermediate', 'Advanced'])
const VALID_LIFECYCLE = new Set([
  'draft',
  'structurally_valid',
  'source_verified',
  'expert_reviewed',
  'lab_verified',
  'pilot_ready',
  'published',
  'stale',
  'deprecated',
])
const VALID_CAPABILITY_STATUSES = new Set([
  'implemented_learner_visible',
  'implemented_partial',
  'planned_only',
  'stale_documentation',
  'externally_blocked',
])
const IDENTITY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,119}$/

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function humanizeSlug(slug) {
  return slug
    .replace(/^career-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function assertIdentity(value, label) {
  assertString(value, label)
  if (!IDENTITY_PATTERN.test(value)) {
    throw new Error(`${label} must be a safe lowercase route identity`)
  }
}

function repositoryPath(root, relativePath, label) {
  assertString(relativePath, label)
  if (path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be repository-relative`)
  }
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, relativePath)
  if (
    resolved === resolvedRoot ||
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(`${label} must stay inside the repository`)
  }
  return resolved
}

function validateCourseConfig(config) {
  if (config?.schemaVersion !== 1 || !Array.isArray(config.courses)) {
    throw new Error(
      'registry config must use schemaVersion 1 and contain a courses array',
    )
  }

  const identities = new Map()
  for (const course of config.courses) {
    assertIdentity(course.slug, 'course.slug')
    assertString(course.title, `${course.slug}.title`)
    if (!VALID_TOPICS.has(course.topic))
      throw new Error(`${course.slug}.topic is invalid`)
    if (!VALID_LEVELS.has(course.level))
      throw new Error(`${course.slug}.level is invalid`)
    if (!VALID_LIFECYCLE.has(course.lifecycleStatus)) {
      throw new Error(`${course.slug}.lifecycleStatus is invalid`)
    }
    if (course.certificationStatus !== 'uncertified') {
      throw new Error(
        `${course.slug}.certificationStatus must remain uncertified until Harness V2`,
      )
    }
    if (
      course.fallbackVisibility &&
      !['hidden', 'public'].includes(course.fallbackVisibility)
    ) {
      throw new Error(`${course.slug}.fallbackVisibility is invalid`)
    }
    if (!Array.isArray(course.aliases))
      throw new Error(`${course.slug}.aliases must be an array`)

    for (const identity of [course.slug, ...course.aliases]) {
      assertIdentity(identity, `${course.slug} identity`)
      if (identities.has(identity)) {
        throw new Error(
          `identity collision for '${identity}' between ${identities.get(identity)} and ${course.slug}`,
        )
      }
      identities.set(identity, course.slug)
    }
  }
}

async function validateCapabilityInventory(inventory, root) {
  if (
    inventory?.schemaVersion !== 1 ||
    !Array.isArray(inventory.capabilities)
  ) {
    throw new Error(
      'capability inventory must use schemaVersion 1 and contain a capabilities array',
    )
  }
  const seen = new Set()
  for (const capability of inventory.capabilities) {
    assertIdentity(capability.id, 'capability.id')
    assertString(capability.label, `${capability.id}.label`)
    assertString(capability.notes, `${capability.id}.notes`)
    if (seen.has(capability.id))
      throw new Error(`duplicate capability id: ${capability.id}`)
    seen.add(capability.id)
    if (!VALID_CAPABILITY_STATUSES.has(capability.status)) {
      throw new Error(
        `capability ${capability.id} has invalid status: ${capability.status}`,
      )
    }
    if (
      !Array.isArray(capability.evidence) ||
      capability.evidence.length === 0
    ) {
      throw new Error(`capability ${capability.id} must include evidence paths`)
    }
    for (const evidencePath of capability.evidence) {
      const resolvedEvidence = repositoryPath(
        root,
        evidencePath,
        `capability ${capability.id} evidence path`,
      )
      if (!(await exists(resolvedEvidence))) {
        throw new Error(
          `capability ${capability.id} has missing evidence path: ${evidencePath}`,
        )
      }
    }
  }
}

function manifestKey(courseSlug, lessonSlug) {
  return `${courseSlug}\u0000${lessonSlug}`
}

async function loadManifestIndex(authoringDir, legacyManifestPath) {
  const entries = (await exists(legacyManifestPath))
    ? await readJson(legacyManifestPath)
    : []
  if (!Array.isArray(entries))
    throw new Error('legacy manifest must be an array')

  const files = await readdir(authoringDir)
  const courseManifestFiles = files.filter(
    (file) =>
      file.endsWith('.manifest.json') &&
      file !== path.basename(legacyManifestPath),
  )
  for (const file of courseManifestFiles.sort()) {
    const courseEntries = await readJson(path.join(authoringDir, file))
    if (!Array.isArray(courseEntries))
      throw new Error(`${file} must contain an array`)
    entries.push(...courseEntries)
  }

  const index = new Map()
  for (const entry of entries) {
    assertIdentity(entry.courseSlug, 'manifest courseSlug')
    assertIdentity(entry.slug, `${entry.courseSlug} manifest slug`)
    const key = manifestKey(entry.courseSlug, entry.slug)
    if (index.has(key)) {
      const previous = index.get(key)
      const comparableFields = ['title', 'moduleTitle', 'moduleSort', 'sort']
      const conflicts = comparableFields.filter(
        (field) => previous[field] !== entry[field],
      )
      if (conflicts.length > 0) {
        throw new Error(
          `conflicting manifest identity: ${entry.courseSlug}/${entry.slug} (${conflicts.join(', ')})`,
        )
      }
      if (!previous.sourceMdPath && entry.sourceMdPath) index.set(key, entry)
      continue
    }
    index.set(key, entry)
  }
  return index
}

function normalizedSourcePath(sourceMdPath, root) {
  if (typeof sourceMdPath !== 'string' || sourceMdPath === '') return null
  const relative = path.relative(root, sourceMdPath)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
    ? relative
    : null
}

export async function buildAcademyRegistry(options = {}) {
  const root = options.root ?? process.cwd()
  const authoringDir =
    options.authoringDir ?? path.join(root, 'data/academy/authoring')
  const evidenceDir =
    options.evidenceDir ?? path.join(root, 'docs/academy/evidence')
  const configPath =
    options.configPath ?? path.join(root, 'data/academy/registry.config.json')
  const capabilityPath =
    options.capabilityPath ??
    path.join(root, 'data/academy/capability-inventory.json')
  const legacyManifestPath =
    options.legacyManifestPath ?? path.join(authoringDir, 'manifest.json')

  const config = await readJson(configPath)
  const capabilityInventory = await readJson(capabilityPath)
  validateCourseConfig(config)
  await validateCapabilityInventory(capabilityInventory, root)

  const files = await readdir(authoringDir)
  const discoveredSlugs = files
    .filter((file) => file.endsWith('.lessons.json'))
    .map((file) => file.slice(0, -'.lessons.json'.length))
    .sort()
  const configuredSlugs = new Set(config.courses.map((course) => course.slug))
  const unregistered = discoveredSlugs.filter(
    (slug) => !configuredSlugs.has(slug),
  )
  if (unregistered.length > 0) {
    throw new Error(`unregistered course bundle: ${unregistered.join(', ')}`)
  }
  const missingBundles = config.courses
    .map((course) => course.slug)
    .filter((slug) => !discoveredSlugs.includes(slug))
  if (missingBundles.length > 0) {
    throw new Error(
      `registered course missing lesson bundle: ${missingBundles.join(', ')}`,
    )
  }

  const manifest = await loadManifestIndex(authoringDir, legacyManifestPath)
  const courses = []

  for (const configured of config.courses) {
    const lessonFile = path.join(
      authoringDir,
      `${configured.slug}.lessons.json`,
    )
    const solutionFile = path.join(
      authoringDir,
      `${configured.slug}.lab_solutions.json`,
    )
    const authored = await readJson(lessonFile)
    if (!authored || Array.isArray(authored) || typeof authored !== 'object') {
      throw new Error(
        `${configured.slug}.lessons.json must contain a lesson map`,
      )
    }
    const solutions = (await exists(solutionFile))
      ? await readJson(solutionFile)
      : {}
    if (
      !solutions ||
      Array.isArray(solutions) ||
      typeof solutions !== 'object'
    ) {
      throw new Error(
        `${configured.slug}.lab_solutions.json must contain a lesson map`,
      )
    }

    const lessonRecords = Object.entries(authored).map(
      ([lessonSlug, blocks], authoredSort) => {
        assertIdentity(lessonSlug, `${configured.slug} lesson slug`)
        if (!Array.isArray(blocks)) {
          throw new Error(
            `${configured.slug}/${lessonSlug} must contain a block array`,
          )
        }
        const metadata = manifest.get(manifestKey(configured.slug, lessonSlug))
        const labBlocks = blocks.filter((block) => block?.type === 'lab').length
        const hasSolution = Object.hasOwn(solutions, lessonSlug)
        return {
          slug: lessonSlug,
          title: metadata?.title ?? humanizeSlug(lessonSlug),
          moduleTitle: metadata?.moduleTitle ?? 'Module 1 · Authored Course',
          moduleSort: Number.isInteger(metadata?.moduleSort)
            ? metadata.moduleSort
            : 0,
          sort: Number.isInteger(metadata?.sort) ? metadata.sort : authoredSort,
          blockCount: blocks.length,
          labBlocks,
          hasLabSolution: hasSolution,
          route: `/academy/learn/${configured.slug}/${lessonSlug}`,
          source: {
            kind: metadata ? 'legacy_manifest' : 'derived_from_authoring',
            repositoryPath: normalizedSourcePath(metadata?.sourceMdPath, root),
          },
        }
      },
    )

    lessonRecords.sort(
      (left, right) =>
        left.moduleSort - right.moduleSort ||
        left.sort - right.sort ||
        left.slug.localeCompare(right.slug),
    )

    const lessonSlugs = new Set(lessonRecords.map((lesson) => lesson.slug))
    const orphanSolutions = Object.keys(solutions)
      .filter((slug) => !lessonSlugs.has(slug))
      .sort()
    const sourceLedgerPath = path.join(
      evidenceDir,
      configured.slug,
      'sources.json',
    )
    const hasSourceLedger = await exists(sourceLedgerPath)
    const labLessons = lessonRecords.filter((lesson) => lesson.labBlocks > 0)
    const blockers = ['certification_harness_v2_pending']
    if (labLessons.length > 0)
      blockers.push('lab_trust_unverified_current_runtime')
    if (!hasSourceLedger) blockers.push('source_ledger_missing')
    if (orphanSolutions.length > 0) blockers.push('orphan_lab_solutions')

    courses.push({
      slug: configured.slug,
      aliases: [...configured.aliases].sort(),
      title: configured.title,
      topic: configured.topic,
      level: configured.level,
      lifecycleStatus: configured.lifecycleStatus,
      fallbackVisibility: configured.fallbackVisibility ?? 'hidden',
      routes: {
        course: `/academy/course/${configured.slug}`,
        learn: `/academy/learn/${configured.slug}`,
      },
      authoring: {
        lessonBundle: path.relative(root, lessonFile),
        solutionBundle: (await exists(solutionFile))
          ? path.relative(root, solutionFile)
          : null,
        legacyManifestLessons: lessonRecords.filter(
          (lesson) => lesson.source.kind === 'legacy_manifest',
        ).length,
        orphanSolutions,
      },
      sources: {
        ledger: hasSourceLedger ? path.relative(root, sourceLedgerPath) : null,
      },
      certification: {
        status: configured.certificationStatus,
        blockers,
      },
      lessons: lessonRecords,
    })
  }

  const allLessons = courses.flatMap((course) => course.lessons)
  const labLessons = allLessons.filter((lesson) => lesson.labBlocks > 0)
  const registryWithoutVersion = {
    schemaVersion: 1,
    authority: {
      courseIdentity: 'data/academy/registry.config.json',
      lessonContent: 'data/academy/authoring/*.lessons.json',
      generatedSnapshot: 'data/academy/registry.json',
      legacyManifest: 'compatibility_only',
      database: 'runtime_projection',
    },
    totals: {
      courses: courses.length,
      lessons: allLessons.length,
      labBlocks: allLessons.reduce((sum, lesson) => sum + lesson.labBlocks, 0),
      solutionEntries: courses.reduce(
        (sum, course) =>
          sum +
          course.lessons.filter((lesson) => lesson.hasLabSolution).length +
          course.authoring.orphanSolutions.length,
        0,
      ),
      labLessonsWithSolutions: labLessons.filter(
        (lesson) => lesson.hasLabSolution,
      ).length,
      labLessonsWithoutSolutions: labLessons.filter(
        (lesson) => !lesson.hasLabSolution,
      ).length,
      sourceLedgers: courses.filter((course) => course.sources.ledger).length,
    },
    capabilities: capabilityInventory.capabilities,
    courses,
  }
  const digest = createHash('sha256')
    .update(JSON.stringify(registryWithoutVersion))
    .digest('hex')
  return { ...registryWithoutVersion, registryVersion: `sha256:${digest}` }
}

export function resolveCourseSlug(registry, requestedSlug) {
  for (const course of registry.courses) {
    if (course.slug === requestedSlug || course.aliases.includes(requestedSlug))
      return course.slug
  }
  return null
}

export function compareRuntimeProjection(
  registry,
  databaseCourses,
  databaseLessons,
) {
  const registryCourses = new Map(
    registry.courses.map((course) => [course.slug, course]),
  )
  const databaseCourseBySlug = new Map(
    databaseCourses.map((course) => [course.slug, course]),
  )
  const unknownDatabaseCourses = [...databaseCourseBySlug.keys()]
    .filter((slug) => !registryCourses.has(slug))
    .sort()
  const missingDatabaseCourses = [...registryCourses.keys()]
    .filter((slug) => !databaseCourseBySlug.has(slug))
    .sort()
  const courseMetadataDrift = []
  for (const [slug, course] of registryCourses) {
    const databaseCourse = databaseCourseBySlug.get(slug)
    if (!databaseCourse) continue
    for (const field of ['title', 'topic', 'level']) {
      if (databaseCourse[field] !== course[field]) {
        courseMetadataDrift.push({
          slug,
          field,
          registry: course[field],
          database: databaseCourse[field],
        })
      }
    }
  }

  const registryLessons = new Map()
  for (const course of registry.courses) {
    for (const lesson of course.lessons) {
      registryLessons.set(manifestKey(course.slug, lesson.slug), {
        courseSlug: course.slug,
        ...lesson,
      })
    }
  }
  const databaseLessonByKey = new Map(
    databaseLessons.map((lesson) => [
      manifestKey(lesson.course_slug, lesson.slug),
      lesson,
    ]),
  )
  const unknownDatabaseLessons = [...databaseLessonByKey.keys()]
    .filter((key) => !registryLessons.has(key))
    .map((key) => key.replace('\u0000', '/'))
    .sort()
  const missingDatabaseLessons = [...registryLessons.keys()]
    .filter((key) => !databaseLessonByKey.has(key))
    .map((key) => key.replace('\u0000', '/'))
    .sort()
  const lessonMetadataDrift = []
  for (const [key, lesson] of registryLessons) {
    const databaseLesson = databaseLessonByKey.get(key)
    if (!databaseLesson) continue
    const comparisons = {
      title: [lesson.title, databaseLesson.title],
      moduleTitle: [lesson.moduleTitle, databaseLesson.module_title],
      moduleSort: [lesson.moduleSort, databaseLesson.module_sort],
      sort: [lesson.sort, databaseLesson.sort],
    }
    for (const [field, [registryValue, databaseValue]] of Object.entries(
      comparisons,
    )) {
      if (databaseValue !== registryValue) {
        lessonMetadataDrift.push({
          key: key.replace('\u0000', '/'),
          field,
          registry: registryValue,
          database: databaseValue,
        })
      }
    }
  }

  const report = {
    schemaVersion: 1,
    registryVersion: registry.registryVersion,
    databaseTotals: {
      courses: databaseCourses.length,
      lessons: databaseLessons.length,
    },
    unknownDatabaseCourses,
    missingDatabaseCourses,
    courseMetadataDrift,
    unknownDatabaseLessons,
    missingDatabaseLessons,
    lessonMetadataDrift,
  }
  return {
    ...report,
    clean: Object.entries(report)
      .filter(([, value]) => Array.isArray(value))
      .every(([, value]) => value.length === 0),
  }
}

export async function assertRegistryCurrent(options = {}) {
  const root = options.root ?? process.cwd()
  const outputPath =
    options.outputPath ?? path.join(root, 'data/academy/registry.json')
  const expected = await buildAcademyRegistry(options)
  const actual = await readJson(outputPath)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      'Academy registry drift detected; run npm run academy:registry:write',
    )
  }
}
