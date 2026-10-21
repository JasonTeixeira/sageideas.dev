import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'prompt-engineering'
const lessons = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
const sourcePath = `docs/academy/evidence/${courseSlug}/sources.json`
const sources = existsSync(sourcePath) ? JSON.parse(readFileSync(sourcePath, 'utf8')) as Array<Record<string, unknown>> : []
function visit(value: unknown, callback: (candidate: Record<string, unknown>) => void) {
  if (Array.isArray(value)) return value.forEach((entry) => visit(entry, callback))
  if (!value || typeof value !== 'object') return
  callback(value as Record<string, unknown>)
  Object.values(value).forEach((entry) => visit(entry, callback))
}

test('Prompt Engineering implements one ordered, novice-scaffolded mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract)
    const types = blocks.map((block) => block.type)
    const required = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    required.forEach((type) => assert(types.includes(type), `${key}: missing ${type}`))
    assert.deepEqual(required.map((type) => types.indexOf(type)).sort((a, b) => a - b), required.map((type) => types.indexOf(type)), `${key}: loop order`)
    for (const type of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) assert(types.includes(type), `${key}: missing ${type}`)
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'js')
    assert.equal(solutions[lessonSlug].language, 'js')
    assert(String(lab?.summary ?? '').length > 150)
    assert(String(lab?.starter ?? '').length > 700)
    assert.match(String(lab?.starter ?? ''), /TODO/i)
    assert.match(String(blocks.find((block) => block.type === 'debug')?.task ?? ''), /regression/i)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i)
  }
})

test('every Prompt Engineering reference satisfies its exact observable contract', () => {
  let executed = 0
  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const lab = blocks.find((block) => block.type === 'lab')
    const solution = solutions[lessonSlug]
    assert(solution, `${lessonSlug}: missing reference`)
    const result = spawnSync('node', ['-e', solution.code], { input: solution.stdin ?? '', encoding: 'utf8', timeout: 10_000 })
    assert.equal(result.status, 0, `${lessonSlug}: ${result.stderr}`)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout.trimEnd(), String(lab?.check).trimEnd(), `${lessonSlug}: exact output drift`)
    executed += 1
  }
  assert.equal(executed, 20)
})

test('Prompt Engineering culminates in a multi-day injection-resistant capstone', () => {
  const blocks = lessons['capstone-injection-resistant-prompt']
  const contract = blocks.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  assert.match(String(contract?.time), /multi-day/i)
  assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
})

test('Prompt Engineering preserves narration text without promising missing media', () => {
  let narrated = 0, audio = 0
  visit(lessons, (candidate) => {
    if (typeof candidate.say === 'string') { assert(candidate.say.trim().length > 20); narrated += 1 }
    if (typeof candidate.audio === 'string') audio += 1
  })
  assert(narrated >= 100)
  assert.equal(audio, 0)
})

test('Prompt Engineering has a unique primary and official source ledger', () => {
  assert(existsSync(sourcePath))
  assert(sources.length >= 16)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) { assert.equal(source.source_tier, 1); assert.match(String(source.url), /^https:\/\//); assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/) }
})

test('the llm-systems mapping enumerates every Prompt Engineering lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const mapping = graph.competencies.find((candidate) => candidate.id === 'llm-systems')?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
  assert(mapping)
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit gate includes the Prompt Engineering mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /prompt-engineering-mastery\.test\.ts/)
})
