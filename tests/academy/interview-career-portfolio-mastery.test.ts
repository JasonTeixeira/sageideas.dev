import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'

const slug = 'career-interview_career_portfolio'
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

test('Interview/Career/Portfolio implements an ordered novice-to-offer mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [key, blocks] of Object.entries(lessons)) {
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, key)
    const types = blocks.map((block) => block.type)
    const required = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    required.forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    assert.deepEqual(required.map((type) => types.indexOf(type)).sort((a, b) => a - b), required.map((type) => types.indexOf(type)))
    ;['worked-example', 'lab', 'debug', 'tradeoff', 'calibration', 'unlock-gate'].forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'python')
    assert.equal(solutions[key].language, 'python')
    assert(String(lab?.starter ?? '').length > 700)
    assert.match(String(lab?.starter ?? ''), /TODO/i)
    assert.match(String(lab?.starter ?? ''), /practice feedback/i)
    assert(String(lab?.summary ?? '').length > 180)
    assert.match(String(blocks.find((block) => block.type === 'debug')?.task ?? ''), /regression/i)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i)
  }
})

test('every Interview/Career/Portfolio Python reference satisfies its exact observable contract', () => {
  for (const [key, blocks] of Object.entries(lessons)) {
    const solution = solutions[key]
    const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
    assert.equal(result.status, 0, `${key}: ${result.stderr}`)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout.trimEnd(), String(blocks.find((block) => block.type === 'lab')?.check).trimEnd(), `${key}: output drift`)
  }
})

test('Interview/Career/Portfolio assigns realistic deep practice and two multi-day capstones', () => {
  for (const key of ['project-case-studies', 'system-design-interview', 'coding-interview-loop', 'debugging-interview', 'architecture-tradeoffs', 'ai-tooling-interview', 'cloud-data-interview', 'take-home-execution', 'offer-negotiation', 'feedback-retro']) {
    const contract = lessons[key].find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'deep', key)
    assert.match(String(contract?.time), /90.*120/i)
  }
  for (const key of ['application-pipeline', 'career-capstone']) {
    const blocks = lessons[key]
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'capstone', key)
    assert.match(String(contract?.time), /multi-day/i)
    assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
  }
})

test('Interview/Career/Portfolio retains honest narration metadata', () => {
  let say = 0
  let audio = 0
  visit(lessons, (item) => {
    if (typeof item.say === 'string') { assert(item.say.trim().length > 20); say++ }
    if (typeof item.audio === 'string') audio++
  })
  assert(say >= 150)
  assert.equal(audio, 0)
})

test('Interview/Career/Portfolio has a unique authoritative source ledger', () => {
  assert(sources.length >= 18)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('Interview/Career/Portfolio preserves one coherent proof packet across the course', () => {
  const text = JSON.stringify(lessons).toLowerCase()
  for (const pattern of [/target role/, /artifact/, /quantif/, /star/, /objection/, /rejected/, /verification/, /repair/, /offer/]) assert.match(text, pattern)
})

test('Interview/Career/Portfolio lesson sequence remains canonical registry truth', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8')) as { courses: Array<{ slug: string; lessons: Array<{ slug: string }> }> }
  const course = registry.courses.find((candidate) => candidate.slug === slug)
  assert(course)
  assert.deepEqual(course.lessons.map((lesson) => lesson.slug), Object.keys(lessons))
})

test('Academy audit includes Interview/Career/Portfolio mastery contract', () => {
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts['academy:audit:test'], /interview-career-portfolio-mastery\.test\.ts/)
})
