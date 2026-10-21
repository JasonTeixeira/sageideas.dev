import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'career-backend_engineering'
const lessons = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
const sources = JSON.parse(readFileSync(`docs/academy/evidence/${courseSlug}/sources.json`, 'utf8')) as Array<Record<string, unknown>>

test('Backend implements the complete evidence-first mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, `${key}: missing sprint contract`)
    const blockTypes = blocks.map((block) => block.type)
    const requiredSections = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    for (const required of requiredSections) assert(blockTypes.includes(required), `${key}: missing ${required}`)
    const requiredIndexes = requiredSections.map((required) => blockTypes.indexOf(required))
    assert.deepEqual([...requiredIndexes].sort((a, b) => a - b), requiredIndexes, `${key}: required loop sections are out of order`)
    for (const required of ['calibration', 'unlock-gate']) assert(blockTypes.includes(required), `${key}: missing ${required}`)
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'python', `${key}: runtime must be explicit`)
    assert.equal(solutions[lessonSlug].language, 'python', `${key}: reference/runtime drift`)
    assert(String(lab?.summary ?? '').length > 120, `${key}: lab is not practical`)
    assert(String(lab?.starter ?? '').length > 1_000, `${key}: insufficient novice scaffolding`)
    assert.match(String(lab?.starter ?? ''), /TODO/i, `${key}: missing explicit learner step`)
    const debug = blocks.find((block) => block.type === 'debug')
    assert.match(String(debug?.task ?? ''), /regression/i, `${key}: debug task lacks regression proof`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5, `${key}: weak unlock gate`)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i, `${key}: trust boundary missing`)
  }
})

test('every Backend reference satisfies its exact observable contract', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-backend-labs-'))
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()
  let executed = 0
  try {
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[lessonSlug]
      const result = spawnSync('python3', ['-I', '-c', solution.code], { cwd: runtimeDir, input: solution.stdin ?? '', encoding: 'utf8', timeout: 10_000 })
      assert.equal(result.status, 0, `${lessonSlug}: reference failed: ${result.stderr}`)
      assert.equal(result.stderr, '', `${lessonSlug}: unexpected stderr`)
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${lessonSlug}: exact output drift`)
      executed += 1
    }
  } finally { rmSync(runtimeDir, { recursive: true, force: true }) }
  assert.equal(executed, 20)
})

test('Backend culminates in two calibrated production slices', () => {
  for (const lessonSlug of ['backend-integration-mini-project', 'backend-capstone']) {
    const blocks = lessons[lessonSlug]
    assert.equal(blocks.find((block) => block.type === 'sprint-contract')?.intensity, 'capstone')
    assert(blocks.findIndex((block) => block.type === 'lab') < blocks.findIndex((block) => block.type === 'debug'))
    assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
  }
})

test('Backend retains a unique authoritative source ledger', () => {
  assert(sources.length >= 12)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('the backend-distributed-systems mapping enumerates every Backend lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'backend-distributed-systems')
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
  assert(mapping)
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit gate includes the Backend mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /backend-mastery\.test\.ts/)
})
