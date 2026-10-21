import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const slug = 'agents-tool-use'
const lessons = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
const sourcePath = `docs/academy/evidence/${slug}/sources.json`
const sources = existsSync(sourcePath) ? JSON.parse(readFileSync(sourcePath, 'utf8')) as Array<Record<string, unknown>> : []

function visit(value: unknown, fn: (item: Record<string, unknown>) => void) {
  if (Array.isArray(value)) return value.forEach((item) => visit(item, fn))
  if (!value || typeof value !== 'object') return
  fn(value as Record<string, unknown>)
  Object.values(value).forEach((item) => visit(item, fn))
}

test('Agents & Tool Use implements one ordered novice-scaffolded mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [key, blocks] of Object.entries(lessons)) {
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract)
    const types = blocks.map((block) => block.type)
    const required = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    required.forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    assert.deepEqual(required.map((type) => types.indexOf(type)).sort((a, b) => a - b), required.map((type) => types.indexOf(type)))
    ;['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate'].forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'js')
    assert.equal(solutions[key].language, 'js')
    assert(String(lab?.summary ?? '').length > 150)
    assert(String(lab?.starter ?? '').length > 700)
    assert.match(String(lab?.starter ?? ''), /TODO/i)
    assert.match(String(blocks.find((block) => block.type === 'debug')?.task ?? ''), /regression/i)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i)
  }
})

test('every Agents & Tool Use reference satisfies its exact observable contract', () => {
  let count = 0
  for (const [key, blocks] of Object.entries(lessons)) {
    const solution = solutions[key]
    assert(solution, `${key}: missing reference`)
    const result = spawnSync('node', ['-e', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10000 })
    assert.equal(result.status, 0, `${key}: ${result.stderr}`)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout.trimEnd(), String(blocks.find((block) => block.type === 'lab')?.check).trimEnd(), `${key}: output drift`)
    count++
  }
  assert.equal(count, 20)
})

test('Agents & Tool Use culminates in a multi-day bounded guardrailed capstone', () => {
  const blocks = lessons['capstone-bounded-guardrailed-agent']
  const contract = blocks.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  assert.match(String(contract?.time), /multi-day/i)
  assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
})

test('Agents & Tool Use preserves narration text without promising missing media', () => {
  let say = 0
  let audio = 0
  visit(lessons, (item) => {
    if (typeof item.say === 'string') {
      assert(item.say.trim().length > 20)
      say++
    }
    if (typeof item.audio === 'string') audio++
  })
  assert(say >= 100)
  assert.equal(audio, 0)
})

test('Agents & Tool Use has a unique primary and official source ledger', () => {
  assert(existsSync(sourcePath))
  assert(sources.length >= 18)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('agent-automation mapping enumerates every Agents & Tool Use lesson', () => {
  const mapping = loadFlagshipCompetencyGraph(process.cwd()).competencies.find((competency) => competency.id === 'agent-automation')?.courseMappings.find((course) => course.courseSlug === slug)
  assert(mapping)
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('Academy audit includes Agents & Tool Use mastery contract', () => {
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts['academy:audit:test'], /agents-tool-use-mastery\.test\.ts/)
})
