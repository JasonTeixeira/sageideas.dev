import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import {
  loadFlagshipCompetencyGraph,
  validateFlagshipCompetencyGraph,
} from '../../lib/academy/flagship-competency-graph'
import { validateBlocks } from '../../lib/academy/validate-blocks'

const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))

const flagshipFoundationCourses = {
  'programming-fundamentals': 18,
  'career-engineering_judgment_foundation': 16,
  'python-basics': 12,
  'git-the-terminal': 20,
  'data-structures': 20,
  'career-programming_cs_foundations': 20,
} as const

const automationFoundationCourses = [
  'data-structures',
  'career-programming_cs_foundations',
] as const

test('flagship competency graph is a complete, acyclic novice-to-mastery contract', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const result = validateFlagshipCompetencyGraph(graph, registry)

  assert.deepEqual(result.errors, [])
  assert.deepEqual(
    graph.levels.map((level) => level.id),
    ['novice', 'foundation', 'practitioner', 'advanced', 'mastery'],
  )
  assert.equal(graph.phases.at(-1)?.id, 'production-capstone')
  assert(graph.phases.every((phase) => phase.competencyIds.length > 0))
  assert(graph.competencies.every((competency) => competency.evidence.length >= 3))
})

test('mastery requires independent build, debugging, explanation, transfer, and spaced retrieval', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const evidenceTypes = new Set(
    graph.masteryPolicy.requiredEvidence.map((requirement) => requirement.type),
  )

  for (const required of ['build', 'debug', 'explain', 'transfer', 'retrieve'] as const) {
    assert(evidenceTypes.has(required), `missing mastery evidence type: ${required}`)
  }
  assert.deepEqual(graph.masteryPolicy.retrievalScheduleDays, [2, 7, 21, 45])
  assert.equal(graph.masteryPolicy.labEvidenceBeforeTrustedRuntime, 'practice_only')
  assert.match(graph.masteryPolicy.outcomeDisclaimer, /does not guarantee.*percentile/i)
})

test('every flagship course and mapped lesson resolves to the canonical registry', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const result = validateFlagshipCompetencyGraph(graph, registry)

  assert.deepEqual(result.missingCourseSlugs, [])
  assert.deepEqual(result.missingLessonKeys, [])
  assert(result.referencedCourseSlugs.includes('programming-fundamentals'))
  assert(result.referencedCourseSlugs.includes('career-cloud_devops_operations'))
  assert(result.referencedCourseSlugs.includes('career-ai_engineering_rag_eval'))
})

test('automation-foundation competency mappings enumerate every canonical lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'programming-automation')
  assert(competency, 'missing programming-automation competency')

  for (const courseSlug of automationFoundationCourses) {
    const lessons = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
    ) as Record<string, unknown>
    const mapping: { courseSlug: string; lessonSlugs?: string[] } | undefined =
      competency.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)

    assert(mapping, `${courseSlug}: missing competency mapping`)
    assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons), `${courseSlug}: incomplete lesson mapping`)
  }
})

test('broken flagship graphs fail closed on cycles, orphans, and invented mappings', () => {
  const graph = structuredClone(loadFlagshipCompetencyGraph(process.cwd()))
  graph.phases[0].competencyIds = []
  graph.phases[1].prerequisitePhaseIds = ['production-capstone']
  graph.competencies[0].courseMappings = [{ courseSlug: 'invented-course' }]
  graph.competencies[1].courseMappings[0].lessonSlugs = ['invented-lesson']

  const result = validateFlagshipCompetencyGraph(graph, registry)

  assert(result.errors.some((error) => /has no competencies/.test(error)))
  assert(result.errors.some((error) => /dependency cycle/.test(error)))
  assert(result.errors.some((error) => /not assigned to a phase/.test(error)))
  assert.deepEqual(result.missingCourseSlugs, ['invented-course'])
  assert.deepEqual(result.missingLessonKeys, [
    'career-engineering_judgment_foundation/invented-lesson',
  ])
})

test('every flagship foundation course implements its declared learning loop with proof gates', () => {
  for (const [courseSlug, expectedLessons] of Object.entries(flagshipFoundationCourses)) {
    const lessons = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
    ) as Record<string, Array<Record<string, unknown>>>

    assert.equal(Object.keys(lessons).length, expectedLessons, `${courseSlug}: lesson count drift`)
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const key = `${courseSlug}/${lessonSlug}`
      const validation = validateBlocks(blocks)
      assert.equal(
        validation.ok,
        true,
        `${key}: ${validation.ok ? 'valid runtime lesson blocks' : validation.errors.join('; ')}`,
      )
      const contract = blocks.find((block) => block.type === 'sprint-contract')
      assert(contract, `${key}: missing sprint contract`)
      const intensity = contract.intensity as SprintIntensity
      const blockTypes = blocks.map((block) => block.type)

      for (const required of REQUIRED_SECTIONS[intensity]) {
        assert(blockTypes.includes(required), `${key}: missing ${required}`)
      }

      const gate = blocks.find((block) => block.type === 'unlock-gate')
      assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 3, `${key}: weak unlock gate`)
      assert(
        (gate.criteria as string[]).some((criterion) => /test|prove|output|evidence|demonstrate/i.test(criterion)),
        `${key}: unlock gate lacks observable proof`,
      )
    }
  }
})

test('Python Basics fulfills the public 12-lesson promise with production-practical coverage', () => {
  const lessons = JSON.parse(
    readFileSync('data/academy/authoring/python-basics.lessons.json', 'utf8'),
  ) as Record<string, unknown>

  assert.deepEqual(Object.keys(lessons), [
    'your-first-line',
    'variables',
    'logic-conditionals',
    'loops',
    'functions-and-scope',
    'collections',
    'exceptions-validation',
    'files-json',
    'modules-venvs',
    'testing-debugging',
    'http-apis',
    'automation-capstone',
  ])
})

test('every Engineering Judgment lesson produces an executable artifact with a reference implementation', () => {
  const lessons = JSON.parse(
    readFileSync('data/academy/authoring/career-engineering_judgment_foundation.lessons.json', 'utf8'),
  ) as Record<string, Array<Record<string, unknown>>>
  const solutions = JSON.parse(
    readFileSync('data/academy/authoring/career-engineering_judgment_foundation.lab_solutions.json', 'utf8'),
  ) as Record<string, { language?: string; code?: string }>

  for (const [slug, blocks] of Object.entries(lessons)) {
    const lab = blocks.find((block) => block.type === 'lab')
    assert(lab, `${slug}: missing executable lab`)
    assert.equal(typeof lab.starter, 'string', `${slug}: missing lab starter`)
    assert.equal(typeof lab.check, 'string', `${slug}: missing observable lab check`)
    assert.equal(solutions[slug]?.language, lab.language, `${slug}: solution language mismatch`)
    assert((solutions[slug]?.code?.length ?? 0) > 40, `${slug}: missing substantive solution`)
  }
})

test('every automation-foundation lesson produces a practical lab with a reference implementation', () => {
  for (const courseSlug of automationFoundationCourses) {
    const lessons = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
    ) as Record<string, Array<Record<string, unknown>>>
    const solutions = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8'),
    ) as Record<string, { language?: string; code?: string }>

    assert.deepEqual(Object.keys(solutions), Object.keys(lessons), `${courseSlug}: solution coverage drift`)
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const key = `${courseSlug}/${lessonSlug}`
      const lab = blocks.find((block) => block.type === 'lab')
      assert(lab, `${key}: missing practical lab`)
      const starter = lab.starter as string | undefined
      assert((starter?.length ?? 0) > 100 && starter?.includes('#'), `${key}: lab needs novice scaffolding`)
      assert((lab.check as string | undefined)?.trim(), `${key}: missing observable lab check`)
      assert.equal(solutions[lessonSlug]?.language, lab.language, `${key}: solution language mismatch`)
      assert((solutions[lessonSlug]?.code?.length ?? 0) > 40, `${key}: missing substantive solution`)
    }
  }
})

test('every automation-foundation reference implementation satisfies its exact lab check', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-foundation-labs-'))
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()
  let executed = 0

  try {
    for (const courseSlug of automationFoundationCourses) {
      const lessons = JSON.parse(
        readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
      ) as Record<string, Array<Record<string, unknown>>>
      const solutions = JSON.parse(
        readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8'),
      ) as Record<string, { code: string; stdin?: string }>

      for (const [lessonSlug, blocks] of Object.entries(lessons)) {
        const key = `${courseSlug}/${lessonSlug}`
        const lab = blocks.find((block) => block.type === 'lab')
        const solution = solutions[lessonSlug]
        const result = spawnSync('python3', ['-I', '-c', solution.code], {
          cwd: runtimeDir,
          input: solution.stdin ?? '',
          encoding: 'utf8',
          timeout: 10_000,
        })

        assert.equal(result.status, 0, `${key}: reference runtime failed: ${result.stderr}`)
        assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${key}: check drift`)
        executed += 1
      }
    }
  } finally {
    rmSync(runtimeDir, { recursive: true, force: true })
  }

  assert.equal(executed, 40)
})

test('automation-foundation capstones use calibrated evidence gates', () => {
  const capstones = {
    'data-structures': ['capstone-pick-and-implement'],
    'career-programming_cs_foundations': ['integration-mini-project', 'track-1-capstone'],
  } as const

  for (const [courseSlug, lessonSlugs] of Object.entries(capstones)) {
    const lessons = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
    ) as Record<string, Array<Record<string, unknown>>>

    for (const lessonSlug of lessonSlugs) {
      const blocks = lessons[lessonSlug]
      const key = `${courseSlug}/${lessonSlug}`
      const contract = blocks.find((block) => block.type === 'sprint-contract')
      assert.equal(contract?.intensity, 'capstone', `${key}: must declare capstone intensity`)
      const calibrationIndex = blocks.findIndex((block) => block.type === 'calibration')
      const transferIndex = blocks.findIndex((block) => block.type === 'transfer')
      assert(calibrationIndex >= 0, `${key}: missing calibration rubric`)
      assert(calibrationIndex < transferIndex, `${key}: calibration must precede transfer`)
    }
  }
})

test('mastery-loop remediation preserves every pre-existing lab block identity', () => {
  const expectedIndexes: Record<string, Record<string, number>> = {
    'career-engineering_judgment_foundation': {
      '05-tiny-artifact': 9,
      '06-failure-injection': 9,
      '07-tradeoff-decision': 10,
      '08-testa-proof': 9,
      '09-explain-back': 9,
      '10-review-rubric': 9,
      '11-repair-loop': 9,
      '12-spacing-queue': 9,
    },
    'python-basics': {
      'your-first-line': 9,
      variables: 9,
      'logic-conditionals': 9,
      loops: 9,
    },
    'git-the-terminal': Object.fromEntries(
      registry.courses
        .find((course: { slug: string }) => course.slug === 'git-the-terminal')
        .lessons.map((lesson: { slug: string }) => [lesson.slug, 7]),
    ),
    'data-structures': Object.fromEntries(
      registry.courses
        .find((course: { slug: string }) => course.slug === 'data-structures')
        .lessons.map((lesson: { slug: string }) => [lesson.slug, 7]),
    ),
    'career-programming_cs_foundations': {
      'terminal-files': 10,
      'python-functions-inputs-outputs': 10,
      'types-dataclasses': 10,
      'lists-dicts-sets': 9,
      'files-json-csv': 10,
      'errors-validation': 10,
      'testing-basics': 10,
      'complexity-big-o': 11,
      'frequency-maps': 10,
      'stacks-queues': 9,
      'two-pointers-windows': 10,
      'binary-search': 10,
      'heaps-top-k': 11,
      'graphs-bfs-dfs': 10,
      'dynamic-programming-intro': 10,
      'processes-ports-env-vars': 9,
      'http-dns-tls-basics': 10,
      'debugging-loop': 10,
      'integration-mini-project': 10,
      'track-1-capstone': 10,
    },
  }

  for (const [courseSlug, lessonIndexes] of Object.entries(expectedIndexes)) {
    const lessons = JSON.parse(
      readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
    ) as Record<string, Array<Record<string, unknown>>>
    for (const [lessonSlug, expectedIndex] of Object.entries(lessonIndexes)) {
      assert.equal(
        lessons[lessonSlug].findIndex((block) => block.type === 'lab'),
        expectedIndex,
        `${courseSlug}/${lessonSlug}: lab block identity changed`,
      )
    }
  }
})
