import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assertRegistryCurrent, buildAcademyRegistry } from './core.mjs'

const root = process.cwd()
const registryPath = path.join(root, 'data/academy/registry.json')
const evidenceDir = path.join(root, 'docs/evidence/academy/canonical-truth')

function countCapabilities(capabilities) {
  return capabilities.reduce((counts, capability) => {
    counts[capability.status] = (counts[capability.status] ?? 0) + 1
    return counts
  }, {})
}

function createBaseline(registry) {
  const coursesWithLegacyCoverage = registry.courses.filter(
    (course) => course.authoring.legacyManifestLessons > 0,
  )
  const legacyLessons = registry.courses.reduce(
    (sum, course) => sum + course.authoring.legacyManifestLessons,
    0,
  )
  return {
    schemaVersion: 1,
    observedOn: new Date().toISOString().slice(0, 10),
    registryVersion: registry.registryVersion,
    totals: registry.totals,
    legacyManifest: {
      coursesCovered: coursesWithLegacyCoverage.length,
      coursesMissing:
        registry.totals.courses - coursesWithLegacyCoverage.length,
      lessonsCovered: legacyLessons,
      lessonsMissing: registry.totals.lessons - legacyLessons,
      status: 'compatibility_only',
    },
    certification: {
      certifiedCourses: registry.courses.filter(
        (course) => course.certification.status !== 'uncertified',
      ).length,
      uncertifiedCourses: registry.courses.filter(
        (course) => course.certification.status === 'uncertified',
      ).length,
      labTrust: 'untrusted_current_runtime',
    },
    capabilities: countCapabilities(registry.capabilities),
    externalReconciliation: {
      database: 'not_verified_in_this_snapshot',
      pricingPackaging: 'blocked_external_decision',
      liveStripe: 'approval_required',
    },
    contradictions: [
      `${registry.totals.courses} authored course bundles versus ${coursesWithLegacyCoverage.length} courses represented in the legacy manifest`,
      `${registry.totals.lessons} authored lessons versus ${legacyLessons} lessons represented in the legacy manifest`,
      `${registry.totals.labLessonsWithoutSolutions} lab lessons lack same-slug solution entries`,
      `${registry.totals.courses - registry.totals.sourceLedgers} courses lack course-level source ledgers`,
      'Current lab output-substring evidence is not eligible for mastery or certification',
      'No course is certified by Academy Certification Harness V2',
    ],
    courses: registry.courses.map((course) => ({
      slug: course.slug,
      title: course.title,
      topic: course.topic,
      level: course.level,
      lessons: course.lessons.length,
      legacyManifestLessons: course.authoring.legacyManifestLessons,
      labBlocks: course.lessons.reduce(
        (sum, lesson) => sum + lesson.labBlocks,
        0,
      ),
      labLessonsWithoutSolutions: course.lessons.filter(
        (lesson) => lesson.labBlocks > 0 && !lesson.hasLabSolution,
      ).length,
      sourceLedger: course.sources.ledger,
      lifecycleStatus: course.lifecycleStatus,
      certificationStatus: course.certification.status,
      blockers: course.certification.blockers,
      route: course.routes.course,
    })),
  }
}

function markdownReport(baseline) {
  const lines = [
    '# Sage Academy Canonical Truth Baseline',
    '',
    `**Observed:** ${baseline.observedOn}`,
    `**Registry:** \`${baseline.registryVersion}\``,
    '**Scope:** repository authoring corpus and checked-in evidence only; live database state was not mutated or asserted.',
    '',
    '## Defensible inventory',
    '',
    `- ${baseline.totals.courses} registered course bundles`,
    `- ${baseline.totals.lessons} authored lessons`,
    `- ${baseline.totals.labBlocks} lab blocks`,
    `- ${baseline.totals.solutionEntries} solution entries`,
    `- ${baseline.totals.labLessonsWithSolutions} lab lessons with same-slug solutions`,
    `- ${baseline.totals.labLessonsWithoutSolutions} lab lessons without same-slug solutions`,
    `- ${baseline.totals.sourceLedgers} course-level source ledgers`,
    `- ${baseline.certification.certifiedCourses} certified courses`,
    '',
    '## Known contradictions and launch blockers',
    '',
    ...baseline.contradictions.map((item) => `- ${item}`),
    '',
    '## Course inventory',
    '',
    '| Course | Lessons | Legacy manifest | Labs | Labs missing solutions | Source ledger | Certification |',
    '|---|---:|---:|---:|---:|---|---|',
    ...baseline.courses.map(
      (course) =>
        `| \`${course.slug}\` | ${course.lessons} | ${course.legacyManifestLessons} | ${course.labBlocks} | ${course.labLessonsWithoutSolutions} | ${course.sourceLedger ? 'yes' : 'no'} | ${course.certificationStatus} |`,
    ),
    '',
    '## Authority boundary',
    '',
    '- `data/academy/registry.config.json` owns canonical course identity, title, topic, level, lifecycle state, and aliases.',
    '- `data/academy/authoring/*.lessons.json` owns authored lesson content.',
    '- `data/academy/registry.json` is the deterministic generated snapshot consumed by application and audit adapters.',
    '- `data/academy/authoring/manifest.json` is compatibility-only during migration and cannot define a course by itself.',
    '- Supabase is a runtime projection. Publication state must be reconciled read-only before cutover and is not inferred here.',
  ]
  return `${lines.join('\n')}\n`
}

async function main() {
  if (process.argv.includes('--check')) {
    await assertRegistryCurrent({ root, outputPath: registryPath })
    console.log('Academy registry is current.')
    return
  }

  if (!process.argv.includes('--write')) {
    console.error(
      'Usage: node scripts/academy/registry/generate.mjs --write|--check',
    )
    process.exit(1)
  }

  const registry = await buildAcademyRegistry({ root })
  const baseline = createBaseline(registry)
  const datedJson = path.join(evidenceDir, `${baseline.observedOn}.json`)
  const datedMarkdown = path.join(evidenceDir, `${baseline.observedOn}.md`)
  await mkdir(evidenceDir, { recursive: true })
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`)
  await writeFile(datedJson, `${JSON.stringify(baseline, null, 2)}\n`)
  await writeFile(datedMarkdown, markdownReport(baseline))
  await writeFile(
    path.join(evidenceDir, 'latest.json'),
    `${JSON.stringify(baseline, null, 2)}\n`,
  )
  await writeFile(path.join(evidenceDir, 'latest.md'), markdownReport(baseline))
  console.log(
    `Wrote Academy registry ${registry.registryVersion}: ${registry.totals.courses} courses, ${registry.totals.lessons} lessons, ${registry.totals.labBlocks} labs.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
