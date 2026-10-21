import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { REQUIRED_SECTIONS, type SprintIntensity } from '../../lib/academy/engine'
import { loadFlagshipCompetencyGraph } from '../../lib/academy/flagship-competency-graph'

const courseSlug = 'system-design'
const lessons = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
const solutions = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
const sourcePath = `docs/academy/evidence/${courseSlug}/sources.json`
const mediaPath = `docs/academy/evidence/${courseSlug}/media-integrity.json`

type MediaAsset = { lessonSlug: string; url: string; transcript: string; httpStatus: number | null; contentType: string; error?: string | null }
type MediaEvidence = { status: string; assets: MediaAsset[] }

const visit = (value: unknown, lessonSlug: string, assets: Array<Pick<MediaAsset, 'lessonSlug' | 'url' | 'transcript'>>): void => {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, lessonSlug, assets)
    return
  }
  if (!value || typeof value !== 'object') return
  const row = value as Record<string, unknown>
  if (typeof row.audio === 'string') assets.push({ lessonSlug, url: row.audio, transcript: String(row.say ?? '') })
  for (const child of Object.values(row)) visit(child, lessonSlug, assets)
}

test('System Design implements the complete calibrated mastery loop in all 24 lessons', () => {
  assert.equal(Object.keys(lessons).length, 24)
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
    assert.equal(lab?.language, 'js', `${key}: runtime must be explicit`)
    assert.equal(solutions[lessonSlug].language, 'js', `${key}: reference/runtime drift`)
    assert(String(lab?.summary ?? '').length > 150, `${key}: lab is not practical`)
    assert(String(lab?.starter ?? '').length > 400, `${key}: insufficient novice scaffolding`)
    assert.match(String(lab?.starter ?? ''), /\/\*[^]*?\*\//, `${key}: missing explicit learner step`)
    const gate = blocks.find((block) => block.type === 'unlock-gate')
    assert(Array.isArray(gate?.criteria) && gate.criteria.length >= 5, `${key}: weak unlock gate`)
    assert.match(String(gate?.practiceOnlyNotice ?? ''), /practice/i, `${key}: trust boundary missing`)
  }
})

test('every System Design reference satisfies its exact observable contract', () => {
  const runtimeDir = mkdtempSync(join(tmpdir(), 'academy-system-design-labs-'))
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()
  let executed = 0
  try {
    for (const [lessonSlug, blocks] of Object.entries(lessons)) {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[lessonSlug]
      assert(solution, `${lessonSlug}: missing reference solution`)
      const result = spawnSync(process.execPath, ['-e', solution.code], { cwd: runtimeDir, input: solution.stdin ?? '', encoding: 'utf8', timeout: 10_000 })
      assert.equal(result.status, 0, `${lessonSlug}: reference failed: ${result.stderr}`)
      assert.equal(result.stderr, '', `${lessonSlug}: unexpected stderr`)
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${lessonSlug}: exact output drift`)
      executed += 1
    }
  } finally { rmSync(runtimeDir, { recursive: true, force: true }) }
  assert.equal(executed, 24)
})

test('System Design culminates in a deep integration and multi-day defense', () => {
  assert.equal(lessons['designing-a-real-system'].find((block) => block.type === 'sprint-contract')?.intensity, 'deep')
  const capstone = lessons['capstone-design-and-defend']
  const contract = capstone.find((block) => block.type === 'sprint-contract')
  assert.equal(contract?.intensity, 'capstone')
  assert.match(String(contract?.time ?? ''), /multi-day/i)
  assert(capstone.findIndex((block) => block.type === 'lab') < capstone.findIndex((block) => block.type === 'debug'))
  assert(capstone.findIndex((block) => block.type === 'calibration') < capstone.findIndex((block) => block.type === 'transfer'))
})

test('System Design retains a unique authoritative source ledger', () => {
  assert(existsSync(sourcePath), 'missing System Design source ledger')
  const sources = JSON.parse(readFileSync(sourcePath, 'utf8')) as Array<Record<string, unknown>>
  assert(sources.length >= 14)
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length)
  for (const source of sources) {
    assert.equal(source.source_tier, 1)
    assert.match(String(source.url), /^https:\/\//)
    assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('every narrated diagram has transcript-bearing media evidence without false pass claims', () => {
  const promised: Array<Pick<MediaAsset, 'lessonSlug' | 'url' | 'transcript'>> = []
  for (const [lessonSlug, blocks] of Object.entries(lessons)) visit(blocks, lessonSlug, promised)
  assert.equal(promised.length, 159)
  assert.equal(new Set(promised.map((asset) => asset.url)).size, promised.length)
  assert(promised.every((asset) => asset.transcript.length >= 20), 'every audio cue needs an adjacent transcript')
  assert(existsSync(mediaPath), 'missing media integrity evidence')
  const evidence = JSON.parse(readFileSync(mediaPath, 'utf8')) as MediaEvidence
  assert.match(evidence.status, /^(pass|fail)$/)
  assert.deepEqual(evidence.assets.map(({ lessonSlug, url, transcript }) => ({ lessonSlug, url, transcript })), promised)
  if (evidence.status === 'pass') {
    for (const asset of evidence.assets) {
      assert.equal(asset.httpStatus, 200, `${asset.url}: not reachable`)
      assert.match(asset.contentType, /^audio\//, `${asset.url}: invalid content type`)
      assert.equal(asset.error, null)
    }
  } else {
    assert(evidence.assets.some((asset) => asset.httpStatus !== 200 || !asset.contentType.startsWith('audio/')))
    assert(evidence.assets.filter((asset) => asset.httpStatus !== 200).every((asset) => String(asset.error ?? '').length > 0))
  }
})

test('both System Design competency mappings enumerate every lesson', () => {
  const graph = loadFlagshipCompetencyGraph(process.cwd())
  for (const competencyId of ['backend-distributed-systems', 'production-integration']) {
    const competency = graph.competencies.find((candidate) => candidate.id === competencyId)
    const mapping = competency?.courseMappings.find((candidate) => candidate.courseSlug === courseSlug)
    assert(mapping, `${competencyId}: missing System Design mapping`)
    assert.deepEqual(mapping.lessonSlugs, Object.keys(lessons), `${competencyId}: incomplete System Design mapping`)
  }
})

test('the Academy audit gate includes the System Design mastery contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:test'], /system-design-mastery\.test\.ts/)
})
