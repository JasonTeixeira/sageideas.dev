import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { auditAcademy } from './core'

type AcademyAudit = ReturnType<typeof auditAcademy>

const writeJson = (path: string, value: unknown): void =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const safeSlug = (slug: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) throw new Error(`Unsafe scorecard slug: ${slug}`)
  return slug
}

function markdown(report: AcademyAudit): string {
  const rows = report.courseScorecards
    .map((course) => {
      const pending = course.requiredPending.length ? course.requiredPending.join(', ') : 'none'
      const deterministic = course.deterministicScore === null ? 'n/a' : course.deterministicScore.toFixed(1)
      return `| ${course.title} | \`${course.courseSlug}\` | ${course.lessonCount} | ${course.decision} | ${course.hardFails.length} | ${pending} | ${deterministic} |`
    })
    .join('\n')
  const backlog = report.remediationBacklog
    .slice(0, 20)
    .map((item) => `${item.rank}. ${item.code ? `**${item.code}** · ` : ''}${item.category} — ${item.remediation} (${item.courseSlugs.length} courses; ${item.findingCount} findings)`)
    .join('\n')
  const phases = report.flagshipReadiness.phases
    .map((phase) => `| ${phase.label} | ${phase.courseSlugs.length ? phase.courseSlugs.map((slug) => `\`${slug}\``).join(', ') : 'unmapped'} | ${phase.ready ? 'ready' : 'not ready'} | ${phase.releaseGap ?? (phase.blockedCourses.length ? `${phase.blockedCourses.length} blocked course(s)` : 'none')} |`)
    .join('\n')
  return `# Academy Certification Harness V2 — Quality Board

Generated: ${report.generatedAt}
Registry: \`${report.registryVersion}\`
Harness: \`${report.harnessVersion}\`
Authority: \`${report.authority}\`

This is an honest readiness audit, not a certification award. Current lab evidence is \`${report.labTrust}\`; no course is certified.

## Academy summary

- Courses audited: ${report.summary.coursesAudited}
- Lessons audited: ${report.summary.lessonsAudited}
- Eligible for certification: ${report.summary.coursesEligible}
- Blocked by hard fails: ${report.summary.coursesBlocked}
- Needs deterministic remediation: ${report.summary.coursesNeedsRemediation}
- Pending required review/evidence: ${report.summary.coursesPendingReview}
- Certified courses: ${report.summary.coursesCertified}
- Hard fails: H1=${report.summary.hardFailCounts.H1}, H2=${report.summary.hardFailCounts.H2}, H3=${report.summary.hardFailCounts.H3}, H4=${report.summary.hardFailCounts.H4}, H5=${report.summary.hardFailCounts.H5}

## Coverage boundary

- Static authoring: ${report.executionCoverage.staticAuthoring.scope} (${report.executionCoverage.staticAuthoring.courses} courses / ${report.executionCoverage.staticAuthoring.lessons} lessons)
- Current lab execution: ${report.executionCoverage.currentLabExecution.scope}
- External-link reachability: ${report.executionCoverage.externalLinkReachability.scope}
- Rendered accessibility: ${report.executionCoverage.renderedAccessibility.scope}
- Rendered performance: ${report.executionCoverage.renderedPerformance.scope}
- Expert/human review: ${report.executionCoverage.expertAndHumanReview.scope}

The deterministic score reports only checks the harness can prove locally. It is not a composite quality or certification score.

## Course board

| Course | Slug | Lessons | Decision | Hard fails | Required pending | Deterministic only |
|---|---|---:|---|---:|---|---:|
${rows}

## Ranked remediation backlog

${backlog || 'No remediation items.'}

## Flagship competency-path readiness

The mapping below is generated from the canonical competency graph. It remains a draft until every required course and capstone release earns certification evidence.

| Phase | Current course mapping | Readiness | Blocking note |
|---|---|---|---|
${phases}
`
}

export function writeAuditArtifacts(report: AcademyAudit, outputDir: string) {
  const courseDir = join(outputDir, 'course-scorecards')
  const lessonDir = join(outputDir, 'lesson-scorecards')
  mkdirSync(courseDir, { recursive: true })
  mkdirSync(lessonDir, { recursive: true })

  const expectedScorecardFiles = new Set(
    report.courseScorecards.map((course) => `${safeSlug(course.courseSlug)}.json`),
  )
  for (const directory of [courseDir, lessonDir]) {
    for (const filename of readdirSync(directory)) {
      if (
        /^[a-z0-9][a-z0-9_-]*\.json$/.test(filename) &&
        !expectedScorecardFiles.has(filename)
      ) {
        unlinkSync(join(directory, filename))
      }
    }
  }

  const academyBoard = {
    schemaVersion: report.schemaVersion,
    harnessVersion: report.harnessVersion,
    registryVersion: report.registryVersion,
    generatedAt: report.generatedAt,
    authority: report.authority,
    labTrust: report.labTrust,
    certificationPolicy: report.certificationPolicy,
    summary: report.summary,
    executionCoverage: report.executionCoverage,
    courses: report.courseScorecards.map((course) => ({
      courseSlug: course.courseSlug,
      title: course.title,
      lessonCount: course.lessonCount,
      contentHash: course.contentHash,
      labTrust: course.labTrust,
      decision: course.decision,
      certificationStatus: course.certificationStatus,
      deterministicScore: course.deterministicScore,
      compositeScore: course.compositeScore,
      hardFailCount: course.hardFails.length,
      hardFailCounts: Object.fromEntries(['H1', 'H2', 'H3', 'H4', 'H5'].map((code) => [code, course.hardFails.filter((finding) => finding.code === code).length])),
      requiredPending: course.requiredPending,
      dimensions: Object.fromEntries(Object.entries(course.dimensions).map(([id, result]) => [id, { status: result.status, score: result.score }])),
      scorecards: {
        course: `course-scorecards/${course.courseSlug}.json`,
        lessons: `lesson-scorecards/${course.courseSlug}.json`,
      },
    })),
  }

  for (const course of report.courseScorecards) {
    const slug = safeSlug(course.courseSlug)
    const { lessonScorecards, ...courseOnly } = course
    writeJson(join(courseDir, `${slug}.json`), courseOnly)
    writeJson(join(lessonDir, `${slug}.json`), lessonScorecards)
  }

  const latest = {
    ...academyBoard,
    artifacts: {
      academyQualityBoard: 'academy-quality-board.json',
      remediationBacklog: 'remediation-backlog.json',
      flagshipReadiness: 'flagship-readiness.json',
      courseScorecards: 'course-scorecards/',
      lessonScorecards: 'lesson-scorecards/',
    },
  }
  writeJson(join(outputDir, 'academy-quality-board.json'), academyBoard)
  writeJson(join(outputDir, 'remediation-backlog.json'), {
    schemaVersion: report.schemaVersion,
    harnessVersion: report.harnessVersion,
    registryVersion: report.registryVersion,
    generatedAt: report.generatedAt,
    items: report.remediationBacklog,
  })
  writeJson(join(outputDir, 'flagship-readiness.json'), {
    schemaVersion: report.schemaVersion,
    harnessVersion: report.harnessVersion,
    registryVersion: report.registryVersion,
    generatedAt: report.generatedAt,
    ...report.flagshipReadiness,
  })
  writeJson(join(outputDir, 'latest.json'), latest)
  writeFileSync(join(outputDir, 'latest.md'), markdown(report))

  const date = report.generatedAt.slice(0, 10)
  writeJson(join(outputDir, `${date}.json`), latest)
  writeFileSync(join(outputDir, `${date}.md`), markdown(report))

  return {
    outputDir,
    courseScorecards: report.courseScorecards.length,
    lessonScorecards: report.summary.lessonsAudited,
    files: 7 + report.courseScorecards.length * 2,
  }
}
