import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'career-cloud_devops_operations'
const lessons = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
const sourcePath = `docs/academy/evidence/${courseSlug}/sources.json`
const sources = existsSync(sourcePath) ? JSON.parse(readFileSync(sourcePath, 'utf8')) as Array<Record<string, unknown>> : []

test('Cloud/DevOps implements an ordered, novice-scaffolded mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, `${key}: missing sprint contract`)
    const blockTypes = blocks.map((block) => block.type)
    const requiredSections = REQUIRED_SECTIONS[contract.intensity as SprintIntensity]
    for (const required of requiredSections) assert(blockTypes.includes(required), `${key}: missing ${required}`)
    const indexes = requiredSections.map((required) => blockTypes.indexOf(required))
    assert.deepEqual([...indexes].sort((a, b) => a - b), indexes, `${key}: required loop sections are out of order`)
    for (const required of ['worked-example', 'debug', 'tradeoff', 'calibration', 'unlock-gate']) assert(blockTypes.includes(required), `${key}: missing ${required}`)
    const lab = blocks.find((block) => block.type === 'lab')
    assert.equal(lab?.language, 'python', `${key}: lab runtime must be explicit`)
    assert.equal(solutions[lessonSlug].language, 'python', `${key}: reference/runtime drift`)
    assert(String(lab?.summary ?? '').length > 150, `${key}: lab is not a practical production task`)
    assert(String(lab?.starter ?? '').length > 700, `${key}: insufficient novice scaffolding`)
    assert.match(String(lab?.starter ?? ''), /TODO/i, `${key}: missing explicit learner step`)
    const debug = blocks.find((block) => block.type === 'debug')
    assert.match(String(debug?.task ?? ''), /regression/i, `${key}: debug work lacks retained regression evidence`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5, `${key}: weak unlock gate`)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i, `${key}: trust boundary missing`)
  }
})

test('every Cloud/DevOps reference satisfies its exact observable contract', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-cloud-devops-labs-'))
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

test('Cloud/DevOps pacing culminates in deep operational work and a multi-day capstone', () => {
  for (const blocks of Object.values(lessons)) {
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    if (contract?.intensity === 'standard') assert.match(String(contract.time), /60[–-]90 min/)
    if (contract?.intensity === 'deep') assert.match(String(contract.time), /2[–-]4 hrs/)
  }
  const capstone = lessons['cloud-devops-capstone']
  const contract = capstone.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  assert.match(String(contract?.time), /multi-day/i)
  assert(capstone.findIndex((block) => block.type === 'lab') < capstone.findIndex((block) => block.type === 'debug'))
  assert(capstone.findIndex((block) => block.type === 'calibration') < capstone.findIndex((block) => block.type === 'transfer'))
})

test('Cloud/DevOps has a unique primary and official source ledger', () => {
  assert(existsSync(sourcePath), 'missing Cloud/DevOps source ledger')
  assert(sources.length >= 16)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('the cloud-delivery mapping enumerates every Cloud/DevOps lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'cloud-delivery')
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
  assert(mapping)
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit gate includes the Cloud/DevOps mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /cloud-devops-mastery\.test\.ts/)
})
