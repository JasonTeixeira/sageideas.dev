import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'career-databases_data_modeling'
const lessons = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8'),
) as Record<string, { language: string; code: string; stdin?: string }>
const sourcePath = `docs/academy/evidence/${courseSlug}/sources.json`
const sources = existsSync(sourcePath)
  ? JSON.parse(readFileSync(sourcePath, 'utf8')) as Array<Record<string, unknown>>
  : []

test('Databases implements the complete evidence-first mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))

  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, `${key}: missing sprint contract`)
    const intensity = contract.intensity as SprintIntensity
    const blockTypes = blocks.map((block) => String(block.type))

    for (const required of REQUIRED_SECTIONS[intensity]) {
      assert(blockTypes.includes(required), `${key}: missing ${required}`)
    }
    const orderedSections = blockTypes.filter((type) => REQUIRED_SECTIONS[intensity].includes(type))
    assert.deepEqual(
      orderedSections,
      REQUIRED_SECTIONS[intensity],
      `${key}: required mastery-loop sections are out of order`,
    )
    for (const required of ['calibration', 'unlock-gate']) {
      assert(blockTypes.includes(required), `${key}: missing ${required}`)
    }

    const lab = blocks.find((block) => block.type === 'lab')
    const starter = String(lab?.starter ?? '')
    assert.equal(lab?.language, 'sql', `${key}: course labs must remain SQL practice`)
    assert.equal(solutions[lessonSlug].language, lab?.language, `${key}: reference/runtime language drift`)
    assert(String(lab?.summary ?? '').length > 140, `${key}: lab summary is not practical`)
    assert(starter.length > 1_000, `${key}: lab lacks novice scenario scaffolding`)
    assert.match(starter, /TODO/i, `${key}: lab lacks an explicit learner step`)
    assert(String(lab?.check ?? '').trim(), `${key}: missing exact observable contract`)

    const debug = blocks.find((block) => block.type === 'debug')
    assert.match(String(debug?.task ?? ''), /regression/i, `${key}: debug task lacks regression proof`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5, `${key}: weak unlock gate`)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i, `${key}: lab trust is overstated`)
  }
})

test('every Database SQL reference satisfies its exact observable check', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-database-labs-'))
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()
  let executed = 0

  try {
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[lessonSlug]
      const result = spawnSync(
        'sqlite3',
        ['-batch', '-cmd', '.mode list', '-cmd', '.headers on', '-cmd', '.separator " | "', ':memory:'],
        { cwd: runtimeDir, input: solution.code, encoding: 'utf8', timeout: 10_000 },
      )

      assert.equal(result.status, 0, `${lessonSlug}: SQL reference failed: ${result.stderr}`)
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${lessonSlug}: check drift`)
      assert.equal(result.stderr, '', `${lessonSlug}: unexpected stderr`)
      executed += 1
    }
  } finally {
    rmSync(runtimeDir, { recursive: true, force: true })
  }

  assert.equal(executed, 20)
})

test('Databases culminates in two capstones with calibrated transfer evidence', () => {
  for (const lessonSlug of ['integration-mini-project', 'database-capstone']) {
    const blocks = lessons[lessonSlug]
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'capstone')
    const labIndex = blocks.findIndex((block) => block.type === 'lab')
    const debugIndex = blocks.findIndex((block) => block.type === 'debug')
    const calibrationIndex = blocks.findIndex((block) => block.type === 'calibration')
    const transferIndex = blocks.findIndex((block) => block.type === 'transfer')
    assert(labIndex >= 0 && labIndex < debugIndex)
    assert(calibrationIndex >= 0 && calibrationIndex < transferIndex)
  }
})

test('Databases has a unique authoritative source ledger', () => {
  assert(sources.length >= 12)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1, `${source.source_id}: source must be authoritative`)
    assert.match(String(source.url), /^https:\/\//, `${source.source_id}: invalid source URL`)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/, `${source.source_id}: missing retrieval date`)
  }
})

test('the data-modeling competency mapping enumerates every Database lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'data-modeling')
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)

  assert(competency, 'missing data-modeling competency')
  assert(mapping, 'missing Databases course mapping')
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit test gate includes the Database mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /database-mastery\.test\.ts/)
})
