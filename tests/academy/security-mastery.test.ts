import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'career-security_identity'
const lessons = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8'),
) as Record<string, { language: string; code: string; stdin?: string }>
const sources = JSON.parse(
  readFileSync(`docs/academy/evidence/${courseSlug}/sources.json`, 'utf8'),
) as Array<Record<string, unknown>>

test('Security implements the complete evidence-first mastery loop in all 20 lessons', () => {
  assert.equal(Object.keys(lessons).length, 20)
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))

  for (const [lessonSlug, blocks] of Object.entries(lessons)) {
    const key = `${courseSlug}/${lessonSlug}`
    const contract = blocks.find((block) => block.type === 'sprint-contract')
    assert(contract, `${key}: missing sprint contract`)
    const intensity = contract.intensity as SprintIntensity
    const blockTypes = blocks.map((block) => block.type)

    for (const required of REQUIRED_SECTIONS[intensity]) {
      assert(blockTypes.includes(required), `${key}: missing ${required}`)
    }
    for (const required of ['calibration', 'unlock-gate']) {
      assert(blockTypes.includes(required), `${key}: missing ${required}`)
    }

    const lab = blocks.find((block) => block.type === 'lab')
    const starter = lab?.starter as string | undefined
    assert.equal(lab?.language, 'python', `${key}: lab must use the deterministic local runtime`)
    assert((lab?.summary as string | undefined)?.length ?? 0 > 120, `${key}: lab is not practical`)
    assert((starter?.length ?? 0) > 220, `${key}: starter lacks novice scaffolding`)
    assert.match(starter ?? '', /TODO 1:/, `${key}: missing ordered first step`)
    assert.match(starter ?? '', /TODO 2:/, `${key}: missing ordered second step`)
    assert.match(starter ?? '', /NotImplementedError/, `${key}: incomplete work must be explicit`)
    assert((lab?.check as string | undefined)?.trim(), `${key}: missing exact observable contract`)

    const debug = blocks.find((block) => block.type === 'debug')
    assert.match(String(debug?.task ?? ''), /regression/i, `${key}: debug task lacks regression proof`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5, `${key}: weak unlock gate`)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i, `${key}: lab trust is overstated`)
  }
})

test('every Security reference implementation satisfies its exact observable check', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-security-labs-'))
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()
  let executed = 0

  try {
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[lessonSlug]
      const result = spawnSync('python3', ['-I', '-c', solution.code], {
        cwd: runtimeDir,
        input: solution.stdin ?? '',
        encoding: 'utf8',
        timeout: 10_000,
      })

      assert.equal(result.status, 0, `${lessonSlug}: reference failed: ${result.stderr}`)
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${lessonSlug}: check drift`)
      assert.equal(result.stderr, '', `${lessonSlug}: unexpected stderr`)
      executed += 1
    }
  } finally {
    rmSync(runtimeDir, { recursive: true, force: true })
  }

  assert.equal(executed, 20)
})

test('Security culminates in a capstone defense with calibrated transfer evidence', () => {
  const blocks = lessons['security-capstone']
  const contract = blocks.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  const labIndex = blocks.findIndex((block) => block.type === 'lab')
  const debugIndex = blocks.findIndex((block) => block.type === 'debug')
  const calibrationIndex = blocks.findIndex((block) => block.type === 'calibration')
  const transferIndex = blocks.findIndex((block) => block.type === 'transfer')
  assert(labIndex >= 0 && labIndex < debugIndex)
  assert(calibrationIndex >= 0 && calibrationIndex < transferIndex)
})

test('Security retains a unique, authoritative source ledger', () => {
  assert(sources.length >= 20)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1, `${source.source_id}: source must remain authoritative`)
    assert.match(String(source.url), /^https:\/\//, `${source.source_id}: invalid source URL`)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/, `${source.source_id}: missing retrieval date`)
  }
})

test('the security-identity competency mapping enumerates every Security lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'security-identity')
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)

  assert(competency, 'missing security-identity competency')
  assert(mapping, 'missing Security course mapping')
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit test gate includes the Security mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /security-mastery\.test\.ts/)
})
