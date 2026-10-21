import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const sourceCourses = [
  'career-engineering_judgment_foundation',
  'programming-fundamentals',
  'career-programming_cs_foundations',
  'python-basics',
  'git-the-terminal',
  'data-structures',
  'career-networking_fundamentals_advanced_networking',
]

const normalize = (value: string) => value.replace(/\r\n/g, '\n').trimEnd()

test('all seven flagship foundations have authoritative source ledgers', () => {
  for (const slug of sourceCourses) {
    const sources = JSON.parse(readFileSync(`docs/academy/evidence/${slug}/sources.json`, 'utf8')) as Array<Record<string, unknown>>
    assert(sources.length >= 13, `${slug}: expected at least 13 sources`)
    assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length, `${slug}: duplicate source IDs`)
    for (const source of sources) {
      assert.equal(source.source_tier, 1, `${slug}/${source.source_id}: source tier`)
      assert.match(String(source.url), /^https:\/\//)
      assert.match(String(source.retrieved_at), /^\d{4}-\d{2}-\d{2}$/)
    }
  }
})

test('Programming Fundamentals has exact Python references for all 18 labs', () => {
  const slug = 'programming-fundamentals'
  const lessons = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
  const solutions = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  const root = mkdtempSync(join(tmpdir(), 'academy-programming-'))
  try {
    for (const [key, blocks] of Object.entries(lessons)) {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[key]
      assert.equal(solution.language, 'python')
      const result = spawnSync('python3', ['-I', '-c', solution.code], {
        cwd: root,
        encoding: 'utf8',
        input: lab?.stdin as string ?? '',
        timeout: 10_000,
      })
      assert.equal(result.status, 0, `${key}: ${result.stderr}`)
      assert.equal(result.stderr, '')
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${key}: output drift`)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Programming Fundamentals reference execution leaves no files in the repository root', () => {
  assert.equal(existsSync('app.conf'), false)
  assert.equal(existsSync('settings.conf'), false)
})

test('Git & Terminal has exact shell references for all 20 labs', () => {
  const slug = 'git-the-terminal'
  const lessons = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lessons.json`, 'utf8')) as Record<string, Array<Record<string, unknown>>>
  const solutions = JSON.parse(readFileSync(`data/academy/authoring/${slug}.lab_solutions.json`, 'utf8')) as Record<string, { language: string; code: string; stdin?: string }>
  assert.deepEqual(Object.keys(solutions), Object.keys(lessons))
  for (const [key, blocks] of Object.entries(lessons)) {
    const root = mkdtempSync(join(tmpdir(), `academy-git-${key}-`))
    try {
      const lab = blocks.find((block) => block.type === 'lab')
      const solution = solutions[key]
      assert.equal(solution.language, 'shell')
      const result = spawnSync('/bin/bash', ['-c', solution.code], {
        cwd: root,
        encoding: 'utf8',
        input: solution.stdin ?? '',
        timeout: 20_000,
        env: { ...process.env, LC_ALL: 'C', LANG: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      })
      assert.equal(result.status, 0, `${key}: ${result.stderr}`)
      assert.equal(normalize(result.stdout), normalize(String(lab?.check)), `${key}: output drift`)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }
})

test('canonical registry has no lab reference gaps', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
  assert.equal(registry.totals.labLessonsWithoutSolutions, 0)
  assert.equal(registry.totals.labLessonsWithSolutions, registry.totals.labBlocks)
  assert.equal(registry.totals.sourceLedgers, registry.totals.courses)
})

test('Academy audit includes foundation closure contract', () => {
  assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts['academy:audit:test'], /foundation-closure\.test\.ts/)
})
