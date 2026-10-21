import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'career-networking_fundamentals_advanced_networking'
const lessons = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'),
) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(
  readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8'),
) as Record<string, { language: string; code: string; stdin?: string }>

test('Networking implements the full mastery loop across all 20 canonical lessons', () => {
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
    assert.equal(lab?.language, 'python', `${key}: lab must use the available deterministic runtime`)
    assert((lab?.summary as string | undefined)?.length ?? 0 > 100, `${key}: lab summary is not practical`)
    assert((starter?.length ?? 0) > 240, `${key}: starter lacks novice scaffolding`)
    assert.match(starter ?? '', /TODO 1:/, `${key}: starter lacks an ordered first step`)
    assert.match(starter ?? '', /TODO 2:/, `${key}: starter lacks an ordered second step`)
    assert.match(starter ?? '', /NotImplementedError/, `${key}: starter must make incomplete work explicit`)
    assert((lab?.check as string | undefined)?.trim(), `${key}: missing exact output contract`)

    const debug = blocks.find((block) => block.type === 'debug')
    assert((debug?.task as string | undefined)?.match(/regression/i), `${key}: debug task lacks regression proof`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 4, `${key}: weak unlock gate`)
  }
})

test('every Networking reference implementation satisfies its exact observable check', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-networking-labs-'))
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

test('Networking culminates in a capstone incident runbook with calibrated transfer evidence', () => {
  const blocks = lessons['network-incident-runbook']
  const contract = blocks.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  const labIndex = blocks.findIndex((block) => block.type === 'lab')
  const debugIndex = blocks.findIndex((block) => block.type === 'debug')
  const calibrationIndex = blocks.findIndex((block) => block.type === 'calibration')
  const transferIndex = blocks.findIndex((block) => block.type === 'transfer')
  assert(labIndex >= 0 && labIndex < debugIndex)
  assert(calibrationIndex >= 0 && calibrationIndex < transferIndex)
})

test('the network-systems competency mapping enumerates every Networking lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  const competency = graph.competencies.find((candidate) => candidate.id === 'network-systems')
  const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)

  assert(competency, 'missing network-systems competency')
  assert(mapping, 'missing Networking course mapping')
  assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons))
})

test('the Academy audit test gate includes the Networking mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /networking-mastery\.test\.ts/)
})
