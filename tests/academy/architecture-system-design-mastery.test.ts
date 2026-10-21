import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'

const slug = 'career-architecture_system_design'
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

test('Architecture and System Design implements the complete ordered mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [key, blocks] of Object.entries(lessons)) {
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, key)
    const types = blocks.map((block) => block.type)
    const required = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    required.forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    assert.deepEqual(required.map((type) => types.indexOf(type)).sort((a, b) => a - b), required.map((type) => types.indexOf(type)))
    ;['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate'].forEach((type) => assert(types.includes(type), `${key}: ${type}`))
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'python')
    assert(String(lab?.title ?? '').length > 20, `${key}: lab title`)
    assert.equal(solutions[key].language, 'python')
    assert(String(lab?.starter ?? '').length > 700, `${key}: novice scaffold`)
    assert.match(String(lab?.starter ?? ''), /TODO/i)
    assert.match(String(lab?.starter ?? ''), /practice feedback/i)
    assert(String(lab?.summary ?? '').length > 150)
    assert.match(String(blocks.find((block) => block.type === 'debug')?.task ?? ''), /regression/i)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i)
  }
})

test('every Architecture Python reference satisfies its exact observable contract', () => {
  let count = 0
  for (const [key, blocks] of Object.entries(lessons)) {
    const solution = solutions[key]
    const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
    assert.equal(result.status, 0, `${key}: ${result.stderr}`)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout.trimEnd(), String(blocks.find((block) => block.type === 'lab')?.check).trimEnd(), `${key}: output drift`)
    count++
  }
  assert.equal(count, 20)
})

test('Architecture gives threat, operability, migration, review, and proof work deep pacing and multi-day capstones', () => {
  for (const key of ['security-privacy-threat-model', 'observability-operability', 'migration-evolution', 'architecture-decision-records', 'design-review-critique', 'architecture-proof-packet']) {
    const contract = lessons[key].find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'deep')
    assert.match(String(contract?.time), /2.*4/i)
  }
  for (const key of ['interview-system-design', 'architecture-capstone']) {
    const blocks = lessons[key]
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'capstone')
    assert.match(String(contract?.time), /multi-day/i)
    assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
  }
})

test('Architecture retains honest narration metadata', () => {
  let say = 0
  let audio = 0
  visit(lessons, (item) => {
    if (typeof item.say === 'string') { assert(item.say.trim().length > 20); say++ }
    if (typeof item.audio === 'string') audio++
  })
  assert(say >= 140)
  assert.equal(audio, 0)
})

test('Architecture has a unique authoritative and primary source ledger', () => {
  assert(sources.length >= 18)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('Architecture lesson sequence remains canonical registry truth', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8')) as { courses: Array<{ slug: string; lessons: Array<{ slug: string }> }> }
  const course = registry.courses.find((candidate) => candidate.slug === slug)
  assert(course)
  assert.deepEqual(course.lessons.map((lesson) => lesson.slug), Object.keys(lessons))
})

test('Academy audit includes the Architecture mastery contract', () => {
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts['academy:audit:test'], /architecture-system-design-mastery\.test\.ts/)
})
