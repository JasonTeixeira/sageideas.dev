import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  auditAcademy,
  auditCourseBundle,
  normalizeVolatileFields,
  type AuditBundle,
} from '../../scripts/academy/quality/v2/core'
import { writeAuditArtifacts } from '../../scripts/academy/quality/v2/artifacts'

const fixture = (name: string): AuditBundle =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/academy-certification-v2/${name}.json`, import.meta.url),
      'utf8',
    ),
  )

test('known-good controlled fixture becomes eligible without being labeled certified', () => {
  const report = auditCourseBundle(fixture('known-good'), {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
    repoRoot: process.cwd(),
  })

  assert.equal(report.decision, 'eligible_for_certification')
  assert.equal(report.certificationStatus, 'uncertified')
  assert.deepEqual(report.hardFails, [])
  assert.deepEqual(report.requiredPending, [])
  assert.equal(report.lessonScorecards.length, 1)
})

test('known-bad fixture catches every non-buy-downable H1-H5 class', () => {
  const report = auditCourseBundle(fixture('known-bad'), {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
    repoRoot: process.cwd(),
  })

  assert.equal(report.decision, 'blocked')
  assert.equal(report.certificationStatus, 'uncertified')
  assert.deepEqual(
    [...new Set(report.hardFails.map((finding) => finding.code))].sort(),
    ['H1', 'H2', 'H3', 'H4', 'H5'],
  )
  assert(report.hardFails.some((finding) => finding.code === 'H5' && finding.message.includes('missing-video.mp4')))
})

test('untrusted current runtime blocks every real lab from certification evidence', () => {
  const report = auditCourseBundle(fixture('known-good'), {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'untrusted_current_runtime',
  })

  assert.equal(report.decision, 'blocked')
  assert.equal(report.labTrust, 'untrusted_current_runtime')
  assert(report.hardFails.some((finding) => finding.code === 'H2'))
  assert.equal(report.dimensions.labs.score, null)
})

test('a verified activation promotes only the explicitly attested lesson lab', () => {
  const report = auditCourseBundle(fixture('known-good'), ({
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'untrusted_current_runtime',
    trustedLabKeys: new Set(['fixture-good/complete-loop']),
  } as unknown) as Parameters<typeof auditCourseBundle>[1])

  assert.equal(report.decision, 'eligible_for_certification')
  assert.equal(report.labTrust, 'trusted_controlled_runtime')
  assert.equal(report.lessonScorecards[0].labTrust, 'trusted_controlled_runtime')
})

test('a declared complete claim map with an uncited claim hard-fails H1', () => {
  const bundle = fixture('known-good')
  bundle.evidence!['complete-loop'].claimRefs = [
    { claim: 'This claim has no supporting source IDs.', sourceIds: [] },
  ]

  const report = auditCourseBundle(bundle, {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
  })

  assert.equal(report.decision, 'blocked')
  assert(report.hardFails.some((finding) => finding.code === 'H1' && finding.message.includes('no source IDs')))
})

test('duplicate controlled results cannot stand in for unique per-lab coverage', () => {
  const bundle = fixture('known-good')
  const blocks = bundle.lessons['complete-loop'] as unknown[]
  blocks.splice(8, 0, {
    type: 'lab',
    title: 'Second lab',
    summary: 'A second lab requires its own evaluator result.',
    language: 'js',
    starter: 'console.log(10)',
    check: '10',
  })
  bundle.evidence!['complete-loop'].lab = {
    trust: 'controlled_evaluator',
    results: [
      { blockIndex: 7, status: 'pass' },
      { blockIndex: 7, status: 'pass' },
    ],
  }

  const report = auditCourseBundle(bundle, {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
  })

  assert.equal(report.decision, 'blocked')
  assert(report.hardFails.some((finding) => finding.code === 'H2' && finding.message.includes('unique per-lab coverage')))
})

test('a registry lesson missing from its authoring bundle fails with an explicit invariant', () => {
  const bundle = fixture('known-good')
  delete bundle.lessons['complete-loop']

  assert.throws(
    () => auditCourseBundle(bundle, {
      registryVersion: 'fixture-registry-v1',
      generatedAt: '2026-08-27T12:00:00.000Z',
      labTrust: 'controlled_evaluator',
    }),
    /Course 'fixture-good' is missing registered lesson payloads: complete-loop/,
  )
})

test('all canonical courses are audited independently and every lesson is represented', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
  const report = auditAcademy({
    registry,
    repoRoot: process.cwd(),
    generatedAt: '2026-08-27T12:00:00.000Z',
  })

  assert.equal(report.registryVersion, registry.registryVersion)
  assert.equal(report.courseScorecards.length, 32)
  assert.equal(report.summary.coursesAudited, 32)
  assert.equal(report.summary.lessonsAudited, registry.totals.lessons)
  assert.equal(
    report.summary.coursesBlocked +
      report.summary.coursesNeedsRemediation +
      report.summary.coursesPendingReview +
      report.summary.coursesEligible,
    32,
  )
  assert.equal(report.executionCoverage.staticAuthoring.lessons, registry.totals.lessons)
  assert.equal(report.executionCoverage.staticAuthoring.scope, 'full')
  assert.equal(report.executionCoverage.currentLabExecution.scope, 'none_by_policy')
  assert.equal(report.executionCoverage.renderedAccessibility.scope, 'no_evidence_supplied')
  assert.equal(new Set(report.courseScorecards.map((course) => course.courseSlug)).size, 32)
  assert(report.courseScorecards.every((course) => course.certificationStatus === 'uncertified'))
  assert(report.courseScorecards.every((course) => course.registryVersion === registry.registryVersion))
  assert(report.courseScorecards.flatMap((course) => course.lessonScorecards).every((lesson) => lesson.registryVersion === registry.registryVersion))
})

test('the academy audit consumes only explicitly supplied activation evidence', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
  const labKey = 'programming-fundamentals/input-validation'
  const report = auditAcademy({
    registry,
    repoRoot: process.cwd(),
    generatedAt: '2026-08-27T12:00:00.000Z',
    activation: {
      trustedLabKeys: new Set([labKey]),
      evidenceByLesson: new Map([[labKey, {
        lab: { trust: 'controlled_evaluator', results: [{ blockIndex: 7, status: 'pass' }] },
      }]]),
    },
  })

  const lessons = report.courseScorecards.flatMap((course) => course.lessonScorecards)
  const activated = lessons.find((lesson) => `${lesson.courseSlug}/${lesson.lessonSlug}` === labKey)
  const adjacent = lessons.find((lesson) => `${lesson.courseSlug}/${lesson.lessonSlug}` === 'programming-fundamentals/functions-basics')
  assert.equal(activated?.labTrust, 'trusted_controlled_runtime')
  assert.equal(activated?.dimensions.labs.checks[0].status, 'pass')
  assert.equal(adjacent?.labTrust, 'untrusted_current_runtime')
})

test('semantic results are deterministic apart from declared volatile fields', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
  const first = auditAcademy({
    registry,
    repoRoot: process.cwd(),
    generatedAt: '2026-08-27T12:00:00.000Z',
  })
  const second = auditAcademy({
    registry,
    repoRoot: process.cwd(),
    generatedAt: '2026-08-27T12:01:00.000Z',
  })

  assert.deepEqual(normalizeVolatileFields(first), normalizeVolatileFields(second))
})

test('cross-lesson teaching duplication is a deterministic failing dimension', () => {
  const bundle = fixture('known-good')
  bundle.course.lessons.push({
    ...bundle.course.lessons[0],
    slug: 'duplicated-loop',
    title: 'Duplicated Loop',
    sort: 2,
  })
  bundle.lessons['duplicated-loop'] = JSON.parse(JSON.stringify(bundle.lessons['complete-loop']))
  bundle.solutions = {
    ...bundle.solutions,
    'duplicated-loop': bundle.solutions?.['complete-loop'] ?? {},
  }
  bundle.evidence = {
    ...bundle.evidence,
    'duplicated-loop': JSON.parse(JSON.stringify(bundle.evidence?.['complete-loop'] ?? {})),
  }

  const report = auditCourseBundle(bundle, {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
  })

  assert.equal(report.dimensions.duplication.status, 'fail')
  assert(report.lessonScorecards.every((lesson) => lesson.dimensions.duplication.findings.length > 0))
})

test('a deterministic failure without a hard-fail code is needs_remediation, not pending review', () => {
  const bundle = fixture('known-good')
  bundle.lessons['complete-loop'] = (bundle.lessons['complete-loop'] as unknown[]).filter(
    (block) => !(typeof block === 'object' && block !== null && 'type' in block && block.type === 'quiz'),
  )

  const report = auditCourseBundle(bundle, {
    registryVersion: 'fixture-registry-v1',
    generatedAt: '2026-08-27T12:00:00.000Z',
    labTrust: 'controlled_evaluator',
  })

  assert.equal(report.hardFails.length, 0)
  assert.equal(report.decision, 'needs_remediation')
  assert.equal(report.dimensions.assessments.status, 'fail')
})

test('artifact writer emits every required board and scorecard family', () => {
  const registry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
  const report = auditAcademy({
    registry,
    repoRoot: process.cwd(),
    generatedAt: '2026-08-27T12:00:00.000Z',
  })
  const outputDir = mkdtempSync(join(tmpdir(), 'academy-cert-v2-'))
  try {
    mkdirSync(join(outputDir, 'course-scorecards'), { recursive: true })
    mkdirSync(join(outputDir, 'lesson-scorecards'), { recursive: true })
    writeFileSync(join(outputDir, 'course-scorecards', 'stale-course.json'), '{}')
    writeFileSync(join(outputDir, 'lesson-scorecards', 'stale-course.json'), '{}')
    const manifest = writeAuditArtifacts(report, outputDir)
    assert.equal(manifest.courseScorecards, 32)
    assert.equal(manifest.lessonScorecards, registry.totals.lessons)
    for (const relativePath of [
      'latest.json',
      'latest.md',
      'academy-quality-board.json',
      'remediation-backlog.json',
      'flagship-readiness.json',
      'course-scorecards/programming-fundamentals.json',
      'lesson-scorecards/programming-fundamentals.json',
    ]) {
      assert(existsSync(join(outputDir, relativePath)), `missing ${relativePath}`)
    }
    assert.equal(existsSync(join(outputDir, 'course-scorecards', 'stale-course.json')), false)
    assert.equal(existsSync(join(outputDir, 'lesson-scorecards', 'stale-course.json')), false)
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }
})

test('the public audit verification command includes typecheck', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.match(packageJson.scripts['academy:audit:verify'], /npm run typecheck/)
})
