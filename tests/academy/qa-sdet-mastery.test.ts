import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'

const slug = 'career-qa_sdet_test_automation_engineering'
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

test('QA/SDET implements an ordered risk-to-release mastery loop while preserving all 20 practical labs', () => {
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
    assert.equal(solutions[key].language, 'python')
    assert(String(lab?.title ?? '').length > 20)
    assert(String(lab?.starter ?? '').length > 500)
    assert.match(String(lab?.starter ?? ''), /TODO/i)
    assert.match(String(lab?.starter ?? ''), /practice feedback/i)
    assert(String(lab?.summary ?? '').length > 150)
    assert.match(String(blocks.find((block) => block.type === 'debug')?.task ?? ''), /regression/i)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i)
  }
})

test('every QA/SDET Python reference satisfies its exact observable contract', () => {
  for (const [key, blocks] of Object.entries(lessons)) {
    const solution = solutions[key]
    const result = spawnSync('python3', ['-I', '-c', solution.code], { encoding: 'utf8', input: solution.stdin ?? '', timeout: 10_000 })
    assert.equal(result.status, 0, `${key}: ${result.stderr}`)
    assert.equal(result.stderr, '')
    assert.equal(result.stdout.trimEnd(), String(blocks.find((block) => block.type === 'lab')?.check).trimEnd(), `${key}: output drift`)
  }
})

test('QA/SDET gives browser, nonfunctional, CI, and flake work deep pacing with a multi-day review board', () => {
  for (const key of ['user-visible-behavior-tests', 'auto-waiting-and-flake-reduction', 'visual-regression', 'accessibility-checks', 'performance-smoke-tests', 'security-smoke-checks', 'ci-quality-gates', 'flaky-test-triage']) {
    const contract = lessons[key].find((block) => block.type === 'sprint-contract')
    assert.equal(contract?.intensity, 'deep')
    assert.match(String(contract?.time), /2.*4/i)
  }
  const blocks = lessons['quality-review-board']
  const contract = blocks.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  assert.match(String(contract?.time), /multi-day/i)
  assert(blocks.findIndex((block) => block.type === 'calibration') < blocks.findIndex((block) => block.type === 'transfer'))
})

test('QA/SDET retains honest narration metadata', () => {
  let say = 0
  let audio = 0
  visit(lessons, (item) => {
    if (typeof item.say === 'string') { assert(item.say.trim().length > 20); say++ }
    if (typeof item.audio === 'string') audio++
  })
  assert(say >= 140)
  assert.equal(audio, 0)
})

test('QA/SDET has a unique primary and official source ledger', () => {
  assert(sources.length >= 18)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('QA/SDET lesson sequence remains canonical registry truth', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8')) as { courses: Array<{ slug: string; lessons: Array<{ slug: string }> }> }
  const course = registry.courses.find((candidate) => candidate.slug === slug)
  assert(course)
  assert.deepEqual(course.lessons.map((lesson) => lesson.slug), Object.keys(lessons))
})

test('Academy audit includes the QA/SDET mastery contract', () => {
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts['academy:audit:test'], /qa-sdet-mastery\.test\.ts/)
})
